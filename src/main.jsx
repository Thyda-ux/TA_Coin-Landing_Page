import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase'

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    if (!data?.session) {
      supabase.auth.signInAnonymously().catch((err) => {
        if (import.meta.env.DEV) console.warn('Anonymous sign-in failed:', err);
      });
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
