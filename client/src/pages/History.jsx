import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Download,
  Search,
  SlidersHorizontal,
  X,
  ReceiptText,
  Plus,
  ArrowLeft,
  ArrowRight,
  History as HistoryIcon,
  PieChart,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppData } from '../components/layout/AppLayout';
import TransactionRow from '../components/TransactionRow';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { api } from '../lib/api';
import { useOnlineStatus } from '../components/pwa/PWAProvider';
import { formatMonthYear, getCategoryEmoji, getCategoryName, inr } from '../lib/format';

const PAGE_SIZE = 40;

// Category breakdown component for monthly headers
function MonthCategoryBreakdown({ transactions = [], categories = [] }) {
  const monthTotalCents = transactions.reduce((acc, t) => acc + (t.amountCents || 0), 0);
  if (!monthTotalCents) return null;

  const categoryTotals = useMemo(() => {
    const map = new Map();
    for (const t of transactions) {
      const catId = t.categoryId || 'other';
      const existing = map.get(catId) || { id: catId, cents: 0, count: 0 };
      existing.cents += (t.amountCents || 0);
      existing.count += 1;
      map.set(catId, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.cents - a.cents)
      .map(item => ({
        ...item,
        name: getCategoryName(item.id, categories),
        emoji: getCategoryEmoji(item.id, categories),
        percent: Math.round((item.cents / monthTotalCents) * 100),
      }));
  }, [transactions, categories, monthTotalCents]);

  return (
    <div className="v3-month-breakdown-panel" aria-label="Category breakdown for this month">
      <div className="v3-month-breakdown-bar">
        {categoryTotals.map(item => (
          <span
            key={item.id}
            className="v3-month-breakdown-segment"
            style={{ width: `${item.percent}%` }}
            title={`${item.name}: ${item.percent}% (${inr(item.cents / 100)})`}
          />
        ))}
      </div>
      <div className="v3-month-breakdown-chips">
        {categoryTotals.map(item => (
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

export default function History({ isDedicatedPastView = false }) {
  const online = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine whether to display the dedicated past transactions view
  const isPastView =
    isDedicatedPastView ||
    searchParams.get('view') === 'past' ||
    searchParams.get('view') === 'all';

  const {
    transactions,
    categories: categoryOptions,
    refreshAfterExpense,
    openExpense,
    notify,
  } = useAppData();

  // Filters state
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [month, setMonth] = useState('');
  const [txType, setTxType] = useState('all'); // 'all' | 'recurring' | 'regular'
  const [sort, setSort] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  // Expanded category breakdown per month key
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({});

  const toggleBreakdown = key => {
    setExpandedBreakdowns(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    if (location.state?.focusSearch) {
      document.getElementById('transaction-search')?.focus();
    }
  }, [location.state]);

  const distinctCategories = useMemo(
    () => [...new Set(transactions.map(t => t.categoryId))],
    [transactions]
  );

  // All distinct recorded months (YYYY-MM) in chronological order
  const distinctMonths = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.slice(0, 7));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        // Category filter
        if (category !== 'all' && t.categoryId !== category) return false;
        // Month filter
        if (month && !t.date?.startsWith(month)) return false;
        // Transaction type filter
        if (txType === 'recurring' && !t.isSubscription) return false;
        if (txType === 'regular' && t.isSubscription) return false;
        // Search query
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          const desc = (t.description || '').toLowerCase();
          const note = (t.note || '').toLowerCase();
          const catName = getCategoryName(t.categoryId, categoryOptions).toLowerCase();
          if (!desc.includes(q) && !note.includes(q) && !catName.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'oldest') return (a.date || '').localeCompare(b.date || '');
        if (sort === 'highest') return (b.amountCents || 0) - (a.amountCents || 0);
        if (sort === 'lowest') return (a.amountCents || 0) - (b.amountCents || 0);
        return (
          (b.date || '').localeCompare(a.date || '') ||
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
      });
  }, [transactions, category, month, txType, query, sort, categoryOptions]);

  const totalSpent = filtered.reduce((n, t) => n + (t.amountCents || 0), 0) / 100;

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setMonth('');
    setTxType('all');
    setSort('newest');
    setVisibleCount(PAGE_SIZE);
  };

  const activeFilters = Boolean(
    month || category !== 'all' || txType !== 'all' || sort !== 'newest'
  );

  // Group filtered transactions monthly
  const monthlyGroups = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      const dateStr = t.date || '';
      const key = dateStr.length >= 7 ? dateStr.slice(0, 7) : 'other';
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: key !== 'other' ? formatMonthYear(key) : 'Other dates',
          transactions: [],
          totalCents: 0,
        });
      }
      const g = map.get(key);
      g.transactions.push(t);
      g.totalCents += t.amountCents || 0;
    }

    // Sort months descending chronological order, newest first
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.key === 'other') return 1;
      if (b.key === 'other') return -1;
      return b.key.localeCompare(a.key);
    });

    // Sort transactions within each month
    for (const g of sorted) {
      g.transactions.sort((a, b) => {
        if (sort === 'oldest') return (a.date || '').localeCompare(b.date || '');
        if (sort === 'highest') return (b.amountCents || 0) - (a.amountCents || 0);
        if (sort === 'lowest') return (a.amountCents || 0) - (b.amountCents || 0);
        return (
          (b.date || '').localeCompare(a.date || '') ||
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
      });
    }

    return sorted;
  }, [filtered, sort]);

  // CSV export
  function csv() {
    const escape = x => {
      const raw = String(x ?? '');
      const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows = [
      ['Date', 'Description', 'Category', 'Amount (INR)', 'Note', 'Recurring'],
      ...filtered.map(t => [
        t.date,
        t.description,
        getCategoryName(t.categoryId, categoryOptions),
        ((t.amountCents || 0) / 100).toFixed(2),
        t.note || '',
        t.isSubscription ? 'Yes' : 'No',
      ]),
    ];
    const content = '\uFEFF' + rows.map(r => r.map(escape).join(',')).join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenseplus-transactions-${isPastView ? 'past-history' : 'recent'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function remove() {
    if (!deleting || !online) return;
    setBusy(true);
    try {
      await api(`/api/transactions/${deleting.id}`, { method: 'DELETE' });
      await refreshAfterExpense();
      setDeleting(null);
      notify('Expense deleted.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // Navigate to dedicated Past Transactions view
  const openPastTransactions = () => {
    setSearchParams({ view: 'past' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to Main Transaction Logs view
  const returnToMainLogs = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // =========================================================================
  // VIEW 1: DEDICATED FULL-PAGE PAST TRANSACTIONS VIEW
  // Accessible ONLY through the "View All Transactions" / "Past Transactions" button
  // =========================================================================
  if (isPastView) {
    return (
      <div className="v3-page v3-history v3-past-transactions-page">
        <PageHeader
          eyebrow="FINANCIAL ARCHIVE"
          title="Past Transactions"
          description="Complete historical records across all months with detailed search and filters."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-outline flex items-center gap-2"
                onClick={returnToMainLogs}
              >
                <ArrowLeft size={16} /> Back to Transactions
              </button>
              <button
                className="btn-outline"
                onClick={csv}
                disabled={!filtered.length}
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          }
        />

        {/* Overview Metric Bar */}
        <section className="v3-past-stats-strip panel">
          <div className="v3-past-stat">
            <span className="v3-overline">Total filtered spending</span>
            <strong className="v3-past-stat-value">{inr(totalSpent)}</strong>
            <span className="v3-past-stat-meta">
              Across {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
          <div className="v3-past-stat-divider" aria-hidden="true" />
          <div className="v3-past-stat">
            <span className="v3-overline">Months spanned</span>
            <strong className="v3-past-stat-value">{monthlyGroups.length}</strong>
            <span className="v3-past-stat-meta">
              {monthlyGroups.length > 0
                ? `${monthlyGroups[monthlyGroups.length - 1]?.title} – ${monthlyGroups[0]?.title}`
                : 'No recorded months'}
            </span>
          </div>
          <div className="v3-past-stat-divider" aria-hidden="true" />
          <div className="v3-past-stat">
            <span className="v3-overline">Recurring commitments</span>
            <strong className="v3-past-stat-value">
              {filtered.filter(t => t.isSubscription).length}
            </strong>
            <span className="v3-past-stat-meta">
              {inr(
                filtered
                  .filter(t => t.isSubscription)
                  .reduce((sum, t) => sum + (t.amountCents || 0), 0) / 100
              )}{' '}
              total
            </span>
          </div>
        </section>

        {/* Search & Filter Controls Surface */}
        <section className="v3-surface v3-filter-surface" aria-label="Search and filter past transactions">
          <div className="v3-search-toolbar">
            <label className="v3-search-field">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search transactions by title or description</span>
              <input
                id="transaction-search"
                type="search"
                placeholder="Search past transactions by title, note, or category…"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
              />
              {query && (
                <button
                  type="button"
                  className="icon-button !w-7 !h-7"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <button
              className={`btn-outline v3-filter-button ${
                filtersOpen || activeFilters ? 'v3-filter-active' : ''
              }`}
              onClick={() => setFiltersOpen(v => !v)}
              aria-expanded={filtersOpen}
              aria-controls="transaction-filters"
            >
              <SlidersHorizontal size={17} /> Filters{' '}
              {activeFilters && <span className="v3-filter-indicator" />}
            </button>
          </div>

          {filtersOpen && (
            <div className="v3-filter-grid" id="transaction-filters">
              <label>
                <span className="v3-field-caption">Category</span>
                <select
                  className="field"
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <option value="all">All categories</option>
                  {distinctCategories.map(id => (
                    <option key={id} value={id}>
                      {getCategoryName(id, categoryOptions)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="v3-field-caption">Month & Year</span>
                <select
                  className="field"
                  value={month}
                  onChange={e => {
                    setMonth(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <option value="">All months</option>
                  {distinctMonths.map(m => (
                    <option key={m} value={m}>
                      {formatMonthYear(m)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="v3-field-caption">Transaction type</span>
                <select
                  className="field"
                  value={txType}
                  onChange={e => {
                    setTxType(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <option value="all">All transactions</option>
                  <option value="regular">One-time expenses</option>
                  <option value="recurring">Recurring / Subscriptions</option>
                </select>
              </label>

              <label>
                <span className="v3-field-caption">Sort order</span>
                <select
                  className="field"
                  value={sort}
                  onChange={e => {
                    setSort(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest amount</option>
                  <option value="lowest">Lowest amount</option>
                </select>
              </label>

              {activeFilters && (
                <button
                  type="button"
                  className="v3-clear-filter col-span-full sm:col-auto"
                  onClick={resetFilters}
                >
                  <X size={15} /> Reset filters
                </button>
              )}
            </div>
          )}
        </section>

        {/* Historical Records Grouped Monthly */}
        <section className="v3-surface v3-record-surface" aria-label="Transaction historical records">
          <div className="v3-record-heading">
            <div>
              <p className="v3-overline">ALL-TIME ARCHIVE</p>
              <h2 className="v3-section-title">
                {filtered.length.toLocaleString('en-IN')}{' '}
                {filtered.length === 1 ? 'transaction' : 'transactions'}
              </h2>
            </div>
            <div className="v3-record-total">
              <span>Selected total</span>
              <strong>{inr(totalSpent)}</strong>
            </div>
          </div>

          {monthlyGroups.length ? (
            <div className="v3-history-groups">
              {monthlyGroups.map(group => {
                const isBreakdownOpen = expandedBreakdowns[group.key];
                return (
                  <div className="v3-history-month-group" key={group.key}>
                    <div className="v3-history-month-header">
                      <div className="v3-history-month-info">
                        <span className="v3-history-month-bullet" aria-hidden="true" />
                        <h3 className="v3-history-month-title">{group.title}</h3>
                        <span className="v3-history-month-count">
                          ({group.transactions.length}{' '}
                          {group.transactions.length === 1 ? 'expense' : 'expenses'})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="v3-month-breakdown-btn"
                          onClick={() => toggleBreakdown(group.key)}
                          aria-expanded={Boolean(isBreakdownOpen)}
                          aria-label={`Toggle category breakdown for ${group.title}`}
                        >
                          <PieChart size={13} />
                          <span>{isBreakdownOpen ? 'Hide' : 'Breakdown'}</span>
                          {isBreakdownOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                        <div className="v3-history-month-sum">
                          <span className="v3-history-month-sum-label">Month Total</span>
                          <strong>{inr(group.totalCents / 100)}</strong>
                        </div>
                      </div>
                    </div>

                    {isBreakdownOpen && (
                      <MonthCategoryBreakdown
                        transactions={group.transactions}
                        categories={categoryOptions}
                      />
                    )}

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
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title={transactions.length ? 'No matching transactions' : 'No records found'}
              description={
                transactions.length
                  ? 'No historical expenses match your selected filters. Try broadening your search or resetting filters.'
                  : 'Add your first expense to begin building your financial archive.'
              }
              action={
                transactions.length ? (
                  <button className="btn-outline" onClick={resetFilters}>
                    <X size={15} /> Clear filters
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => openExpense()}>
                    <Plus size={16} /> Add expense
                  </button>
                )
              }
            />
          )}

          {/* Footer navigation back button */}
          <div className="v3-past-footer-nav">
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={returnToMainLogs}
            >
              <ArrowLeft size={16} /> Return to Transaction Logs
            </button>
          </div>
        </section>

        {deleting && (
          <ConfirmDialog
            message={`Delete “${deleting.description}”? This cannot be undone.`}
            onCancel={() => setDeleting(null)}
            onConfirm={remove}
            busy={busy}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN TRANSACTION LOGS VIEW
  // Compact, scannable monthly grouping with "View All Transactions" button
  // =========================================================================

  // In the main view, keep it compact and easy to scan:
  // Display the recent 3 active months by default, or all if 3 or fewer
  const recentMonthlyGroups = monthlyGroups.slice(0, 3);
  const hasOlderMonths = monthlyGroups.length > 3;

  return (
    <div className="v3-page v3-history">
      <PageHeader
        eyebrow="YOUR RECORDS"
        title="Transaction Logs"
        description="Expenses organized monthly, newest first."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-primary flex items-center gap-2 font-bold"
              onClick={openPastTransactions}
              title="View complete historical records"
            >
              <HistoryIcon size={16} /> View All Transactions
            </button>
            <button className="btn-outline" onClick={csv} disabled={!filtered.length}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        }
      />

      {/* Main View Quick Search & Filter Bar */}
      <section className="v3-surface v3-filter-surface" aria-label="Search and filter transactions">
        <div className="v3-search-toolbar">
          <label className="v3-search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search transactions</span>
            <input
              id="transaction-search"
              type="search"
              placeholder="Search transactions by title or description"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="icon-button !w-7 !h-7"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <button
            className={`btn-outline v3-filter-button ${
              filtersOpen || activeFilters ? 'v3-filter-active' : ''
            }`}
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
            aria-controls="transaction-filters"
          >
            <SlidersHorizontal size={17} /> Filters{' '}
            {activeFilters && <span className="v3-filter-indicator" />}
          </button>
        </div>

        {filtersOpen && (
          <div className="v3-filter-grid" id="transaction-filters">
            <label>
              <span className="v3-field-caption">Category</span>
              <select
                className="field"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {distinctCategories.map(id => (
                  <option key={id} value={id}>
                    {getCategoryName(id, categoryOptions)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="v3-field-caption">Month</span>
              <select
                className="field"
                value={month}
                onChange={e => setMonth(e.target.value)}
              >
                <option value="">All months</option>
                {distinctMonths.map(m => (
                  <option key={m} value={m}>
                    {formatMonthYear(m)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="v3-field-caption">Transaction type</span>
              <select
                className="field"
                value={txType}
                onChange={e => setTxType(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="regular">One-time expenses</option>
                <option value="recurring">Recurring / Subscriptions</option>
              </select>
            </label>
            <label>
              <span className="v3-field-caption">Sort by</span>
              <select
                className="field"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </label>
            <button type="button" className="v3-clear-filter" onClick={resetFilters}>
              <X size={15} /> Reset filters
            </button>
          </div>
        )}
      </section>

      {/* Main View Records Surface */}
      <section className="v3-surface v3-record-surface" aria-label="Transaction records">
        <div className="v3-record-heading">
          <div>
            <p className="v3-overline">MONTHLY SPENDING LOG</p>
            <h2 className="v3-section-title">
              {filtered.length.toLocaleString('en-IN')}{' '}
              {filtered.length === 1 ? 'transaction' : 'transactions'}
            </h2>
          </div>
          <div className="v3-record-total">
            <span>Filtered spending</span>
            <strong>{inr(totalSpent)}</strong>
          </div>
        </div>

        {recentMonthlyGroups.length ? (
          <div className="v3-history-groups">
            {recentMonthlyGroups.map(group => {
              const isBreakdownOpen = expandedBreakdowns[group.key];
              return (
                <div className="v3-history-month-group" key={group.key}>
                  <div className="v3-history-month-header">
                    <div className="v3-history-month-info">
                      <span className="v3-history-month-bullet" aria-hidden="true" />
                      <h3 className="v3-history-month-title">{group.title}</h3>
                      <span className="v3-history-month-count">
                        ({group.transactions.length}{' '}
                        {group.transactions.length === 1 ? 'expense' : 'expenses'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="v3-month-breakdown-btn"
                        onClick={() => toggleBreakdown(group.key)}
                        aria-expanded={Boolean(isBreakdownOpen)}
                        aria-label={`Toggle category breakdown for ${group.title}`}
                      >
                        <PieChart size={13} />
                        <span>{isBreakdownOpen ? 'Hide' : 'Breakdown'}</span>
                        {isBreakdownOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <div className="v3-history-month-sum">
                        <span className="v3-history-month-sum-label">Month Total</span>
                        <strong>{inr(group.totalCents / 100)}</strong>
                      </div>
                    </div>
                  </div>

                  {isBreakdownOpen && (
                    <MonthCategoryBreakdown
                      transactions={group.transactions}
                      categories={categoryOptions}
                    />
                  )}

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
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={transactions.length ? 'No matching transactions' : 'Your history starts here'}
            description={
              transactions.length
                ? 'Try changing your search or filters.'
                : 'Add your first expense and it will show up here.'
            }
            action={
              transactions.length ? (
                <button className="btn-outline" onClick={resetFilters}>
                  Clear filters
                </button>
              ) : (
                <button className="btn-primary" onClick={() => openExpense()}>
                  <Plus size={16} /> Add expense
                </button>
              )
            }
          />
        )}

        {/* View All / Past Transactions Callout Banner */}
        {transactions.length > 0 && (
          <div className="v3-past-transactions-banner">
            <div className="v3-past-banner-copy">
              <span className="v3-overline">DEEPER FINANCIAL ARCHIVE</span>
              <h3>Need to view all historical transactions?</h3>
              <p>
                Browse your complete chronological financial records, search across all previous
                months, and filter by category or recurring expenses.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary v3-past-banner-btn"
              onClick={openPastTransactions}
            >
              <HistoryIcon size={17} /> View Past Transactions <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>

      {deleting && (
        <ConfirmDialog
          message={`Delete “${deleting.description}”? This cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </div>
  );
}
