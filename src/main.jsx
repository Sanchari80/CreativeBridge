import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { db } from './App.jsx' // App.jsx থেকে db ইম্পোর্ট করা হয়েছে
import { AppProvider } from './context/AppContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* এখানে db পাঠিয়ে দেওয়া হলো যাতে AppContext এ ডবল ইনিশিয়ালাইজেশন না হয় */}
    <AppProvider db={db}>
      <App />
    </AppProvider>
  </React.StrictMode>,
)