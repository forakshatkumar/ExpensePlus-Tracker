import { useMemo } from 'react';
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
import { getCategoryName, dateToday, inr } from '../lib/format';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/finance/SectionTitle';
import MetricTile from '../components/finance/MetricTile';
import EmptyState from '../components/ui/EmptyState';
import { ChartNoAxesCombined, Activity, CalendarDays } from 'lucide-react';

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
  const { transactions, categories: categoryOptions } = useAppData();
  const { themeId, mode } = useTheme();
  const colors = getChartTheme(themeId, mode);
  const palette = [colors.secondary, colors.accent, colors.tertiary, '#C7A18C', '#77968F', '#B6B28B'];
  const axis = { grid: { color: colors.grid }, border: { display: false }, ticks: { color: colors.text, maxTicksLimit: 5 } };

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: colors.text,
          usePointStyle: true,
          padding: 17,
          boxHeight: 7,
          boxWidth: 7,
        },
      },
      tooltip: {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.text,
        padding: 12,
        callbacks: {
          label: ctx => `${ctx.dataset.label || ctx.label}: ${inr(ctx.parsed?.y ?? ctx.parsed)}`,
        },
      },
    },
  };

  const now = dateToday();
  const currentMonthKey = now.slice(0, 7);
  const monthly = transactions.filter(t => t.date?.startsWith(currentMonthKey));
  const monthlyTotal = monthly.reduce((s, t) => s + (t.amountCents || 0), 0) / 100;

  const categories = useMemo(
    () =>
      Object.entries(
        transactions.reduce((s, t) => {
          s[t.categoryId] = (s[t.categoryId] || 0) + (t.amountCents || 0) / 100;
          return s;
        }, {})
      ).sort((a, b) => b[1] - a[1]),
    [transactions]
  );

  // Aggregate all expenses within each calendar month using actual transaction dates
  const totals = useMemo(
    () =>
      transactions.reduce((acc, t) => {
        const month = t.date?.slice(0, 7);
        if (month && /^\d{4}-\d{2}$/.test(month)) {
          acc[month] = (acc[month] || 0) + (t.amountCents || 0) / 100;
        }
        return acc;
      }, {}),
    [transactions]
  );

  const monthValue = m => totals[m] || 0;

  // Compute chronological month list from oldest to newest based on transaction dates
  const monthlyMonths = useMemo(() => {
    const monthKeys = new Set(Object.keys(totals));
    monthKeys.add(currentMonthKey);

    const sortedMonths = Array.from(monthKeys).sort();
    const minMonth = sortedMonths[0];
    const maxMonth = sortedMonths[sortedMonths.length - 1];

    const [minY, minM] = minMonth.split('-').map(Number);
    const [maxY, maxM] = maxMonth.split('-').map(Number);
    const spanMonths = (maxY - minY) * 12 + (maxM - minM) + 1;

    let startY = minY;
    let startM = minM;

    // Display at least 6 continuous months ending at the latest recorded/current month
    if (spanMonths < 6) {
      const d = new Date(`${maxMonth}-15T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - 5);
      startY = d.getUTCFullYear();
      startM = d.getUTCMonth() + 1;
    } else if (spanMonths > 12) {
      // Display the most recent 12 continuous months for readability
      const d = new Date(`${maxMonth}-15T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - 11);
      startY = d.getUTCFullYear();
      startM = d.getUTCMonth() + 1;
    }

    const list = [];
    let curY = startY;
    let curM = startM;
    const totalSteps = (maxY - curY) * 12 + (maxM - curM) + 1;
    for (let i = 0; i < totalSteps; i++) {
      list.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return list;
  }, [totals, currentMonthKey]);

  const hasMultipleYears = useMemo(() => {
    return new Set(monthlyMonths.map(m => m.slice(0, 4))).size > 1;
  }, [monthlyMonths]);

  const monthLabel = m => {
    const d = new Date(`${m}-15T12:00:00Z`);
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      ...(hasMultipleYears ? { year: '2-digit' } : {}),
      timeZone: 'UTC',
    });
  };

  const monthsData = {
    labels: monthlyMonths.map(monthLabel),
    datasets: [
      {
        label: 'Spending',
        data: monthlyMonths.map(monthValue),
        backgroundColor: colors.accent,
        borderRadius: 6,
        maxBarThickness: 34,
      },
    ],
  };

  const barOpts = {
    ...opts,
    plugins: {
      ...opts.plugins,
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.text,
        padding: 12,
        callbacks: {
          title: items => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const m = monthlyMonths[idx];
            return new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-IN', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            });
          },
          label: ctx => `Monthly spending: ${inr(ctx.parsed?.y ?? ctx.parsed)}`,
        },
      },
    },
    scales: {
      x: { ...axis, grid: { display: false } },
      y: { ...axis, beginAtZero: true },
    },
  };

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${now}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i - 13);
    return d.toISOString().slice(0, 10);
  });

  const dayTotals = useMemo(
    () =>
      transactions.reduce((acc, t) => {
        acc[t.date] = (acc[t.date] || 0) + (t.amountCents || 0) / 100;
        return acc;
      }, {}),
    [transactions]
  );

  const dailyData = {
    labels: last14.map(d => d.slice(5)),
    datasets: [
      {
        label: 'Daily spending',
        data: last14.map(d => dayTotals[d] || 0),
        borderColor: colors.secondary,
        backgroundColor: colors.secondary + '16',
        pointBackgroundColor: colors.secondary,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 12,
        tension: 0.33,
        borderWidth: 2.5,
        fill: true,
      },
    ],
  };

  const pie = {
    labels: categories.map(([id]) => getCategoryName(id, categoryOptions)),
    datasets: [
      {
        label: 'Spending',
        data: categories.map(([, n]) => n),
        backgroundColor: palette,
        borderWidth: 3,
        borderColor: colors.surface,
      },
    ],
  };

  const dayOfMonth = Number(now.slice(8)) || 1;
  const avg = monthlyTotal / dayOfMonth;
  const prior = monthlyMonths.at(-2);
  const prevMonth = prior ? monthValue(prior) : 0;
  const delta = prevMonth > 0 ? Math.round(((monthlyTotal - prevMonth) / prevMonth) * 100) : null;

  return (
    <div className="v3-page v3-analytics">
      <PageHeader
        eyebrow="KNOW YOUR PATTERNS"
        title="Insights"
        description="See what's changing, and make better decisions."
      />
      <div className="v3-analytics-summary">
        <MetricTile label="This month" value={inr(monthlyTotal)} caption="Spending so far" icon={CalendarDays} />
        <MetricTile label="Daily average" value={inr(avg)} caption="This calendar month so far" icon={Activity} />
        <MetricTile
          label="Compared to last month"
          value={delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}%`}
          caption={delta === null ? 'More history needed' : 'Month-to-date vs full prior month'}
          icon={ChartNoAxesCombined}
        />
      </div>

      <section className="v3-surface">
        <SectionTitle
          title="The big picture"
          subtitle="Monthly spending totals across your recorded timeline"
        />
        <div className="v3-analytics-chart v3-chart-long">
          {transactions.length ? (
            <Bar data={monthsData} options={barOpts} />
          ) : (
            <EmptyState
              icon={ChartNoAxesCombined}
              title="Nothing to chart yet"
              description="Track your first expense to see your monthly spending picture."
            />
          )}
        </div>
      </section>

      <div className="v3-analytics-grid">
        <section className="v3-surface">
          <SectionTitle title="Where it goes" subtitle="Category breakdown · all recorded expenses" />
          <div className="v3-analytics-chart">
            {categories.length ? (
              <Doughnut
                data={pie}
                options={{
                  ...opts,
                  cutout: '70%',
                  plugins: {
                    ...opts.plugins,
                    tooltip: {
                      ...opts.plugins.tooltip,
                      callbacks: { label: ctx => `${ctx.label}: ${inr(ctx.parsed)}` },
                    },
                  },
                }}
              />
            ) : (
              <EmptyState
                icon={ChartNoAxesCombined}
                title="Nothing to break down"
                description="Your categories will appear after the first expense."
              />
            )}
          </div>
        </section>

        <section className="v3-surface">
          <SectionTitle title="Day by day" subtitle="A closer look at the past 14 days" />
          <div className="v3-analytics-chart">
            <Line
              data={dailyData}
              options={{
                ...opts,
                plugins: { ...opts.plugins, legend: { display: false } },
                scales: { x: { ...axis, grid: { display: false } }, y: { ...axis, beginAtZero: true } },
              }}
            />
          </div>
        </section>
      </div>

      {categories.length > 0 && (
        <div className="v3-insight-foot">
          <span className="v3-insight-bullet" />
          Your largest category so far is{' '}
          <strong>{getCategoryName(categories[0][0], categoryOptions)}</strong>, with{' '}
          <strong>{inr(categories[0][1])}</strong> recorded.
        </div>
      )}
    </div>
  );
}
