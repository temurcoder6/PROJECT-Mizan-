import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/perf.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'single') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
