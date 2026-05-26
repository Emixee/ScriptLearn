import React from 'react'
import Sidebar from './Sidebar'
import useAppStore from '../../store/useAppStore'
import { ToastContainer } from '../UI'

export default function Layout({ children }) {
  const { toasts, removeToast } = useAppStore()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </div>
      </main>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
