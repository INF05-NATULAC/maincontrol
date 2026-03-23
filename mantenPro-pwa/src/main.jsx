import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1a2235',
            color: '#F1F5F9',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#0B0F1A' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#0B0F1A' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
