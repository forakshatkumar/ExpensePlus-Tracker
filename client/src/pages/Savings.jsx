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
  Target,
  Trash2,
  Wallet,
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

// ─── Savings entry row ────────────────────────────────────────────────────────

function SavingsEntryRow({ entry }) {
  const isDeposit = entry.type === 'deposit';
  return (
    <div className="v31-saving-entry">
      <span className={`v31-saving-entry-icon ${isDeposit ? 'is-deposit' : 'is-withdrawal'}`}>
        {isDeposit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <strong className="truncate">
            {entry.note || (isDeposit ? 'Savings added' : 'Savings withdrawn')}
          </strong>
          <span className={`v31-entry-type-tag ${isDeposit ? 'tag-deposit' : 'tag-withdrawal'}`}>
            {isDeposit ? 'Deposit' : 'Withdrawal'}
          </span>
        </div>
        <span className="text-xs text-muted">
          {new Date(`${entry.effectiveDate}T12:00:00Z`).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </span>
      </div>
      <strong className={`font-mono ${isDeposit ? 'text-sage' : 'text-terracotta'}`}>
        {isDeposit ? '+' : '−'}
        {money(entry.amountMinor)}
      </strong>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // View states
  const [viewAllGoals, setViewAllGoals] = useState(false);

  // Search-param driven savings history navigation
  const view = searchParams.get('view'); // null | 'history'
  const selectedMonth = searchParams.get('month'); // null | 'YYYY-MM'
  const viewAllHistory =
    isDedicatedHistoryView || view === 'history' || view === 'all';

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

  // Current month key
  const currentMonthKey = dateToday().slice(0, 7);

  // Helper: sort entries newest-first
  const sortEntriesNewest = useCallback(entries =>
    [...entries].sort(
      (a, b) =>
        (b.effectiveDate || '').localeCompare(a.effectiveDate || '') ||
        (b.createdAt || '').localeCompare(a.createdAt || '')
    ), []);

  // Helper: group entries by month
  const groupEntriesByMonth = useCallback(entries => {
    const map = new Map();
    for (const entry of entries) {
      const key = entry.effectiveDate?.length >= 7 ? entry.effectiveDate.slice(0, 7) : 'other';
      if (!map.has(key)) {
        map.set(key, {
          key,
          entries: [],
          depositedMinor: 0,
          withdrawnMinor: 0,
          activitiesCount: 0,
        });
      }
      const g = map.get(key);
      g.entries.push(entry);
      g.activitiesCount += 1;
      if (entry.type === 'deposit') g.depositedMinor += entry.amountMinor || 0;
      else if (entry.type === 'withdrawal') g.withdrawnMinor += entry.amountMinor || 0;
    }
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.key === 'other') return 1;
      if (b.key === 'other') return -1;
      return b.key.localeCompare(a.key);
    });
    for (const g of sorted) {
      g.entries = sortEntriesNewest(g.entries);
    }
    return sorted;
  }, [sortEntriesNewest]);

  // Current-month entries
  const currentMonthEntries = useMemo(
    () => sortEntriesNewest(data.entries.filter(e => e.effectiveDate?.startsWith(currentMonthKey))),
    [data.entries, currentMonthKey, sortEntriesNewest]
  );
  const currentMonthDeposited = currentMonthEntries
    .filter(e => e.type === 'deposit')
    .reduce((s, e) => s + (e.amountMinor || 0), 0);
  const currentMonthWithdrawn = currentMonthEntries
    .filter(e => e.type === 'withdrawal')
    .reduce((s, e) => s + (e.amountMinor || 0), 0);
  const currentMonthNet = currentMonthDeposited - currentMonthWithdrawn;

  // Historical entries (past months only)
  const historicalGroups = useMemo(() => {
    const hist = data.entries.filter(
      e => e.effectiveDate && e.effectiveDate.slice(0, 7) !== currentMonthKey
    );
    return groupEntriesByMonth(hist);
  }, [data.entries, currentMonthKey, groupEntriesByMonth]);

  // ── Modal handlers ──────────────────────────────────────────────────────────
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

  // Shared modal overlay (used in all views)
  const type = dialog?.type;
  const editingGoal = dialog?.goal;

  const modalOverlay = (
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
            Archive "{editingGoal?.name}"? Any allocated savings will become available again.
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
  );

  // ── Loading / error ─────────────────────────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW C: Individual month savings detail
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewAllHistory && selectedMonth) {
    const group = historicalGroups.find(g => g.key === selectedMonth);
    const monthLabel = formatMonthYear(selectedMonth);
    const netMinor = group ? group.depositedMinor - group.withdrawnMinor : 0;

    return (
      <div className="v3-page v31-savings v31-savings-all-history">
        <PageHeader
          eyebrow="SAVINGS HISTORY"
          title={monthLabel}
          description={`All savings activities recorded in ${monthLabel}.`}
          action={
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={() => {
                setSearchParams({ view: 'history' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ArrowLeft size={16} /> Back to Overview
            </button>
          }
        />

        {/* Month stats */}
        {group && (
          <section className="v3-past-stats-strip panel" aria-label={`${monthLabel} savings summary`}>
            <div className="v3-past-stat">
              <span className="v3-overline">Deposited</span>
              <strong className="v3-past-stat-value text-sage">+{money(group.depositedMinor)}</strong>
              <span className="v3-past-stat-meta">Money added</span>
            </div>
            <div className="v3-past-stat-divider" aria-hidden="true" />
            <div className="v3-past-stat">
              <span className="v3-overline">Withdrawn</span>
              <strong className="v3-past-stat-value text-terracotta">−{money(group.withdrawnMinor)}</strong>
              <span className="v3-past-stat-meta">Money taken out</span>
            </div>
            <div className="v3-past-stat-divider" aria-hidden="true" />
            <div className="v3-past-stat">
              <span className="v3-overline">Net</span>
              <strong className={`v3-past-stat-value ${netMinor >= 0 ? 'text-sage' : 'text-terracotta'}`}>
                {netMinor >= 0 ? '+' : '−'}{money(Math.abs(netMinor))}
              </strong>
              <span className="v3-past-stat-meta">{group.activitiesCount} activities</span>
            </div>
          </section>
        )}

        <section className="panel v31-savings-history" aria-label={`${monthLabel} entries`}>
          {group?.entries.length ? (
            <div className="v31-history-entries-list">
              {group.entries.map(entry => (
                <SavingsEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No savings activities"
              description={`No deposits or withdrawals were recorded in ${monthLabel}.`}
            />
          )}

          <div className="v3-past-footer-nav mt-6">
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={() => {
                setSearchParams({ view: 'history' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ArrowLeft size={16} /> Back to Monthly Overview
            </button>
          </div>
        </section>

        {modalOverlay}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW B: Past savings — monthly overview cards
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewAllHistory) {
    // All-time stats (across all historical months)
    const allHistDeposited = historicalGroups.reduce((s, g) => s + g.depositedMinor, 0);
    const allHistWithdrawn = historicalGroups.reduce((s, g) => s + g.withdrawnMinor, 0);
    const allHistNet = allHistDeposited - allHistWithdrawn;
    const allHistCount = historicalGroups.reduce((s, g) => s + g.activitiesCount, 0);

    return (
      <div className="v3-page v31-savings v31-savings-all-history">
        <PageHeader
          eyebrow="SAVINGS ARCHIVE"
          title="Past Savings History"
          description="Browse your savings activity month by month. Tap any month to see individual entries."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-outline flex items-center gap-2"
                onClick={() => {
                  setSearchParams({});
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ArrowLeft size={16} /> Back to Savings
              </button>
              <Button onClick={() => show('deposit')} disabled={!online}>
                <Plus size={16} /> Add savings
              </Button>
            </div>
          }
        />

        {/* All-time overview strip */}
        <section className="v3-past-stats-strip panel" aria-label="All-time savings summary">
          <div className="v3-past-stat">
            <span className="v3-overline">All-time deposited</span>
            <strong className="v3-past-stat-value text-sage">+{money(allHistDeposited)}</strong>
            <span className="v3-past-stat-meta">Past months only</span>
          </div>
          <div className="v3-past-stat-divider" aria-hidden="true" />
          <div className="v3-past-stat">
            <span className="v3-overline">All-time withdrawn</span>
            <strong className="v3-past-stat-value text-terracotta">−{money(allHistWithdrawn)}</strong>
            <span className="v3-past-stat-meta">Past months only</span>
          </div>
          <div className="v3-past-stat-divider" aria-hidden="true" />
          <div className="v3-past-stat">
            <span className="v3-overline">Net movement</span>
            <strong className={`v3-past-stat-value ${allHistNet >= 0 ? 'text-sage' : 'text-terracotta'}`}>
              {allHistNet >= 0 ? '+' : '−'}{money(Math.abs(allHistNet))}
            </strong>
            <span className="v3-past-stat-meta">Across {allHistCount} activities</span>
          </div>
        </section>

        <section className="v3-surface v3-record-surface" aria-label="Past savings months">
          {historicalGroups.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No past savings history"
              description="All your savings activities are from the current month. Past months will appear here over time."
              action={
                <button
                  type="button"
                  className="btn-outline flex items-center gap-2"
                  onClick={() => {
                    setSearchParams({});
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ArrowLeft size={16} /> Back to Savings
                </button>
              }
            />
          ) : (
            <>
              <div className="v3-past-overview-header">
                <p className="v3-overline">PAST MONTHS</p>
                <p className="v3-past-overview-meta">
                  {historicalGroups.length} {historicalGroups.length === 1 ? 'month' : 'months'} of
                  history
                </p>
              </div>

              <div className="v3-past-month-cards">
                {historicalGroups.map(group => {
                  const netMinor = group.depositedMinor - group.withdrawnMinor;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      className="v3-past-month-card"
                      onClick={() => {
                        setSearchParams({ view: 'history', month: group.key });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      aria-label={`View savings for ${formatMonthYear(group.key)}`}
                    >
                      <div className="v3-pmc-left">
                        <span className="v3-pmc-month">{monthTitle(group.key)}</span>
                        <span className="v3-pmc-meta">
                          {group.activitiesCount}{' '}
                          {group.activitiesCount === 1 ? 'activity' : 'activities'}
                          {group.depositedMinor > 0 && (
                            <> · <span className="text-sage">+{money(group.depositedMinor)}</span></>
                          )}
                          {group.withdrawnMinor > 0 && (
                            <> · <span className="text-terracotta">−{money(group.withdrawnMinor)}</span></>
                          )}
                        </span>
                      </div>
                      <div className="v3-pmc-right">
                        <strong className={`v3-pmc-total ${netMinor >= 0 ? 'text-sage' : 'text-terracotta'}`}>
                          {netMinor >= 0 ? '+' : '−'}{money(Math.abs(netMinor))}
                        </strong>
                        <ChevronRight size={16} className="v3-pmc-chevron" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="v3-past-footer-nav">
                <button
                  type="button"
                  className="btn-outline flex items-center gap-2"
                  onClick={() => {
                    setSearchParams({});
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ArrowLeft size={16} /> Return to Savings
                </button>
              </div>
            </>
          )}
        </section>

        {modalOverlay}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW D: DEDICATED SAVINGS GOALS VIEW (View More Goals)
  // ═══════════════════════════════════════════════════════════════════════════
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

        {modalOverlay}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW A: MAIN SAVINGS PAGE — current month history only
  // ═══════════════════════════════════════════════════════════════════════════

  const currentMonthLabel = formatMonthYear(currentMonthKey);

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
        {/* Savings Goals */}
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

      {/* Current Month Savings History */}
      <section className="panel v31-savings-history" aria-label="Current month savings history">
        <div className="v31-section-heading">
          <div>
            <span className="v31-overline">CURRENT MONTH</span>
            <h2>
              {currentMonthLabel} · Savings activity
            </h2>
          </div>
          <Wallet size={19} className="text-sage" />
        </div>

        {/* Current month stats strip */}
        {currentMonthEntries.length > 0 && (
          <div className="v3-savings-current-month-stats">
            <div className="v3-scms-stat">
              <span className="v3-overline">Deposited</span>
              <strong className="text-sage">+{money(currentMonthDeposited)}</strong>
            </div>
            <div className="v3-scms-divider" aria-hidden="true" />
            <div className="v3-scms-stat">
              <span className="v3-overline">Withdrawn</span>
              <strong className="text-terracotta">−{money(currentMonthWithdrawn)}</strong>
            </div>
            <div className="v3-scms-divider" aria-hidden="true" />
            <div className="v3-scms-stat">
              <span className="v3-overline">Net</span>
              <strong className={currentMonthNet >= 0 ? 'text-sage' : 'text-terracotta'}>
                {currentMonthNet >= 0 ? '+' : '−'}{money(Math.abs(currentMonthNet))}
              </strong>
            </div>
          </div>
        )}

        {currentMonthEntries.length === 0 ? (
          <div className="v31-savings-empty text-sm">
            <Wallet size={22} className="text-muted" />
            <p>No savings activity in {currentMonthLabel}.</p>
            <Button onClick={() => show('deposit')} disabled={!online}>
              <Plus size={15} /> Add savings
            </Button>
          </div>
        ) : (
          <div className="v31-history-entries-list">
            {currentMonthEntries.map(entry => (
              <SavingsEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {/* View Past Savings History CTA */}
        {data.entries.length > 0 && (
          <div className="v3-past-transactions-banner mt-4">
            <div className="v3-past-banner-copy">
              <span className="v3-overline">SAVINGS ARCHIVE</span>
              <h3>View past savings history</h3>
              <p>
                See all your deposits and withdrawals from previous months, organized by month.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary v3-past-banner-btn"
              onClick={() => {
                setSearchParams({ view: 'history' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <HistoryIcon size={17} /> View Past Savings History <ChevronRight size={15} />
            </button>
          </div>
        )}
      </section>

      <p className="v31-savings-disclaimer">
        Savings is a record you manage in ExpensePlus, not a bank account or verified bank balance.
        Deposits and withdrawals don't alter expense totals. To correct an entry, record an offsetting
        deposit or withdrawal; your history stays intact.
      </p>

      {modalOverlay}
    </div>
  );
}
