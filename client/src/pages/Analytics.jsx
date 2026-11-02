import { useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAppData } from '../components/layout/AppLayout';
import { useTheme } from '../context/ThemeContext';
import { getChartTheme } from '../themeConfig';
import { getCategoryName, dateToday, formatMonthYear, inr } from '../lib/format';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/finance/SectionTitle';
import MetricTile from '../components/finance/MetricTile';
import EmptyState from '../components/ui/EmptyState';
import {
  ChartNoAxesCombined,
  Activity,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  PieChart,
  Wallet,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function Analytics() {
  const { transactions, categories: categoryOptions, profile } = useAppData();
  const { themeId, mode } = useTheme();
  const colors = getChartTheme(themeId, mode);
  const palette = [
    colors.secondary,
    colors.accent,
    colors.tertiary,
    '#C7A18C',
    '#77968F',
    '#B6B28B',
    '#D97A62',
    '#8BA888',
    '#A78BFA',
  ];
  const axis = {
    grid: { color: colors.grid },
    border: { display: false },
    ticks: { color: colors.text, maxTicksLimit: 6 },
  };

  // Time range filter for Monthly Spending Bar Chart: '6' | '12' | 'all'
  const [monthlyRange, setMonthlyRange] = useState('12');

  const now = dateToday();
  const currentMonthKey = now.slice(0, 7);

  // Filter valid expense transactions
  const validExpenses = useMemo(() => {
    return transactions.filter(
      t => t.date && /^\d{4}-\d{2}/.test(t.date) && Number.isFinite(t.amountCents)
    );
  }, [transactions]);

  // Overall all-time spending total
  const lifetimeTotal = useMemo(() => {
    return validExpenses.reduce((s, t) => s + (t.amountCents || 0), 0) / 100;
  }, [validExpenses]);

  // Monthly totals aggregation: map YYYY-MM -> { total, count, list }
  const monthlyAggregates = useMemo(() => {
    const map = new Map();
    for (const t of validExpenses) {
      const m = t.date.slice(0, 7);
      if (!map.has(m)) {
        map.set(m, { month: m, total: 0, count: 0, transactions: [] });
      }
      const item = map.get(m);
      item.total += (t.amountCents || 0) / 100;
      item.count += 1;
      item.transactions.push(t);
    }
    return map;
  }, [validExpenses]);

  // All recorded months sorted chronologically (oldest to newest)
  const allChronologicalMonths = useMemo(() => {
    const keys = new Set(monthlyAggregates.keys());
    keys.add(currentMonthKey);
    return Array.from(keys).sort();
  }, [monthlyAggregates, currentMonthKey]);

  // Months to display in Monthly Spending Bar Chart based on monthlyRange
  const displayMonthlyMonths = useMemo(() => {
    if (monthlyRange === '6') {
      return allChronologicalMonths.slice(-6);
    }
    if (monthlyRange === '12') {
      return allChronologicalMonths.slice(-12);
    }
    return allChronologicalMonths;
  }, [allChronologicalMonths, monthlyRange]);

  const hasMultipleYears = useMemo(() => {
    return new Set(displayMonthlyMonths.map(m => m.slice(0, 4))).size > 1;
  }, [displayMonthlyMonths]);

  const monthLabel = m => {
    const d = new Date(`${m}-15T12:00:00Z`);
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      ...(hasMultipleYears ? { year: '2-digit' } : {}),
      timeZone: 'UTC',
    });
  };

  // Monthly bar chart data: each month has its actual aggregated total
  const monthlyBarData = {
    labels: displayMonthlyMonths.map(monthLabel),
    datasets: [
      {
        label: 'Monthly Spending',
        data: displayMonthlyMonths.map(m => monthlyAggregates.get(m)?.total || 0),
        backgroundColor: colors.accent,
        borderRadius: 7,
        maxBarThickness: 38,
        hoverBackgroundColor: colors.secondary,
      },
    ],
  };

  const monthlyBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.text,
        padding: 13,
        borderColor: colors.accent + '44',
        borderWidth: 1,
        callbacks: {
          title: items => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const m = displayMonthlyMonths[idx];
            return formatMonthYear(m);
          },
          label: ctx => {
            const idx = ctx.dataIndex;
            const m = displayMonthlyMonths[idx];
            const count = monthlyAggregates.get(m)?.count || 0;
            return [
              `Total spent: ${inr(ctx.parsed.y)}`,
              `Transactions: ${count} ${count === 1 ? 'expense' : 'expenses'}`,
            ];
          },
        },
      },
    },
    scales: {
      x: { ...axis, grid: { display: false } },
      y: {
        ...axis,
        beginAtZero: true,
        ticks: {
          color: colors.text,
          maxTicksLimit: 5,
          callback: v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`,
        },
      },
    },
  };

  // Cumulative all-time spending calculation
  const cumulativeData = useMemo(() => {
    let runningTotal = 0;
    const points = [];
    for (const m of allChronologicalMonths) {
      const monthSpent = monthlyAggregates.get(m)?.total || 0;
      runningTotal += monthSpent;
      points.push({
        month: m,
        monthlyTotal: monthSpent,
        cumulative: runningTotal,
      });
    }
    return points;
  }, [allChronologicalMonths, monthlyAggregates]);

  const allTimeChartData = {
    labels: cumulativeData.map(p => {
      const d = new Date(`${p.month}-15T12:00:00Z`);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      });
    }),
    datasets: [
      {
        label: 'Cumulative Spending',
        data: cumulativeData.map(p => p.cumulative),
        borderColor: colors.secondary,
        backgroundColor: colors.secondary + '20',
        fill: true,
        borderWidth: 2.8,
        tension: 0.35,
        pointRadius: cumulativeData.length <= 12 ? 3.5 : 1.5,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.secondary,
        pointHoverBackgroundColor: colors.accent,
      },
    ],
  };

  const allTimeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.text,
        padding: 13,
        borderColor: colors.secondary + '44',
        borderWidth: 1,
        callbacks: {
          title: items => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            return formatMonthYear(cumulativeData[idx].month);
          },
          label: ctx => {
            const item = cumulativeData[ctx.dataIndex];
            return [
              `All-Time Cumulative: ${inr(item.cumulative)}`,
              `Added this month: +${inr(item.monthlyTotal)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: { ...axis, grid: { display: false } },
      y: {
        ...axis,
        beginAtZero: true,
        ticks: {
          color: colors.text,
          maxTicksLimit: 5,
          callback: v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`,
        },
      },
    },
  };

  // Category breakdown across all recorded expenses
  const categoryTotals = useMemo(() => {
    const map = {};
    for (const t of validExpenses) {
      const id = t.categoryId || 'other';
      map[id] = (map[id] || 0) + (t.amountCents || 0) / 100;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [validExpenses]);

  const categoryDoughnutData = {
    labels: categoryTotals.map(([id]) => getCategoryName(id, categoryOptions)),
    datasets: [
      {
        data: categoryTotals.map(([, total]) => total),
        backgroundColor: palette,
        borderColor: colors.surface,
        borderWidth: 2.5,
      },
    ],
  };

  // Day-by-day past 14 days line chart
  const last14Days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(`${now}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i - 13);
      return d.toISOString().slice(0, 10);
    });
  }, [now]);

  const dailyTotals = useMemo(() => {
    const map = {};
    for (const t of validExpenses) {
      if (t.date) {
        map[t.date] = (map[t.date] || 0) + (t.amountCents || 0) / 100;
      }
    }
    return map;
  }, [validExpenses]);

  const dailyLineData = {
    labels: last14Days.map(d => {
      const dateObj = new Date(`${d}T12:00:00Z`);
      return dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    }),
    datasets: [
      {
        label: 'Daily Spending',
        data: last14Days.map(d => dailyTotals[d] || 0),
        borderColor: colors.accent,
        backgroundColor: colors.accent + '15',
        borderWidth: 2.2,
        tension: 0.32,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: colors.accent,
      },
    ],
  };

  // Key Analytics Computations
  // 1. Current month total
  const currentMonthTotal = monthlyAggregates.get(currentMonthKey)?.total || 0;

  // 2. Average monthly spending across active months with recorded transactions
  const activeMonthsWithSpending = useMemo(() => {
    return Array.from(monthlyAggregates.values()).filter(g => g.total > 0);
  }, [monthlyAggregates]);

  const averageMonthlySpending = useMemo(() => {
    if (!activeMonthsWithSpending.length) return 0;
    return lifetimeTotal / activeMonthsWithSpending.length;
  }, [lifetimeTotal, activeMonthsWithSpending]);

  // 3. Highest spending month
  const peakMonth = useMemo(() => {
    let max = { month: '', total: 0 };
    for (const item of monthlyAggregates.values()) {
      if (item.total > max.total) {
        max = item;
      }
    }
    return max;
  }, [monthlyAggregates]);

  // 4. Month-over-month comparison
  const priorMonthKey = useMemo(() => {
    const [y, m] = currentMonthKey.split('-').map(Number);
    const priorD = new Date(Date.UTC(y, m - 2, 15));
    return priorD.toISOString().slice(0, 7);
  }, [currentMonthKey]);

  const priorMonthTotal = monthlyAggregates.get(priorMonthKey)?.total || 0;

  const momDelta = useMemo(() => {
    if (priorMonthTotal <= 0) return null;
    return Math.round(((currentMonthTotal - priorMonthTotal) / priorMonthTotal) * 100);
  }, [currentMonthTotal, priorMonthTotal]);

  // 5. Largest individual expense
  const maxExpense = useMemo(() => {
    if (!validExpenses.length) return null;
    return [...validExpenses].sort(
      (a, b) => (b.amountCents || 0) - (a.amountCents || 0)
    )[0];
  }, [validExpenses]);

  // 6. Average expense size
  const averageExpenseSize = useMemo(() => {
    if (!validExpenses.length) return 0;
    return lifetimeTotal / validExpenses.length;
  }, [lifetimeTotal, validExpenses]);

  // 7. Recurring monthly total
  const recurringTotal = useMemo(() => {
    return (
      validExpenses
        .filter(t => t.isSubscription)
        .reduce((sum, t) => sum + (t.amountCents || 0), 0) / 100
    );
  }, [validExpenses]);

  return (
    <div className="v3-page v3-analytics">
      <PageHeader
        eyebrow="KNOW YOUR PATTERNS"
        title="Financial Insights"
        description="Data-driven intelligence to help you make smarter financial decisions."
      />

      {/* Primary Analytics Summary Cards Grid */}
      <div className="v3-analytics-summary-grid">
        <MetricTile
          label="This Month"
          value={inr(currentMonthTotal)}
          caption={`${monthlyAggregates.get(currentMonthKey)?.count || 0} expenses logged`}
          icon={CalendarDays}
        />
        <MetricTile
          label="Monthly Average"
          value={inr(averageMonthlySpending)}
          caption={`Across ${activeMonthsWithSpending.length || 1} active months`}
          icon={Activity}
        />
        <MetricTile
          label="Peak Month"
          value={peakMonth.total > 0 ? inr(peakMonth.total) : '—'}
          caption={peakMonth.month ? formatMonthYear(peakMonth.month) : 'More history needed'}
          icon={TrendingUp}
        />
        <MetricTile
          label="Month-over-Month"
          value={
            momDelta === null
              ? '—'
              : `${momDelta > 0 ? '+' : ''}${momDelta}%`
          }
          caption={
            priorMonthTotal > 0
              ? `${inr(Math.abs(currentMonthTotal - priorMonthTotal))} ${
                  momDelta >= 0 ? 'more' : 'less'
                } than ${formatMonthYear(priorMonthKey)}`
              : 'Requires prior month data'
          }
          icon={momDelta !== null && momDelta <= 0 ? TrendingDown : TrendingUp}
        />
      </div>

      {/* Section 1: Monthly Spending Bar Chart */}
      <section className="v3-surface" aria-label="Monthly spending overview">
        <div className="v3-chart-header-row">
          <SectionTitle
            title="Monthly Spending"
            subtitle="Aggregated expenses by their actual calendar transaction dates"
          />
          <div className="v3-range-switch" role="radiogroup" aria-label="Select chart timeframe">
            <button
              type="button"
              className={`v3-range-pill ${monthlyRange === '6' ? 'v3-range-active' : ''}`}
              onClick={() => setMonthlyRange('6')}
              aria-checked={monthlyRange === '6'}
            >
              6M
            </button>
            <button
              type="button"
              className={`v3-range-pill ${monthlyRange === '12' ? 'v3-range-active' : ''}`}
              onClick={() => setMonthlyRange('12')}
              aria-checked={monthlyRange === '12'}
            >
              12M
            </button>
            <button
              type="button"
              className={`v3-range-pill ${monthlyRange === 'all' ? 'v3-range-active' : ''}`}
              onClick={() => setMonthlyRange('all')}
              aria-checked={monthlyRange === 'all'}
            >
              All Time
            </button>
          </div>
        </div>

        <div className="v3-analytics-chart v3-chart-long">
          {validExpenses.length ? (
            <Bar data={monthlyBarData} options={monthlyBarOptions} />
          ) : (
            <EmptyState
              icon={ChartNoAxesCombined}
              title="Nothing to chart yet"
              description="Track your first expense to begin visualizing your monthly spending."
            />
          )}
        </div>
      </section>

      {/* Section 2: All-Time Spending Progression Chart */}
      <section className="v3-surface" aria-label="All-time cumulative spending">
        <div className="v3-chart-header-row">
          <div>
            <SectionTitle
              title="All-Time Spending"
              subtitle="Cumulative progression of your total spending over your entire history"
            />
          </div>
          <div className="v3-alltime-badge">
            <span className="v3-overline">Lifetime total</span>
            <strong>{inr(lifetimeTotal)}</strong>
          </div>
        </div>

        <div className="v3-analytics-chart v3-chart-long">
          {validExpenses.length ? (
            <Line data={allTimeChartData} options={allTimeChartOptions} />
          ) : (
            <EmptyState
              icon={Wallet}
              title="No all-time history"
              description="Log your expenses to see how your spending progresses over time."
            />
          )}
        </div>
      </section>

      {/* Section 3: Category Distribution & Daily Rhythms */}
      <div className="v3-analytics-grid">
        <section className="v3-surface" aria-label="Category spending breakdown">
          <SectionTitle
            title="Where It Goes"
            subtitle="Category allocation across all recorded expenses"
          />
          <div className="v3-analytics-chart">
            {categoryTotals.length ? (
              <Doughnut
                data={categoryDoughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '68%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: colors.text,
                        usePointStyle: true,
                        padding: 14,
                        boxWidth: 8,
                      },
                    },
                    tooltip: {
                      backgroundColor: colors.surface,
                      titleColor: colors.text,
                      bodyColor: colors.text,
                      padding: 12,
                      callbacks: {
                        label: ctx => {
                          const val = ctx.parsed;
                          const pct =
                            lifetimeTotal > 0
                              ? Math.round((val / lifetimeTotal) * 100)
                              : 0;
                          return `${ctx.label}: ${inr(val)} (${pct}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            ) : (
              <EmptyState
                icon={PieChart}
                title="No category data"
                description="Categorize your expenses to see spending distributions."
              />
            )}
          </div>
        </section>

        <section className="v3-surface" aria-label="14-day spending rhythm">
          <SectionTitle
            title="Daily Rhythm"
            subtitle="Daily spending amounts over the past 14 days"
          />
          <div className="v3-analytics-chart">
            <Line
              data={dailyLineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: colors.surface,
                    titleColor: colors.text,
                    bodyColor: colors.text,
                    padding: 12,
                    callbacks: {
                      label: ctx => `Spent: ${inr(ctx.parsed.y)}`,
                    },
                  },
                },
                scales: {
                  x: { ...axis, grid: { display: false } },
                  y: { ...axis, beginAtZero: true },
                },
              }}
            />
          </div>
        </section>
      </div>

      {/* Section 4: Calculated Key Observations & Financial Facts */}
      {validExpenses.length > 0 && (
        <section className="v3-surface v3-insights-callout" aria-label="Financial observations">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-sage" />
            <h3 className="font-display font-semibold text-base tracking-tight text-cream">
              Spending Rhythm & Observations
            </h3>
          </div>
          <div className="v3-insights-facts-grid">
            <div className="v3-fact-card">
              <span className="v3-fact-label">Average Expense Size</span>
              <strong>{inr(averageExpenseSize)}</strong>
              <span className="v3-fact-caption">Across {validExpenses.length} logged items</span>
            </div>
            {maxExpense && (
              <div className="v3-fact-card">
                <span className="v3-fact-label">Highest Single Expense</span>
                <strong>{inr((maxExpense.amountCents || 0) / 100)}</strong>
                <span className="v3-fact-caption truncate" title={maxExpense.description}>
                  “{maxExpense.description}” ({maxExpense.date})
                </span>
              </div>
            )}
            {categoryTotals.length > 0 && (
              <div className="v3-fact-card">
                <span className="v3-fact-label">Top Spending Category</span>
                <strong>{getCategoryName(categoryTotals[0][0], categoryOptions)}</strong>
                <span className="v3-fact-caption">
                  {inr(categoryTotals[0][1])} (
                  {lifetimeTotal > 0
                    ? Math.round((categoryTotals[0][1] / lifetimeTotal) * 100)
                    : 0}
                  % of total)
                </span>
              </div>
            )}
            <div className="v3-fact-card">
              <span className="v3-fact-label">Recurring Expenses</span>
              <strong>{inr(recurringTotal)}</strong>
              <span className="v3-fact-caption">
                {validExpenses.filter(t => t.isSubscription).length} recurring subscriptions
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
