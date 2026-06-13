import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { LangProvider } from './context/LangContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <LangProvider>
          <App />
        </LangProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
