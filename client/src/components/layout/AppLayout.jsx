import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useNavigate
} from 'react-router-dom'
import { Plus, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api, apiBinary } from '../../lib/api'
import { useOnlineStatus } from '../pwa/PWAProvider'
import { categoryEmoji, categoryLabels } from '../../lib/format'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import Topbar from './Topbar'
import ExpenseModal from '../expenses/ExpenseModal'
import Toast from '../ui/Toast'
export function useAppData () {
  return useOutletContext()
}
const builtInCategories = Object.entries(categoryLabels).map(([id, name]) => ({
  id,
  name,
  emoji: categoryEmoji[id]
}))
const empty = {
  profile: null,
  transactions: [],
  streak: null,
  categories: builtInCategories
}
export default function AppLayout () {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const [notifications, setNotifications] = useState([])
  const wasOnline = useRef(true)
  const [avatarUrl, setAvatarUrl] = useState('')
  const avatarRef = useRef('')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('expenseplus-sidebar-collapsed')
      return stored !== null
        ? stored === 'true'
        : window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
            .matches
    } catch {
      return false
    }
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expense, setExpense] = useState(null) // null = closed, {edit:null|transaction} = open
  const menuRef = useRef(null)
  const previousFocusRef = useRef(null)
  const notify = useCallback(
    (message, kind = 'success') => setToast({ message, kind }),
    []
  )
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const closeExpense = useCallback(() => {
    setExpense(null)
    previousFocusRef.current?.focus?.()
  }, [])
  const openExpense = useCallback(
    (edit = null) => {
      previousFocusRef.current = document.activeElement
      closeDrawer()
      setExpense({ edit })
    },
    [closeDrawer]
  )
  const refreshProfile = useCallback(async () => {
    const r = await api('/api/user/profile')
    setData(prev => ({ ...prev, profile: r.profile }))
    return r.profile
  }, [])
  const refreshTransactions = useCallback(async () => {
    const r = await api('/api/transactions')
    setData(prev => ({ ...prev, transactions: r.transactions }))
    return r.transactions
  }, [])
  const refreshStreak = useCallback(async () => {
    const r = await api('/api/streaks')
    setData(prev => ({ ...prev, streak: r }))
    return r
  }, [])
  const refreshCategories = useCallback(async () => {
    const r = await api('/api/categories')
    setData(prev => ({
      ...prev,
      categories: r.categories || builtInCategories
    }))
    return r.categories || builtInCategories
  }, [])
  const refreshNotifications = useCallback(async () => {
    const r = await api('/api/notifications')
    setNotifications(r.notifications || [])
    return r.notifications
  }, [])
  const markNotificationRead = useCallback(
    async id => {
      try {
        await api(`/api/notifications/${id}/read`, { method: 'PATCH' })
        await refreshNotifications()
      } catch (e) {
        notify(e.message, 'error')
      }
    },
    [refreshNotifications, notify]
  )
  const markNotificationsRead = useCallback(async () => {
    try {
      await api('/api/notifications/read-all', { method: 'POST' })
      await refreshNotifications()
    } catch (e) {
      notify(e.message, 'error')
    }
  }, [refreshNotifications, notify])
  const refreshAvatar = useCallback(async () => {
    const blob = await apiBinary('/api/user/avatar').catch(error => {
      if (!/No custom avatar|404/.test(error.message))
        console.warn('Avatar:', error.message)
      return null
    })
    const url = blob ? URL.createObjectURL(blob) : ''
    if (avatarRef.current) URL.revokeObjectURL(avatarRef.current)
    avatarRef.current = url
    setAvatarUrl(url)
  }, [])
  useEffect(
    () => () => {
      if (avatarRef.current) URL.revokeObjectURL(avatarRef.current)
    },
    []
  )
  useEffect(() => {
    if (avatarRef.current) URL.revokeObjectURL(avatarRef.current)
    avatarRef.current = ''
    setAvatarUrl('')
    setNotifications([])
  }, [user?.uid])
  useEffect(() => {
    if (data.profile?.hasCustomAvatar) refreshAvatar()
    else {
      if (avatarRef.current) URL.revokeObjectURL(avatarRef.current)
      avatarRef.current = ''
      setAvatarUrl('')
    }
  }, [data.profile?.hasCustomAvatar, refreshAvatar, user?.uid])
  useEffect(() => {
    if (data.profile && online)
      refreshNotifications().catch(error =>
        console.warn('Notifications:', error.message)
      )
  }, [data.profile?.createdAt, online, refreshNotifications])
  useEffect(() => {
    if (online && !wasOnline.current) {
      refreshAll().catch(error => notify(error.message, 'error'))
    }
    wasOnline.current = online
  }, [online])
  const refreshAll = useCallback(async () => {
    const [p, t, s, c] = await Promise.all([
      api('/api/user/profile'),
      api('/api/transactions'),
      api('/api/streaks'),
      // A category lookup failure must not block the dashboard and other data.
      api('/api/categories').catch(error => {
        console.warn('Could not load category names:', error)
        return { categories: builtInCategories }
      })
    ])
    setData({
      profile: p.profile,
      transactions: t.transactions,
      streak: s,
      categories: c.categories || builtInCategories
    })
  }, [])
  const refreshAfterExpense = useCallback(
    () =>
      Promise.all([
        refreshTransactions(),
        refreshStreak(),
        refreshCategories(),
        refreshNotifications()
      ]),
    [
      refreshTransactions,
      refreshStreak,
      refreshCategories,
      refreshNotifications
    ]
  )
  useEffect(() => {
    let active = true
    setLoading(true)
    refreshAll()
      .then(() => {
        if (active) setError('')
      })
      .catch(e => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [refreshAll, user?.uid])
  useEffect(() => {
    try {
      localStorage.setItem('expenseplus-sidebar-collapsed', String(collapsed))
    } catch {}
  }, [collapsed])
  useEffect(() => {
    closeDrawer()
  }, [pathname, closeDrawer])
  // Keep route changes anchored at the top, and provide a lightweight power-user shortcut.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  useEffect(() => {
    function keyboard (event) {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.repeat
      )
        return
      if (
        event.target?.closest?.(
          'input,textarea,select,[contenteditable="true"],[role="dialog"]'
        )
      )
        return
      if (event.key.toLowerCase() === 'n' && online) {
        event.preventDefault()
        openExpense()
      }
      if (event.key === '/') {
        event.preventDefault()
        if (pathname !== '/history')
          navigate('/history', { state: { focusSearch: true } })
        else document.getElementById('transaction-search')?.focus()
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => document.removeEventListener('keydown', keyboard)
  }, [openExpense, navigate, online, pathname])
  const displayProfile = data.profile
    ? {
        ...data.profile,
        profilePicture: avatarUrl || data.profile.profilePicture
      }
    : null
  const context = {
    ...data,
    avatarUrl,
    refreshProfile,
    refreshAvatar,
    refreshTransactions,
    refreshStreak,
    refreshCategories,
    refreshAll,
    refreshAfterExpense,
    refreshNotifications,
    notify,
    openExpense
  }
  return (
    <div className={`ep-app-shell ${collapsed ? 'ep-app-collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        profile={displayProfile}
        user={user}
      />
      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        returnFocusRef={menuRef}
        profile={displayProfile}
        user={user}
      />
      <div className='ep-app-content'>
        <Topbar
          onAdd={() => openExpense()}
          notifications={notifications}
          onRead={markNotificationRead}
          onReadAll={markNotificationsRead}
        />
        <main className='ep-main' id='main-content'>
          {loading ? (
            <div className='space-y-5' role='status'>
              <div className='skeleton h-20 max-w-md' />
              <div className='grid gap-5 md:grid-cols-2'>
                <div className='skeleton h-64' />
                <div className='skeleton h-64' />
              </div>
            </div>
          ) : error && !data.profile ? (
            <section className='panel mx-auto max-w-lg text-center'>
              <h2 className='font-display text-2xl'>
                Couldn't load your workspace
              </h2>
              <p className='subtext'>{error}</p>
              <button
                className='btn-primary mt-6'
                onClick={() => {
                  setLoading(true)
                  refreshAll()
                    .then(() => setError(''))
                    .catch(e => setError(e.message))
                    .finally(() => setLoading(false))
                }}
              >
                Try again
              </button>
            </section>
          ) : (
            <Suspense
              fallback={
                <div
                  className='v3-route-loading'
                  role='status'
                  aria-label='Loading page'
                >
                  <div className='skeleton h-10 w-48' />
                  <div className='skeleton h-64 w-full' />
                </div>
              }
            >
              <Outlet context={context} />
            </Suspense>
          )}
        </main>
        <footer className='px-6 pb-8 text-center text-xs text-muted'>
          ExpensePlus ✦ Track smarter. Spend wiser.
        </footer>
      </div>
      <div
        className={`v31-mobile-actions ${
          drawerOpen || expense ? 'v31-actions-hidden' : ''
        }`}
        aria-label='Mobile actions'
        aria-hidden={Boolean(drawerOpen || expense)}
        inert={Boolean(drawerOpen || expense)}
      >
        <button
          type='button'
          className='v31-mobile-add'
          onClick={() => openExpense()}
          disabled={!online}
        >
          <Plus size={19} />
        </button>
        <button
          ref={menuRef}
          type='button'
          className='v31-mobile-more'
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls='expenseplus-mobile-navigation'
        >
          <Menu size={19} />
        </button>
      </div>
      {expense && (
        <ExpenseModal
          key={expense.edit?.id || 'new'}
          edit={expense.edit}
          onClose={closeExpense}
          notify={notify}
          onSaved={refreshAfterExpense}
          categories={data.categories}
          onCategoriesChanged={refreshCategories}
          transactions={data.transactions}
          monthlyBudget={data.profile?.monthlyBudget || 0}
          online={online}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
