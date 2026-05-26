import React from 'react'

/* ── Button ─────────────────────────────────────────────────────────────────── */
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', icon, ...props }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

  const variants = {
    primary:  'bg-accent text-bg-base border-accent hover:bg-accent-dim',
    secondary:'bg-transparent text-text-primary border-border hover:bg-hover',
    ghost:    'bg-transparent text-text-secondary border-transparent hover:bg-hover hover:text-text-primary',
    danger:   'bg-transparent text-accent-red border-accent-red hover:bg-red-900/20',
    success:  'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  const style = {
    '--tw-bg-accent': 'var(--accent)',
    '--tw-text-bg-base': 'var(--bg-base)',
  }

  const cls = `${base} ${className}`

  const variantStyles = {
    primary:  { background: 'var(--accent)', color: '#0d1117', border: '1px solid var(--accent)' },
    secondary:{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    ghost:    { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
    danger:   { background: 'transparent', color: 'var(--accent-red)', border: '1px solid var(--accent-red)' },
    success:  { background: 'rgba(0,255,136,0.1)', color: 'var(--accent)', border: '1px solid rgba(0,255,136,0.3)' },
  }

  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '0.8rem' },
    md: { padding: '8px 16px', fontSize: '0.875rem' },
    lg: { padding: '10px 20px', fontSize: '1rem' },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        fontFamily: 'var(--font-sans)', fontWeight: 500,
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'primary') { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.filter = 'brightness(1.1)' }
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--bg-hover)'
        if (variant === 'ghost') { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }
        if (variant === 'danger') e.currentTarget.style.background = 'rgba(255,107,107,0.1)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        Object.assign(e.currentTarget.style, variantStyles[variant], sizeStyles[size])
        e.currentTarget.style.filter = ''
      }}
      {...props}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  )
}

/* ── Card ───────────────────────────────────────────────────────────────────── */
export function Card({ children, className, style, onClick, hoverable, ...props }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        transition: hoverable ? 'all var(--transition)' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={hoverable ? e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.boxShadow = 'var(--shadow-glow)'
      } : undefined}
      onMouseLeave={hoverable ? e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = ''
      } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

/* ── Badge ──────────────────────────────────────────────────────────────────── */
export function Badge({ children, color = 'accent', size = 'sm' }) {
  const colorMap = {
    accent:  { background: 'rgba(0,255,136,0.1)',   color: 'var(--accent)',         border: 'rgba(0,255,136,0.2)' },
    blue:    { background: 'rgba(88,166,255,0.1)',   color: 'var(--accent-blue)',    border: 'rgba(88,166,255,0.2)' },
    purple:  { background: 'rgba(188,140,255,0.1)',  color: 'var(--accent-purple)',  border: 'rgba(188,140,255,0.2)' },
    orange:  { background: 'rgba(247,129,102,0.1)',  color: 'var(--accent-orange)',  border: 'rgba(247,129,102,0.2)' },
    yellow:  { background: 'rgba(227,179,65,0.1)',   color: 'var(--accent-yellow)',  border: 'rgba(227,179,65,0.2)' },
    red:     { background: 'rgba(255,107,107,0.1)',  color: 'var(--accent-red)',     border: 'rgba(255,107,107,0.2)' },
    cyan:    { background: 'rgba(57,208,216,0.1)',   color: 'var(--accent-cyan)',    border: 'rgba(57,208,216,0.2)' },
    muted:   { background: 'var(--bg-active)',       color: 'var(--text-secondary)', border: 'var(--border)' },
  }
  const c = colorMap[color] || colorMap.muted
  const sz = size === 'sm'
    ? { padding: '2px 8px', fontSize: '0.72rem' }
    : { padding: '4px 12px', fontSize: '0.8rem' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      borderRadius: '999px',
      fontWeight: 500, fontFamily: 'var(--font-mono)',
      border: `1px solid ${c.border}`,
      ...c, ...sz,
    }}>
      {children}
    </span>
  )
}

/* ── ProgressBar ────────────────────────────────────────────────────────────── */
export function ProgressBar({ value, max = 100, color = 'var(--accent)', height = 6, showLabel = false, animated = true }) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))
  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>{Math.round(pct)}%</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div style={{ background: 'var(--bg-active)', borderRadius: 999, height, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: color,
          width: `${pct}%`,
          transition: animated ? 'width 0.6s ease' : undefined,
          boxShadow: pct > 0 ? `0 0 8px ${color}44` : undefined,
        }} />
      </div>
    </div>
  )
}

/* ── Modal ──────────────────────────────────────────────────────────────────── */
export function Modal({ isOpen, onClose, title, children, width = 480 }) {
  if (!isOpen) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          width, maxWidth: '90vw', maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ color: 'var(--text-primary)' }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/* ── Spinner ────────────────────────────────────────────────────────────────── */
export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

/* ── Toast notifications ────────────────────────────────────────────────────── */
export function ToastContainer({ toasts, onRemove }) {
  const typeStyles = {
    info:    { borderColor: 'var(--accent-blue)',   icon: 'ℹ' },
    success: { borderColor: 'var(--accent)',         icon: '✓' },
    error:   { borderColor: 'var(--accent-red)',     icon: '✕' },
    warning: { borderColor: 'var(--accent-yellow)',  icon: '⚠' },
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(toast => {
        const s = typeStyles[toast.type] || typeStyles.info
        return (
          <div
            key={toast.id}
            className="fade-in"
            onClick={() => onRemove(toast.id)}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${s.borderColor}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', maxWidth: 320,
              boxShadow: 'var(--shadow-md)',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ color: s.borderColor, fontWeight: 700 }}>{s.icon}</span>
            <span style={{ color: 'var(--text-primary)' }}>{toast.message}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Input ──────────────────────────────────────────────────────────────────── */
export function Input({ value, onChange, placeholder, type = 'text', style, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: 'var(--bg-active)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-sans)',
        outline: 'none',
        transition: 'border-color var(--transition)',
        ...style,
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
      {...props}
    />
  )
}

/* ── Select ─────────────────────────────────────────────────────────────────── */
export function Select({ value, onChange, options = [], style, ...props }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        background: 'var(--bg-active)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        outline: 'none',
        ...style,
      }}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-surface)' }}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
