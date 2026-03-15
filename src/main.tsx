import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useStore } from './store/useStore'

// 저장된 다크모드 상태 즉시 적용 (깜빡임 방지)
const saved = localStorage.getItem('mindfulness-store')
if (saved) {
  try {
    const parsed = JSON.parse(saved)
    if (parsed?.state?.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  } catch {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
