import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { db } from './App.jsx'
import { AppProvider } from './context/AppContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider db={db}>
      <App />
    </AppProvider>
  </React.StrictMode>,
)