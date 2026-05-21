import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { rebuildDatabase } from './utils/rebuildDatabase.js'

// TEMPORARY — seeds auth records for all pantries; remove after one deploy
rebuildDatabase()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
