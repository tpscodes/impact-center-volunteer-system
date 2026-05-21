import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { rebuildDatabase } from './utils/rebuildDatabase'

// TEMPORARY — remove once the database looks correct.
rebuildDatabase()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
