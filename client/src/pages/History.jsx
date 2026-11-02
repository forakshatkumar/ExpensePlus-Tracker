import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  History as HistoryIcon,
  PieChart,
  Plus,
  ReceiptText,
  TrendingDown,
} from 'lucide-react';
import { useAppData } from '../components/layout/AppLayout';
import TransactionRow from '../components/TransactionRow';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { api } from '../lib/api';
import { useOnlineStatus } from '../components/pwa/PWAProvider';
import {
  dateToday,
  formatMonthYear,
  getCategoryEmoji,
  getCategoryName,
  inr,
} from '../lib/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortTxNewest(txs) {
  return [...txs].sort(
    (a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

function groupByMonth(txs) {
  const map = new Map();
  for (const t of txs) {
    const key = t.date?.length >= 7 ? t.date.slice(0, 7) : 'other';
    if (!map.has(key)) {
      map.set(key, { key, transactions: [], totalCents: 0 });
    }
    const g = map.get(key);
    g.transactions.push(t);
    g.totalCents += t.amountCents || 0;
  }
  // Sort months newest-first; 'other' always last
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (a.key === 'other') return 1;
    if (b.key === 'other') return -1;
    return b.key.localeCompare(a.key);
  });
  for (const g of sorted) {
    g.transactions = sortTxNewest(g.transactions);
  }
  return sorted;
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ transactions, categories }) {
  const totalCents = transactions.reduce((s, t) => s + (t.amountCents || 0), 0);
  if (!totalCents) return null;

  const items = useMemo(() => {
    const map = new Map();
    for (const t of transactions) {
      const id = t.categoryId || 'other';
      const cur = map.get(id) || { id, cents: 0 };
      cur.cents += t.amountCents || 0;
      map.set(id, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.cents - a.cents)
      .map(item => ({
        ...item,
        name: getCategoryName(item.id, categories),
        emoji: getCategoryEmoji(item.id, categories),
        percent: Math.round((item.cents / totalCents) * 100),
      }));
  }, [transactions, categories, totalCents]);

  return (
    <div className="v3-month-breakdown-panel" aria-label="Category breakdown">
      <div className="v3-month-breakdown-bar">
        {items.map(item => (
          <span
            key={item.id}
            className="v3-month-breakdown-segment"
            style={{ width: `${item.percent}%` }}
            title={`${item.name}: ${item.percent}% (${inr(item.cents / 100)})`}
          />
        ))}
      </div>
      <div className="v3-month-breakdown-chips">
        {items.map(item => (
          <div key={item.id} className="v3-breakdown-chip">
            <span className="v3-breakdown-emoji">{item.emoji}</span>
            <span className="v3-breakdown-name">{item.name}</span>
            <strong className="v3-breakdown-amount">{inr(item.cents / 100)}</strong>
            <span className="v3-breakdown-percent">{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function History() {
  const online = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const { transactions, categories: categoryOptions, refreshAfterExpense, openExpense, notify } =
    useAppData();

  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Current month key e.g. "2026-11"
  const currentMonthKey = dateToday().slice(0, 7);

  // View routing via search params
  const view = searchParams.get('view'); // null | 'past'
  const selectedMonth = searchParams.get('month'); // null | 'YYYY-MM'

  // ── Current-month transactions ──────────────────────────────────────────────
  const currentMonthTxs = useMemo(
    () => sortTxNewest(transactions.filter(t => t.date?.startsWith(currentMonthKey))),
    [transactions, currentMonthKey]
  );
  const currentMonthTotal = currentMonthTxs.reduce((s, t) => s + (t.amountCents || 0), 0);

  // ── Historical transactions (all months except current) ─────────────────────
  const historicalGroups = useMemo(() => {
    const hist = transactions.filter(
      t => t.date && t.date.length >= 7 && t.date.slice(0, 7) !== currentMonthKey
    );
    return groupByMonth(hist);
  }, [transactions, currentMonthKey]);

  // ── Delete handler ──────────────────────────────────────────────────────────
  async function remove() {
    if (!deleting || !online) return;
    setBusy(true);
    try {
      await api(`/api/transactions/${deleting.id}`, { method: 'DELETE' });
      await refreshAfterExpense();
      setDeleting(null);
      notify('Expense deleted.', 'success');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const goToMainView = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goToPastOverview = () => {
    setSearchParams({ view: 'past' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goToMonthDetail = monthKey => {
    setSearchParams({ view: 'past', month: monthKey });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW C: Individual month detail
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'past' && selectedMonth) {
    const group = historicalGroups.find(g => g.key === selectedMonth);
    const monthLabel = formatMonthYear(selectedMonth);

    return (
      <div className="v3-page v3-history">
        <PageHeader
          eyebrow="TRANSACTION HISTORY"
          title={monthLabel}
          description={`All expenses recorded in ${monthLabel}.`}
          action={
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={goToPastOverview}
            >
              <ArrowLeft size={16} /> Back to Overview
            </button>
          }
        />

        {/* Month summary strip */}
        {group && (
          <section className="v3-current-month-hero panel" aria-label={`${monthLabel} summary`}>
            <div className="v3-cmh-stats">
              <div className="v3-cmh-stat">
                <span className="v3-overline">Total Spent</span>
                <strong className="v3-cmh-total">{inr(group.totalCents / 100)}</strong>
              </div>
              <div className="v3-cmh-divider" aria-hidden="true" />
              <div className="v3-cmh-stat">
                <span className="v3-overline">Transactions</span>
                <strong className="v3-cmh-count">{group.transactions.length}</strong>
              </div>
              <div className="v3-cmh-divider" aria-hidden="true" />
              <div className="v3-cmh-stat">
                <span className="v3-overline">Avg. per expense</span>
                <strong className="v3-cmh-count">
                  {group.transactions.length
                    ? inr(group.totalCents / group.transactions.length / 100)
                    : '—'}
                </strong>
              </div>
            </div>

            {/* Category breakdown toggle */}
            <button
              type="button"
              className="v3-month-breakdown-btn mt-3"
              onClick={() => setBreakdownOpen(v => !v)}
              aria-expanded={breakdownOpen}
            >
              <PieChart size={13} />
              <span>{breakdownOpen ? 'Hide breakdown' : 'Category breakdown'}</span>
              {breakdownOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {breakdownOpen && (
              <CategoryBreakdown
                transactions={group.transactions}
                categories={categoryOptions}
              />
            )}
          </section>
        )}

        {/* Transaction list */}
        <section className="v3-surface v3-record-surface" aria-label={`Transactions for ${monthLabel}`}>
          {group?.transactions.length ? (
            <div className="v3-transaction-list v3-history-list">
              {group.transactions.map(t => (
                <TransactionRow
                  key={t.id}
                  item={t}
                  categories={categoryOptions}
                  onEdit={online ? openExpense : null}
                  onDelete={online ? setDeleting : null}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="No transactions found"
              description={`No expenses were recorded in ${monthLabel}.`}
            />
          )}

          <div className="v3-past-footer-nav">
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={goToPastOverview}
            >
              <ArrowLeft size={16} /> Back to Monthly Overview
            </button>
          </div>
        </section>

        {deleting && (
          <ConfirmDialog
            message={`Delete "${deleting.description}"? This cannot be undone.`}
            onCancel={() => setDeleting(null)}
            onConfirm={remove}
            busy={busy}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW B: Past transactions — monthly overview cards
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'past') {
    return (
      <div className="v3-page v3-history">
        <PageHeader
          eyebrow="FINANCIAL ARCHIVE"
          title="Past Transactions"
          description="Browse your spending month by month. Tap any month to explore its transactions."
          action={
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={goToMainView}
            >
              <ArrowLeft size={16} /> Back to Transactions
            </button>
          }
        />

        <section className="v3-surface v3-record-surface" aria-label="Past months overview">
          {historicalGroups.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No past transactions"
              description="All your transactions are from the current month. Past months will appear here over time."
              action={
                <button
                  type="button"
                  className="btn-outline flex items-center gap-2"
                  onClick={goToMainView}
                >
                  <ArrowLeft size={16} /> Back to Transactions
                </button>
              }
            />
          ) : (
            <>
              <div className="v3-past-overview-header">
                <p className="v3-overline">ALL PAST MONTHS</p>
                <p className="v3-past-overview-meta">
                  {historicalGroups.length} {historicalGroups.length === 1 ? 'month' : 'months'} of
                  history
                </p>
              </div>

              <div className="v3-past-month-cards">
                {historicalGroups.map(group => {
                  // Find top category
                  const catMap = new Map();
                  for (const t of group.transactions) {
                    const id = t.categoryId || 'other';
                    catMap.set(id, (catMap.get(id) || 0) + (t.amountCents || 0));
                  }
                  const topCatId =
                    catMap.size > 0
                      ? [...catMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
                      : null;

                  return (
                    <button
                      key={group.key}
                      type="button"
                      className="v3-past-month-card"
                      onClick={() => goToMonthDetail(group.key)}
                      aria-label={`View transactions for ${formatMonthYear(group.key)}`}
                    >
                      <div className="v3-pmc-left">
                        <span className="v3-pmc-month">{formatMonthYear(group.key)}</span>
                        <span className="v3-pmc-meta">
                          {group.transactions.length}{' '}
                          {group.transactions.length === 1 ? 'expense' : 'expenses'}
                          {topCatId && (
                            <>
                              {' '}
                              · {getCategoryEmoji(topCatId, categoryOptions)}{' '}
                              {getCategoryName(topCatId, categoryOptions)}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="v3-pmc-right">
                        <strong className="v3-pmc-total">{inr(group.totalCents / 100)}</strong>
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
                  onClick={goToMainView}
                >
                  <ArrowLeft size={16} /> Return to Transaction Logs
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW A: Main Transaction Logs — current month only
  // ═══════════════════════════════════════════════════════════════════════════

  const currentMonthLabel = formatMonthYear(currentMonthKey);

  return (
    <div className="v3-page v3-history">
      <PageHeader
        eyebrow="YOUR RECORDS"
        title="Transaction Logs"
        description={`Expenses for ${currentMonthLabel}, newest first.`}
      />

      {/* Current month hero card */}
      <section className="v3-current-month-hero panel" aria-label={`${currentMonthLabel} summary`}>
        <div className="v3-cmh-header">
          <div>
            <p className="v3-overline">CURRENT MONTH</p>
            <h2 className="v3-cmh-month-title">{currentMonthLabel}</h2>
          </div>
          <TrendingDown size={22} className="v3-cmh-icon" aria-hidden="true" />
        </div>

        <div className="v3-cmh-stats">
          <div className="v3-cmh-stat">
            <span className="v3-overline">Total Spent</span>
            <strong className="v3-cmh-total">{inr(currentMonthTotal / 100)}</strong>
          </div>
          <div className="v3-cmh-divider" aria-hidden="true" />
          <div className="v3-cmh-stat">
            <span className="v3-overline">Transactions</span>
            <strong className="v3-cmh-count">{currentMonthTxs.length}</strong>
          </div>
        </div>

        {/* Category breakdown toggle */}
        {currentMonthTxs.length > 0 && (
          <>
            <button
              type="button"
              className="v3-month-breakdown-btn mt-3"
              onClick={() => setBreakdownOpen(v => !v)}
              aria-expanded={breakdownOpen}
            >
              <PieChart size={13} />
              <span>{breakdownOpen ? 'Hide breakdown' : 'Category breakdown'}</span>
              {breakdownOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {breakdownOpen && (
              <CategoryBreakdown
                transactions={currentMonthTxs}
                categories={categoryOptions}
              />
            )}
          </>
        )}
      </section>

      {/* Transaction list */}
      <section className="v3-surface v3-record-surface" aria-label="Current month transactions">
        <div className="v3-record-heading">
          <div>
            <p className="v3-overline">THIS MONTH'S EXPENSES</p>
            <h2 className="v3-section-title">
              {currentMonthTxs.length.toLocaleString('en-IN')}{' '}
              {currentMonthTxs.length === 1 ? 'transaction' : 'transactions'}
            </h2>
          </div>
          <div className="v3-record-total">
            <span>Month total</span>
            <strong>{inr(currentMonthTotal / 100)}</strong>
          </div>
        </div>

        {currentMonthTxs.length > 0 ? (
          <div className="v3-transaction-list v3-history-list">
            {currentMonthTxs.map(t => (
              <TransactionRow
                key={t.id}
                item={t}
                categories={categoryOptions}
                onEdit={online ? openExpense : null}
                onDelete={online ? setDeleting : null}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={`No expenses in ${currentMonthLabel}`}
            description="You haven't recorded any expenses this month. Add one to start tracking."
            action={
              <button className="btn-primary flex items-center gap-2" onClick={() => openExpense()}>
                <Plus size={16} /> Add expense
              </button>
            }
          />
        )}
      </section>

      {/* View Past Transactions CTA */}
      <div className="v3-past-transactions-banner">
        <div className="v3-past-banner-copy">
          <span className="v3-overline">FINANCIAL ARCHIVE</span>
          <h3>View past months</h3>
          <p>
            Browse your complete expense history, organized by month. Tap any month to drill
            down into individual transactions.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary v3-past-banner-btn"
          onClick={goToPastOverview}
        >
          <HistoryIcon size={17} /> View Past Transactions <ArrowRight size={15} />
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          message={`Delete "${deleting.description}"? This cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </div>
  );
}
