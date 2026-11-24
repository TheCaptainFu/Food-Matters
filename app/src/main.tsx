import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { resetLegacyData } from './storage'
import { registerServiceWorker } from './registerSW'

// Must run before App reads anything from storage.
resetLegacyData()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
