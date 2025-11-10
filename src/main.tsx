import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🔥 Removed StrictMode to prevent double-mounting issues with auth checks
// StrictMode in React 18 causes useEffect to run twice in development,
// which can interfere with authentication cookie handling
createRoot(document.getElementById('root')!).render(<App />)
