import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Coins,
  Edit3,
  History as HistoryIcon,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { dateToday, formatMonthYear, inr } from '../lib/format';
import { useAppData } from '../components/layout/AppLayout';
import { useOnlineStatus } from '../components/pwa/PWAProvider';
import Overlay from '../components/ui/Overlay';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

const money = minor => inr((minor || 0) / 100);
const monthTitle = key => formatMonthYear(key);
const parseMoney = value =>
  /^\d+(?:\.\d{1,2})?$/.test(value.trim())
    ? Number(value.trim().split('.')[0]) * 100 +
      Number((value.trim().split('.')[1] || '').padEnd(2, '0'))
    : NaN;

const clean = {
  summary: { balanceMinor: 0, allocatedMinor: 0 },
  entries: [],
  goals: [],
  months: [],
};

function Button({ children, secondary = false, ...props }) {
  return (
    <button type="button" className={secondary ? 'btn-outline' : 'btn-primary'} {...props}>
      {children}
    </button>
  );
}

function GoalCard({ goal, free, online, onAllocate, onRelease, onEdit, onArchive }) {
  const progress = Math.min(100, Math.round(((goal.allocatedMinor || 0) / (goal.targetMinor || 1)) * 100));
  const remainingMinor = Math.max(0, (goal.targetMinor || 0) - (goal.allocatedMinor || 0));

  return (
    <article className="v31-goal-card" key={goal.id}>
      <div className="v31-goal-head">
        <span className="v31-goal-symbol">
          <Target size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h3>{goal.name}</h3>
          <p>
            {money(goal.allocatedMinor)} of {money(goal.targetMinor)}
          </p>
        </div>
        <span className="v31-goal-percent">{progress}%</span>
      </div>
      <div className="v31-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="v31-goal-meta-row">
        <span className="v31-goal-remaining">
          Remaining: <strong>{money(remainingMinor)}</strong>
        </span>
        {goal.targetDate && (
          <span className="v31-goal-date">
            <CalendarDays size={13} /> Target:{' '}
            {new Date(`${goal.targetDate}T12:00:00Z`).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </span>
        )}
      </div>
      <div className="v31-goal-actions">
        <button
          type="button"
          onClick={() => onAllocate(goal)}
          disabled={!online || !free}
        >
          <Plus size={15} /> Allocate
        </button>
        <button
          type="button"
          onClick={() => onRelease(goal)}
          disabled={!online || !goal.allocatedMinor}
        >
          <Minus size={15} /> Release
        </button>
        <button
          type="button"
          onClick={() => onEdit(goal)}
          aria-label={`Edit ${goal.name}`}
          title="Edit goal"
        >
          <Edit3 size={15} />
        </button>
        <button
          type="button"
          onClick={() => onArchive(goal)}
          aria-label={`Archive ${goal.name}`}
          title="Archive goal"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}

export default function Savings({ isDedicatedHistoryView = false }) {
  const { notify } = useAppData();
  const online = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState(clean);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Local view states
  const [viewAllGoals, setViewAllGoals] = useState(false);
  const viewAllHistory =
    isDedicatedHistoryView ||
    searchParams.get('view') === 'history' ||
    searchParams.get('view') === 'all';

  // Filters for Dedicated Savings History View
  const [historySearch, setHistorySearch] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyType, setHistoryType] = useState('all'); // 'all' | 'deposit' | 'withdrawal'
  const [historyFiltersOpen, setHistoryFiltersOpen] = useState(false);

  // Form states for modals
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dateToday());
  const [note, setNote] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const opRef = useRef(null);

  const load = useCallback(async () => {
    const result = await api('/api/savings');
    setData(result);
    setFetchError('');
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/api/savings')
      .then(r => {
        if (active) {
          setData(r);
          setFetchError('');
        }
      })
      .catch(e => {
        if (active) setFetchError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const free = Math.max(0, data.summary.balanceMinor - data.summary.allocatedMinor);

  // All distinct recorded months in savings entries
  const distinctSavingsMonths = useMemo(() => {
    const set = new Set();
    for (const e of data.entries) {
      if (e.effectiveDate && e.effectiveDate.length >= 7) {
        set.add(e.effectiveDate.slice(0, 7));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data.entries]);

  // Filtered savings entries for dedicated view
  const filteredHistoryEntries = useMemo(() => {
    return data.entries.filter(e => {
      if (historyType !== 'all' && e.type !== historyType) return false;
      if (historyMonth && !e.effectiveDate?.startsWith(historyMonth)) return false;
      if (historySearch.trim()) {
        const q = historySearch.trim().toLowerCase();
        const noteText = (e.note || '').toLowerCase();
        const amountText = (e.amountMinor / 100).toFixed(2);
        if (!noteText.includes(q) && !amountText.includes(q)) return false;
      }
      return true;
    });
  }, [data.entries, historyType, historyMonth, historySearch]);

  // Group savings history entries by effectiveDate month (YYYY-MM), newest month first
  const groupEntriesByMonth = useCallback(entries => {
    const map = new Map();
    for (const entry of entries) {
      const dateStr = entry.effectiveDate || '';
      const key = dateStr.length >= 7 ? dateStr.slice(0, 7) : 'other';
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: key !== 'other' ? monthTitle(key) : 'Other dates',
          entries: [],
          depositedMinor: 0,
          withdrawnMinor: 0,
          activitiesCount: 0,
        });
      }
      const g = map.get(key);
      g.entries.push(entry);
      g.activitiesCount += 1;
      if (entry.type === 'deposit') {
        g.depositedMinor += (entry.amountMinor || 0);
      } else if (entry.type === 'withdrawal') {
        g.withdrawnMinor += (entry.amountMinor || 0);
      }
    }

    // Sort months newest first
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.key === 'other') return 1;
      if (b.key === 'other') return -1;
      return b.key.localeCompare(a.key);
    });

    // Sort entries within each month newest first
    for (const g of sorted) {
      g.entries.sort(
        (a, b) =>
          (b.effectiveDate || '').localeCompare(a.effectiveDate || '') ||
          (b.createdAt || '').localeCompare(a.createdAt || '')
      );
    }

    return sorted;
  }, []);

  const allGroupedSavingsMonths = useMemo(
    () => groupEntriesByMonth(data.entries),
    [data.entries, groupEntriesByMonth]
  );

  const filteredGroupedSavingsMonths = useMemo(
    () => groupEntriesByMonth(filteredHistoryEntries),
    [filteredHistoryEntries, groupEntriesByMonth]
  );

  // Overall totals for history
  const historySummary = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    for (const e of filteredHistoryEntries) {
      if (e.type === 'deposit') deposits += e.amountMinor || 0;
      else if (e.type === 'withdrawal') withdrawals += e.amountMinor || 0;
    }
    return {
      deposits,
      withdrawals,
      net: deposits - withdrawals,
      count: filteredHistoryEntries.length,
    };
  }, [filteredHistoryEntries]);

  const openHistoryView = () => {
    setSearchParams({ view: 'history' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeHistoryView = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetHistoryFilters = () => {
    setHistorySearch('');
    setHistoryMonth('');
    setHistoryType('all');
  };

  const hasActiveHistoryFilters = Boolean(
    historySearch || historyMonth || historyType !== 'all'
  );

  function show(type, goal = null) {
    setDialog({ type, goal });
    setAmount('');
    setDate(dateToday());
    setNote('');
    setGoalAmount('');
    setGoalName(goal?.name || '');
    setGoalTarget(goal ? String(goal.targetMinor / 100) : '');
    setTargetDate(goal?.targetDate || '');
    setError('');
    opRef.current = crypto.randomUUID();
  }

  function close() {
    if (busy) return;
    setDialog(null);
  }

  async function run(event) {
    event.preventDefault();
    if (busy || !dialog) return;
    if (!online) {
      setError('Reconnect before updating savings.');
      return;
    }
    const { type, goal } = dialog;
    let route = '',
      method = 'POST',
      payload = {};

    if (type === 'deposit' || type === 'withdrawal') {
      const amountMinor = parseMoney(amount);
      if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) {
        setError('Enter a positive amount with up to two decimal places.');
        return;
      }
      route = '/api/savings/entries';
      payload = { type, amountMinor, effectiveDate: date, note, requestId: opRef.current };
    } else if (type === 'goal' || type === 'edit-goal') {
      const targetMinor = parseMoney(goalTarget);
      if (!goalName.trim() || !Number.isSafeInteger(targetMinor) || targetMinor < 1) {
        setError('Enter a goal name and valid target amount.');
        return;
      }
      route = type === 'goal' ? '/api/savings/goals' : `/api/savings/goals/${goal.id}`;
      method = type === 'goal' ? 'POST' : 'PUT';
      payload = { name: goalName.trim(), targetMinor, targetDate: targetDate || null };
    } else if (type === 'allocate' || type === 'release') {
      const amountMinor = parseMoney(goalAmount);
      if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) {
        setError('Enter a positive amount.');
        return;
      }
      route = `/api/savings/goals/${goal.id}/allocate`;
      payload = { direction: type, amountMinor, requestId: opRef.current };
    } else if (type === 'archive') {
      route = `/api/savings/goals/${goal.id}`;
      method = 'DELETE';
    }

    setBusy(true);
    setError('');
    try {
      await api(route, {
        method,
        ...(method === 'DELETE' ? {} : { body: JSON.stringify(payload) }),
      });
      await load();
      setDialog(null);
      const msg =
        type === 'deposit'
          ? 'Savings added successfully.'
          : type === 'withdrawal'
          ? 'Withdrawal recorded successfully.'
          : type === 'goal'
          ? 'Savings goal created.'
          : type === 'allocate'
          ? 'Savings allocated to goal.'
          : type === 'release'
          ? 'Savings released from goal.'
          : type === 'archive'
          ? 'Savings goal archived.'
          : 'Savings goal updated.';
      notify(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const type = dialog?.type;
  const editingGoal = dialog?.goal;

  if (loading) {
    return (
      <div className="v3-page v31-savings">
        <PageHeader
          eyebrow="YOUR MONEY, YOUR FUTURE"
          title="Savings"
          description="A little set aside today goes a long way."
        />
        <div className="skeleton h-60" role="status" aria-label="Loading savings" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="v3-page v31-savings">
        <PageHeader
          eyebrow="YOUR MONEY, YOUR FUTURE"
          title="Savings"
          description="A little set aside today goes a long way."
        />
        <section className="panel">
          <p role="alert">{fetchError}</p>
          <Button
            onClick={() => {
              setLoading(true);
              load()
                .catch(e => setFetchError(e.message))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </Button>
        </section>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: DEDICATED FULL-PAGE SAVINGS HISTORY VIEW
  // Accessible ONLY through "View All Savings History" button
  // =========================================================================
  if (viewAllHistory) {
    return (
      <div className="v3-page v31-savings v31-savings-all-history">
        <PageHeader
          eyebrow="SAVINGS ARCHIVE"
          title="Savings History"
          description="Complete chronological record of all deposits, withdrawals, and net savings movement."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-outline flex items-center gap-2"
                onClick={closeHistoryView}
              >
                <ArrowLeft size={16} /> Back to Savings
              </button>
              <Button onClick={() => show('deposit')} disabled={!online}>
                <Plus size={16} /> Add savings
              </Button>
            </div>
          }
        />

        {/* Dedicated History Overview Metrics */}
        <section className="v3-past-stats-strip panel">
          <div className="v3-past-stat">
            <span className="v3-overline">Total deposited</span>
            <strong className="v3-past-stat-value text-sage">+{money(historySummary.deposits)}</strong>
            <span className="v3-past-stat-meta">Lifetime money added</span>
          </div>
          <div className="v3-past-stat-divider" aria-hidden="true" />
          <div className="v3-past-stat">
            <span className="v3-overline">Total withdrawn</span>
            <strong className="v3-past-stat-value text-terracotta">−{money(historySummary.withdrawals)}</strong>
            <span className="v3-past-stat-meta">Money taken out</span>
          </div>
          <div className="v3-past-stat-divider" aria-hidden="true" />
          <div className="v3-past-stat">
            <span className="v3-overline">Net movement</span>
            <strong className={`v3-past-stat-value ${historySummary.net >= 0 ? 'text-sage' : 'text-terracotta'}`}>
              {historySummary.net >= 0 ? '+' : '−'}{money(Math.abs(historySummary.net))}
            </strong>
            <span className="v3-past-stat-meta">Across {historySummary.count} activities</span>
          </div>
        </section>

        {/* Search & Filters Surface */}
        <section className="v3-surface v3-filter-surface" aria-label="Filter savings activities">
          <div className="v3-search-toolbar">
            <label className="v3-search-field">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search savings history</span>
              <input
                type="search"
                placeholder="Search savings by note or amount…"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
              {historySearch && (
                <button
                  type="button"
                  className="icon-button !w-7 !h-7"
                  onClick={() => setHistorySearch('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <button
              className={`btn-outline v3-filter-button ${
                historyFiltersOpen || hasActiveHistoryFilters ? 'v3-filter-active' : ''
              }`}
              onClick={() => setHistoryFiltersOpen(v => !v)}
              aria-expanded={historyFiltersOpen}
            >
              <SlidersHorizontal size={17} /> Filters{' '}
              {hasActiveHistoryFilters && <span className="v3-filter-indicator" />}
            </button>
          </div>

          {historyFiltersOpen && (
            <div className="v3-filter-grid">
              <label>
                <span className="v3-field-caption">Activity type</span>
                <select
                  className="field"
                  value={historyType}
                  onChange={e => setHistoryType(e.target.value)}
                >
                  <option value="all">All activities</option>
                  <option value="deposit">Deposits only</option>
                  <option value="withdrawal">Withdrawals only</option>
                </select>
              </label>

              <label>
                <span className="v3-field-caption">Month & Year</span>
                <select
                  className="field"
                  value={historyMonth}
                  onChange={e => setHistoryMonth(e.target.value)}
                >
                  <option value="">All months</option>
                  {distinctSavingsMonths.map(m => (
                    <option key={m} value={m}>
                      {formatMonthYear(m)}
                    </option>
                  ))}
                </select>
              </label>

              {hasActiveHistoryFilters && (
                <button
                  type="button"
                  className="v3-clear-filter col-span-full sm:col-auto"
                  onClick={resetHistoryFilters}
                >
                  <X size={15} /> Reset filters
                </button>
              )}
            </div>
          )}
        </section>

        {/* Grouped Savings History List */}
        <section className="panel v31-savings-history">
          <div className="v31-section-heading">
            <div>
              <span className="v31-overline">HISTORICAL RECORDS</span>
              <h2>
                {filteredHistoryEntries.length}{' '}
                {filteredHistoryEntries.length === 1 ? 'activity' : 'activities'} logged
              </h2>
            </div>
            <Wallet size={19} className="text-sage" />
          </div>

          {filteredGroupedSavingsMonths.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={data.entries.length ? 'No matching savings entries' : 'No savings activities yet'}
              description={
                data.entries.length
                  ? 'Try broadening your search or resetting the selected filters.'
                  : 'Add your first savings deposit to begin tracking your history.'
              }
              action={
                hasActiveHistoryFilters ? (
                  <button className="btn-outline" onClick={resetHistoryFilters}>
                    Clear filters
                  </button>
                ) : (
                  <Button onClick={() => show('deposit')} disabled={!online}>
                    <Plus size={16} /> Add savings
                  </Button>
                )
              }
            />
          ) : (
            filteredGroupedSavingsMonths.map(group => {
              const netMinor = group.depositedMinor - group.withdrawnMinor;
              return (
                <div className="v31-history-group" key={group.key}>
                  <div className="v31-history-group-header">
                    <div className="v31-history-group-title-wrap">
                      <span className="v31-history-bullet" aria-hidden="true" />
                      <h3 className="v31-history-group-title">{group.title}</h3>
                      <span className="v3-history-month-count">
                        ({group.activitiesCount} {group.activitiesCount === 1 ? 'activity' : 'activities'})
                      </span>
                    </div>
                    <div className="v31-history-month-totals">
                      {group.depositedMinor > 0 && (
                        <span className="v31-total-deposit text-sage">
                          +{money(group.depositedMinor)}
                        </span>
                      )}
                      {group.withdrawnMinor > 0 && (
                        <span className="v31-total-withdrawal text-terracotta">
                          −{money(group.withdrawnMinor)}
                        </span>
                      )}
                      <span className="v31-total-net">
                        Net:{' '}
                        <strong>
                          {netMinor >= 0 ? '+' : '−'}
                          {money(Math.abs(netMinor))}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="v31-history-entries-list">
                    {group.entries.map(entry => (
                      <div className="v31-saving-entry" key={entry.id}>
                        <span
                          className={`v31-saving-entry-icon ${
                            entry.type === 'deposit' ? 'is-deposit' : 'is-withdrawal'
                          }`}
                        >
                          {entry.type === 'deposit' ? (
                            <ArrowDownLeft size={18} />
                          ) : (
                            <ArrowUpRight size={18} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="truncate">
                              {entry.note ||
                                (entry.type === 'deposit' ? 'Savings added' : 'Savings withdrawn')}
                            </strong>
                            <span
                              className={`v31-entry-type-tag ${
                                entry.type === 'deposit' ? 'tag-deposit' : 'tag-withdrawal'
                              }`}
                            >
                              {entry.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                            </span>
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(`${entry.effectiveDate}T12:00:00Z`).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                timeZone: 'UTC',
                              }
                            )}
                          </span>
                        </div>
                        <strong
                          className={`font-mono ${
                            entry.type === 'deposit' ? 'text-sage' : 'text-terracotta'
                          }`}
                        >
                          {entry.type === 'deposit' ? '+' : '−'}
                          {money(entry.amountMinor)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          <div className="v3-past-footer-nav mt-6">
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={closeHistoryView}
            >
              <ArrowLeft size={16} /> Return to Savings
            </button>
          </div>
        </section>

        {/* Modal Overlays */}
        <Overlay
          title={
            type === 'deposit'
              ? 'Add savings'
              : type === 'withdrawal'
              ? 'Withdraw savings'
              : type === 'goal'
              ? 'New savings goal'
              : type === 'edit-goal'
              ? 'Edit savings goal'
              : type === 'allocate'
              ? 'Allocate savings'
              : type === 'release'
              ? 'Release allocation'
              : 'Archive goal'
          }
          open={Boolean(dialog)}
          onClose={close}
          compact
        >
          <form onSubmit={run} className="v31-savings-form">
            {['deposit', 'withdrawal'].includes(type) && (
              <>
                <label>
                  Amount (₹)
                  <input
                    className="field"
                    autoFocus
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>
                <label>
                  Date
                  <input
                    className="field"
                    type="date"
                    max={dateToday()}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Note (optional)
                  <input
                    className="field"
                    value={note}
                    maxLength={240}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. October savings"
                  />
                </label>
                {type === 'withdrawal' && (
                  <p className="text-xs text-muted">Available to withdraw: {money(free)}</p>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="v31-form-error">
                {error}
              </p>
            )}
            <div className="v31-form-actions">
              <button type="button" className="btn-outline" onClick={close} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={busy || !online}>
                {busy
                  ? 'Saving…'
                  : type === 'withdrawal'
                  ? 'Record withdrawal'
                  : 'Add savings'}
              </button>
            </div>
          </form>
        </Overlay>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DEDICATED SAVINGS GOALS VIEW (View More Goals)
  // =========================================================================
  if (viewAllGoals) {
    return (
      <div className="v3-page v31-savings-all-goals">
        <PageHeader
          eyebrow="YOUR SAVINGS GOALS"
          title="Savings Goals"
          description="Every target you're working towards, gathered in one place."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-outline flex items-center gap-2"
                onClick={() => setViewAllGoals(false)}
              >
                <ArrowLeft size={16} /> Back to Savings
              </button>
              <Button onClick={() => show('goal')} disabled={!online}>
                <Plus size={16} /> Add goal
              </Button>
            </div>
          }
        />

        <div className="v31-all-goals-hero panel mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="v31-overline">Goals allocation</span>
              <h3 className="text-xl font-bold font-display mt-1">
                {money(data.summary.allocatedMinor)} allocated
              </h3>
              <p className="text-xs text-muted mt-1">
                {data.goals.length} {data.goals.length === 1 ? 'goal' : 'goals'} tracked ·{' '}
                {money(free)} available to allocate
              </p>
            </div>
            <button
              type="button"
              className="btn-outline flex items-center gap-1.5 text-xs"
              onClick={() => setViewAllGoals(false)}
            >
              <ArrowLeft size={14} /> Back to Savings
            </button>
          </div>
        </div>

        {data.goals.length === 0 ? (
          <div className="panel v31-savings-empty">
            <Target size={28} />
            <h3>No savings goals yet</h3>
            <p>Create a goal for a trip, a gadget, or anything that matters to you.</p>
            <Button onClick={() => show('goal')} disabled={!online}>
              Create your first goal
            </Button>
          </div>
        ) : (
          <div className="v31-dedicated-goals-grid">
            {data.goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                free={free}
                online={online}
                onAllocate={g => show('allocate', g)}
                onRelease={g => show('release', g)}
                onEdit={g => show('edit-goal', g)}
                onArchive={g => show('archive', g)}
              />
            ))}
          </div>
        )}

        {/* Modal Overlays */}
        <Overlay
          title={
            type === 'goal'
              ? 'New savings goal'
              : type === 'edit-goal'
              ? 'Edit savings goal'
              : type === 'allocate'
              ? 'Allocate savings'
              : type === 'release'
              ? 'Release allocation'
              : 'Archive goal'
          }
          open={Boolean(dialog)}
          onClose={close}
          compact
        >
          <form onSubmit={run} className="v31-savings-form">
            {['goal', 'edit-goal'].includes(type) && (
              <>
                <label>
                  Goal name
                  <input
                    className="field"
                    autoFocus
                    value={goalName}
                    maxLength={70}
                    onChange={e => setGoalName(e.target.value)}
                    placeholder="e.g. Mountain vacation"
                    required
                  />
                </label>
                <label>
                  Target amount (₹)
                  <input
                    className="field"
                    value={goalTarget}
                    inputMode="decimal"
                    onChange={e => setGoalTarget(e.target.value)}
                    placeholder="10000"
                    required
                  />
                </label>
                <label>
                  Target date (optional)
                  <input
                    className="field"
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                  />
                </label>
              </>
            )}
            {['allocate', 'release'].includes(type) && (
              <>
                <p className="text-sm text-muted">
                  {type === 'allocate'
                    ? `Available: ${money(free)}.`
                    : `Allocated to ${editingGoal?.name}: ${money(editingGoal?.allocatedMinor || 0)}.`}
                </p>
                <label>
                  Amount (₹)
                  <input
                    className="field"
                    autoFocus
                    inputMode="decimal"
                    value={goalAmount}
                    onChange={e => setGoalAmount(e.target.value)}
                    required
                  />
                </label>
              </>
            )}
            {type === 'archive' && (
              <p className="text-sm text-muted">
                Archive “{editingGoal?.name}”? Any allocated savings will become available again.
                Your deposit history will stay intact.
              </p>
            )}
            {error && (
              <p role="alert" className="v31-form-error">
                {error}
              </p>
            )}
            <div className="v31-form-actions">
              <button type="button" className="btn-outline" onClick={close} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={busy || !online}>
                {busy
                  ? 'Saving…'
                  : type === 'archive'
                  ? 'Archive goal'
                  : 'Save'}
              </button>
            </div>
          </form>
        </Overlay>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: MAIN SAVINGS PAGE VIEW
  // =========================================================================

  // For compact scannability, show recent 3 months in main view
  const recentSavingsMonths = allGroupedSavingsMonths.slice(0, 3);

  return (
    <div className="v3-page v31-savings">
      <PageHeader
        eyebrow="YOUR MONEY, YOUR FUTURE"
        title="Savings"
        description="A little set aside today goes a long way."
      />

      <section className="v31-savings-hero">
        <div className="v31-savings-hero-copy">
          <span className="v31-overline">Your personal savings</span>
          <h2>{money(data.summary.balanceMinor)}</h2>
          <p>Money you've chosen to set aside, all in one place.</p>
          <div className="v31-savings-hero-actions">
            <Button onClick={() => show('deposit')} disabled={!online}>
              <Plus size={17} /> Add savings
            </Button>
            <Button secondary onClick={() => show('withdrawal')} disabled={!online || free === 0}>
              <ArrowUpRight size={17} /> Withdraw
            </Button>
          </div>
        </div>
        <div className="v31-savings-hero-detail">
          <div>
            <span>Available to allocate or withdraw</span>
            <strong>{money(free)}</strong>
          </div>
          <div>
            <span>Set aside for goals</span>
            <strong>{money(data.summary.allocatedMinor)}</strong>
          </div>
        </div>
      </section>

      <div className="v31-savings-columns">
        {/* Savings Goals: Compact view with at most 3 cards and View More */}
        <section className="panel v31-savings-goals">
          <div className="v31-section-heading">
            <div>
              <span className="v31-overline">Make it meaningful</span>
              <h2>Savings goals</h2>
            </div>
            <button
              type="button"
              className="v31-icon-action"
              onClick={() => show('goal')}
              aria-label="Create savings goal"
              disabled={!online}
            >
              <Plus size={19} />
            </button>
          </div>

          {data.goals.length === 0 ? (
            <div className="v31-savings-empty">
              <Target size={25} />
              <h3>Save for something special.</h3>
              <p>Create a goal for a trip, a gadget or anything that matters to you.</p>
              <Button onClick={() => show('goal')}>Create your first goal</Button>
            </div>
          ) : (
            <div className="v31-goals-list">
              {data.goals.slice(0, 3).map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  free={free}
                  online={online}
                  onAllocate={g => show('allocate', g)}
                  onRelease={g => show('release', g)}
                  onEdit={g => show('edit-goal', g)}
                  onArchive={g => show('archive', g)}
                />
              ))}
              {data.goals.length > 3 && (
                <button
                  type="button"
                  className="btn-outline v31-view-more-goals"
                  onClick={() => setViewAllGoals(true)}
                >
                  View More ({data.goals.length} Goals) <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </section>

        {/* Savings timeline */}
        <section className="panel v31-savings-months">
          <div className="v31-section-heading">
            <div>
              <span className="v31-overline">Month by month</span>
              <h2>Savings timeline</h2>
            </div>
            <Coins size={20} className="text-sage" />
          </div>
          <p className="text-xs text-muted mb-4">
            Your balance carries forward, even in months without new savings.
          </p>
          <div className="v31-months-list">
            {data.months.map(row => (
              <div className="v31-month-row" key={row.month}>
                <div>
                  <strong>{monthTitle(row.month)}</strong>
                  <span>
                    {row.depositedMinor ? `+${money(row.depositedMinor)} saved` : 'No deposits'}
                    {row.withdrawnMinor ? ` · −${money(row.withdrawnMinor)} withdrawn` : ''}
                  </span>
                </div>
                <strong>{money(row.closingMinor)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Monthly-wise Savings History Section */}
      <section className="panel v31-savings-history">
        <div className="v31-section-heading">
          <div>
            <span className="v31-overline">Every little step counts</span>
            <h2>Savings history</h2>
          </div>
          <div className="flex items-center gap-2">
            {data.entries.length > 0 && (
              <button
                type="button"
                className="btn-outline text-xs !py-1.5 flex items-center gap-1.5"
                onClick={openHistoryView}
              >
                <HistoryIcon size={14} /> View All History
              </button>
            )}
            <Wallet size={19} className="text-sage" />
          </div>
        </div>

        {data.entries.length === 0 ? (
          <p className="v31-savings-empty text-sm">No entries yet. Add savings to start your journey.</p>
        ) : (
          <>
            {recentSavingsMonths.map(group => {
              const netMinor = group.depositedMinor - group.withdrawnMinor;
              return (
                <div className="v31-history-group" key={group.key}>
                  <div className="v31-history-group-header">
                    <div className="v31-history-group-title-wrap">
                      <span className="v31-history-bullet" aria-hidden="true" />
                      <h3 className="v31-history-group-title">{group.title}</h3>
                      <span className="v3-history-month-count">
                        ({group.activitiesCount} {group.activitiesCount === 1 ? 'activity' : 'activities'})
                      </span>
                    </div>
                    <div className="v31-history-month-totals">
                      {group.depositedMinor > 0 && (
                        <span className="v31-total-deposit text-sage">
                          +{money(group.depositedMinor)}
                        </span>
                      )}
                      {group.withdrawnMinor > 0 && (
                        <span className="v31-total-withdrawal text-terracotta">
                          −{money(group.withdrawnMinor)}
                        </span>
                      )}
                      <span className="v31-total-net">
                        Net:{' '}
                        <strong>
                          {netMinor >= 0 ? '+' : '−'}
                          {money(Math.abs(netMinor))}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="v31-history-entries-list">
                    {group.entries.map(entry => (
                      <div className="v31-saving-entry" key={entry.id}>
                        <span
                          className={`v31-saving-entry-icon ${
                            entry.type === 'deposit' ? 'is-deposit' : 'is-withdrawal'
                          }`}
                        >
                          {entry.type === 'deposit' ? (
                            <ArrowDownLeft size={18} />
                          ) : (
                            <ArrowUpRight size={18} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="truncate">
                              {entry.note ||
                                (entry.type === 'deposit' ? 'Savings added' : 'Savings withdrawn')}
                            </strong>
                            <span
                              className={`v31-entry-type-tag ${
                                entry.type === 'deposit' ? 'tag-deposit' : 'tag-withdrawal'
                              }`}
                            >
                              {entry.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                            </span>
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(`${entry.effectiveDate}T12:00:00Z`).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                timeZone: 'UTC',
                              }
                            )}
                          </span>
                        </div>
                        <strong
                          className={`font-mono ${
                            entry.type === 'deposit' ? 'text-sage' : 'text-terracotta'
                          }`}
                        >
                          {entry.type === 'deposit' ? '+' : '−'}
                          {money(entry.amountMinor)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {data.entries.length > 0 && (
              <div className="v3-history-view-all-box mt-4">
                <button
                  type="button"
                  className="btn-outline w-full flex items-center justify-center gap-2 py-3"
                  onClick={openHistoryView}
                >
                  <HistoryIcon size={16} /> View All Savings History ({data.entries.length} activities){' '}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <p className="v31-savings-disclaimer">
        Savings is a record you manage in ExpensePlus, not a bank account or verified bank balance.
        Deposits and withdrawals don't alter expense totals. To correct an entry, record an offsetting
        deposit or withdrawal; your history stays intact.
      </p>

      {/* Dialog Overlay */}
      <Overlay
        title={
          type === 'deposit'
            ? 'Add savings'
            : type === 'withdrawal'
            ? 'Withdraw savings'
            : type === 'goal'
            ? 'New savings goal'
            : type === 'edit-goal'
            ? 'Edit savings goal'
            : type === 'allocate'
            ? 'Allocate savings'
            : type === 'release'
            ? 'Release allocation'
            : 'Archive goal'
        }
        open={Boolean(dialog)}
        onClose={close}
        compact
      >
        <form onSubmit={run} className="v31-savings-form">
          {['deposit', 'withdrawal'].includes(type) && (
            <>
              <label>
                Amount (₹)
                <input
                  className="field"
                  autoFocus
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label>
                Date
                <input
                  className="field"
                  type="date"
                  max={dateToday()}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </label>
              <label>
                Note (optional)
                <input
                  className="field"
                  value={note}
                  maxLength={240}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. October savings"
                />
              </label>
              {type === 'withdrawal' && (
                <p className="text-xs text-muted">Available to withdraw: {money(free)}</p>
              )}
            </>
          )}
          {['goal', 'edit-goal'].includes(type) && (
            <>
              <label>
                Goal name
                <input
                  className="field"
                  autoFocus
                  value={goalName}
                  maxLength={70}
                  onChange={e => setGoalName(e.target.value)}
                  placeholder="e.g. Mountain vacation"
                  required
                />
              </label>
              <label>
                Target amount (₹)
                <input
                  className="field"
                  value={goalTarget}
                  inputMode="decimal"
                  onChange={e => setGoalTarget(e.target.value)}
                  placeholder="10000"
                  required
                />
              </label>
              <label>
                Target date (optional)
                <input
                  className="field"
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                />
              </label>
            </>
          )}
          {['allocate', 'release'].includes(type) && (
            <>
              <p className="text-sm text-muted">
                {type === 'allocate'
                  ? `Available: ${money(free)}.`
                  : `Allocated to ${editingGoal?.name}: ${money(editingGoal?.allocatedMinor || 0)}.`}
              </p>
              <label>
                Amount (₹)
                <input
                  className="field"
                  autoFocus
                  inputMode="decimal"
                  value={goalAmount}
                  onChange={e => setGoalAmount(e.target.value)}
                  required
                />
              </label>
            </>
          )}
          {type === 'archive' && (
            <p className="text-sm text-muted">
              Archive “{editingGoal?.name}”? Any allocated savings will become available again.
              Your deposit history will stay intact.
            </p>
          )}
          {error && (
            <p role="alert" className="v31-form-error">
              {error}
            </p>
          )}
          <div className="v31-form-actions">
            <button type="button" className="btn-outline" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !online}>
              {busy
                ? 'Saving…'
                : type === 'archive'
                ? 'Archive goal'
                : type === 'withdrawal'
                ? 'Record withdrawal'
                : type === 'deposit'
                ? 'Add savings'
                : 'Save'}
            </button>
          </div>
        </form>
      </Overlay>
    </div>
  );
}
