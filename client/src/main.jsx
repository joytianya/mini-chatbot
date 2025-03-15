import React from 'react'
import ReactDOM from 'react-dom/client'
import Chat from './Chat'
import './index.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Chat />
    <ToastContainer position="bottom-right" autoClose={3000} />
  </React.StrictMode>
) 