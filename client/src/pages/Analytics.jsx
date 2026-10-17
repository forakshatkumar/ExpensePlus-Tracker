import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
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
  Legend
} from 'chart.js'
import { useAppData } from '../components/layout/AppLayout'
import { api } from '../lib/api'
import { categoryLabels, dateToday, inr } from '../lib/format'

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
)

const palette = [
  '#D97A62',
  '#8BA888',
  '#E0B871',
  '#C7A18C',
  '#77968F',
  '#B6B28B'
]

const axis = {
  grid: { color: '#403B3550' },
  ticks: { color: '#A59B8D', maxTicksLimit: 5 }
}

const opts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#A59B8D', usePointStyle: true } },
    tooltip: {
      callbacks: {
        label: ctx =>
          `${ctx.dataset.label || ctx.label}: ${inr(
            ctx.parsed?.y ?? ctx.parsed
          )}`
      }
    }
  }
}

export default function Analytics () {
  const { transactions } = useAppData()
  const [customCategoryNames, setCustomCategoryNames] = useState({})
  const [categoryError, setCategoryError] = useState(false)

  useEffect(() => {
    let active = true
    api('/api/categories')
      .then(result => {
        if (!active) return
        const names = Object.fromEntries(
          (result.categories || [])
            .filter(category => category.id && category.name)
            .map(category => [category.id, category.name])
        )
        setCustomCategoryNames(names)
        setCategoryError(false)
      })
      .catch(error => {
        console.error('Could not load custom category names:', error)
        if (active) setCategoryError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const getCategoryName = id =>
    customCategoryNames[id] || categoryLabels[id] || 'Custom category'

  const now = dateToday()
  const monthly = transactions.filter(t => t.date?.startsWith(now.slice(0, 7)))
  const monthlyTotal = monthly.reduce((s, t) => s + t.amountCents, 0) / 100

  const categories = useMemo(
    () =>
      Object.entries(
        transactions.reduce((totals, transaction) => {
          const id = transaction.categoryId || 'other'
          totals[id] = (totals[id] || 0) + transaction.amountCents / 100
          return totals
        }, {})
      ).sort((a, b) => b[1] - a[1]),
    [transactions]
  )

  const monthlyMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${now.slice(0, 7)}-15T12:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + i - 5)
    return d.toISOString().slice(0, 7)
  })

  const monthValue = m =>
    transactions
      .filter(t => t.date?.startsWith(m))
      .reduce((s, t) => s + t.amountCents / 100, 0)

  const monthsData = {
    labels: monthlyMonths.map(m =>
      new Date(m + '-15T12:00:00Z').toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC'
      })
    ),
    datasets: [
      {
        label: 'Spending',
        data: monthlyMonths.map(monthValue),
        backgroundColor: '#8BA888',
        borderRadius: 7,
        maxBarThickness: 42
      }
    ]
  }

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${now}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i - 13)
    return d.toISOString().slice(0, 10)
  })

  const dailyData = {
    labels: last14.map(d => d.slice(5)),
    datasets: [
      {
        label: 'Daily spending',
        data: last14.map(d =>
          transactions
            .filter(t => t.date === d)
            .reduce((s, t) => s + t.amountCents / 100, 0)
        ),
        borderColor: '#D97A62',
        backgroundColor: '#D97A6225',
        pointBackgroundColor: '#D97A62',
        pointRadius: 2,
        tension: 0.35,
        fill: true
      }
    ]
  }

  const pie = {
    labels: categories.map(([id]) => getCategoryName(id)),
    datasets: [
      {
        label: 'Spending',
        data: categories.map(([, amount]) => amount),
        backgroundColor: categories.map((_, i) => palette[i % palette.length]),
        borderWidth: 3,
        borderColor: '#24221F'
      }
    ]
  }

  const avg = monthlyTotal / Number(now.slice(8))
  const prior = monthlyMonths.at(-2)
  const prevMonth = monthValue(prior)
  const delta =
    prevMonth > 0
      ? Math.round(((monthlyTotal - prevMonth) / prevMonth) * 100)
      : null

  return (
    <div className='space-y-6'>
      <div>
        <p className='eyebrow'>Patterns worth noticing</p>
        <h1 className='page-heading'>
          Spending insights <span className='text-mustard'>✦</span>
        </h1>
        <p className='subtext'>Your story, told through numbers.</p>
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <section className='panel'>
          <p className='stat-label'>This month</p>
          <p className='stat-number'>{inr(monthlyTotal)}</p>
        </section>
        <section className='panel'>
          <p className='stat-label'>Daily average this month</p>
          <p className='stat-number'>{inr(avg)}</p>
        </section>
        <section className='panel'>
          <p className='stat-label'>Compared with last month</p>
          <p className='stat-number'>
            {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}%`}
          </p>
          <p className='mt-2 text-xs text-muted'>
            {delta === null
              ? 'More data needed'
              : 'Current month to date vs full previous month'}
          </p>
        </section>
      </div>

      <div className='grid gap-5 lg:grid-cols-2'>
        <section className='panel min-w-0'>
          <h2 className='font-display text-2xl'>By category</h2>
          <p className='mt-2 text-sm text-muted'>All recorded transactions</p>
          {categoryError && (
            <p className='mt-2 text-xs text-terracotta' role='status'>
              Custom category names could not be loaded. Please refresh the
              page.
            </p>
          )}
          {categories.length ? (
            <>
              <div className='mx-auto mt-5 h-64 max-w-sm'>
                <Doughnut
                  data={pie}
                  options={{
                    ...opts,
                    plugins: {
                      ...opts.plugins,
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => `${ctx.label}: ${inr(ctx.parsed)}`
                        }
                      }
                    }
                  }}
                />
              </div>
              <div
                className='mt-5 grid gap-2 sm:grid-cols-2'
                aria-label='Spending by category'
              >
                {categories.map(([id, amount], index) => (
                  <div
                    key={id}
                    className='flex min-w-0 items-center gap-2 text-sm'
                  >
                    <span
                      className='h-3 w-3 shrink-0 rounded-full'
                      style={{
                        backgroundColor: palette[index % palette.length]
                      }}
                      aria-hidden='true'
                    />
                    <span
                      className='min-w-0 flex-1 truncate text-muted'
                      title={getCategoryName(id)}
                    >
                      {getCategoryName(id)}
                    </span>
                    <span className='shrink-0 text-cream'>{inr(amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className='grid h-72 place-items-center text-center text-muted'>
              Start adding expenses to see your categories.
            </div>
          )}
        </section>

        <section className='panel min-w-0'>
          <h2 className='font-display text-2xl'>Six-month overview</h2>
          <p className='mt-2 text-sm text-muted'>
            Your spending, month by month
          </p>
          <div className='mt-5 h-72'>
            <Bar
              data={monthsData}
              options={{
                ...opts,
                scales: {
                  x: { ...axis, grid: { display: false } },
                  y: { ...axis, beginAtZero: true }
                }
              }}
            />
          </div>
        </section>
      </div>

      <section className='panel min-w-0'>
        <h2 className='font-display text-2xl'>Last 14 days</h2>
        <p className='mt-2 text-sm text-muted'>
          A closer look at your daily spending
        </p>
        <div className='mt-5 h-64'>
          <Line
            data={dailyData}
            options={{
              ...opts,
              plugins: { ...opts.plugins, legend: { display: false } },
              scales: {
                x: { ...axis, grid: { display: false } },
                y: { ...axis, beginAtZero: true }
              }
            }}
          />
        </div>
      </section>

      {categories.length > 0 && (
        <section className='panel'>
          <p className='eyebrow'>Biggest category</p>
          <h2 className='mt-2 font-display text-2xl'>
            {getCategoryName(categories[0][0])}
          </h2>
          <p className='mt-2 text-sm text-muted'>
            {inr(categories[0][1])} recorded across your history.
          </p>
        </section>
      )}
    </div>
  )
}
