import React from 'react'
import ReactDOM from 'react-dom/client'
// import Chat from './Chat' // Assuming Chat.jsx will be renamed to Chat.tsx
import Chat from './Chat.jsx' // Keep temporarily if Chat isn't renamed yet
import './index.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const rootElement = document.getElementById('root')

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Chat />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </React.StrictMode>
  )
} else {
  console.error("Failed to find the root element")
} 