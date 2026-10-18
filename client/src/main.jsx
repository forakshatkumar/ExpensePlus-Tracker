import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const mount = document.getElementById('root')
const root = createRoot(mount)
function showStartupError (error) {
  console.error('ExpensePlus startup error:', error)
  root.render(
    <main
      style={{
        minHeight: '100vh',
        background: '#1A1917',
        color: '#E2D7C1',
        padding: '48px 20px',
        fontFamily: 'system-ui',
        display: 'grid',
        placeItems: 'center'
      }}
    >
      <section style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>
          ExpensePlus couldn’t start
        </h1>
        <p style={{ lineHeight: 1.7 }}>
          The website loaded, but an application configuration error prevented
          it from opening.
        </p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            padding: 18,
            borderRadius: 12,
            background: '#302D29',
            marginTop: 24
          }}
        >
          {String(error?.message || error)}
        </pre>
        <p style={{ fontSize: 14, opacity: 0.8 }}>
          Check the browser console and the Vercel project environment
          variables, then redeploy.
        </p>
      </section>
    </main>
  )
}

class AppErrorBoundary extends React.Component {
  constructor (props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError (error) {
    return { error }
  }
  componentDidCatch (error, info) {
    console.error('ExpensePlus render error:', error, info)
  }
  render () {
    if (!this.state.error) return this.props.children
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#1A1917',
          color: '#E2D7C1',
          padding: 40,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui'
        }}
      >
        <section style={{ maxWidth: 540 }}>
          <h1 style={{ fontSize: 30 }}>ExpensePlus encountered an error</h1>
          <p>Refresh the page or check the browser console for details.</p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              background: '#302D29',
              borderRadius: 12,
              padding: 16
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 20px',
              background: '#8BA888',
              color: '#1A1917',
              border: 0,
              borderRadius: 14,
              cursor: 'pointer'
            }}
          >
            Reload ExpensePlus
          </button>
        </section>
      </main>
    )
  }
}

try {
  document.documentElement.classList.toggle(
    'light-theme',
    localStorage.getItem('expenseplus-theme') === 'light'
  )
} catch {}

import('./bootstrap.jsx')
  .then(({ default: Application }) => {
    root.render(
      <React.StrictMode>
        <AppErrorBoundary>
          <Application />
        </AppErrorBoundary>
      </React.StrictMode>
    )
  })
  .catch(showStartupError)
