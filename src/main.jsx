import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { runMigration } from './utils/migrateToMultiPantry'

// One-time data migration: copies root-level Firebase paths into
// pantries/jason/ — exits immediately if already done (idempotent).
runMigration()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
