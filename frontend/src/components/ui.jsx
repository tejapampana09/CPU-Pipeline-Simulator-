const ICONS = {
  reset: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3 4v5h5" /></>,
  back: <><path d="M18 6 10 12l8 6V6z" /><path d="M6 6v12" /></>,
  step: <><path d="M6 6l8 6-8 6V6z" /><path d="M18 6v12" /></>,
  end: <><path d="M4 6l7 6-7 6V6z" /><path d="M12 6l7 6-7 6V6z" /></>,
  play: <path d="M7 4.8v14.4L19 12 7 4.8z" fill="currentColor" stroke="none" />,
  pause: <><rect x="6.5" y="5" width="3.6" height="14" rx=".6" fill="currentColor" stroke="none" /><rect x="13.9" y="5" width="3.6" height="14" rx=".6" fill="currentColor" stroke="none" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: <><path d="M12 8v5" /><path d="M12 16.5v.5" /><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
}

export function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

export function Panel({ title, meta, actions, className = '', children }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {meta && <span className="panel-meta">{meta}</span>}
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}

export function Segmented({ value, options, onChange, size = 'md', label }) {
  return (
    <div className={`seg seg-${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={hint}>
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span className="toggle-label">{label}</span>
    </button>
  )
}

export const stageVar = (stage) => ({ '--c': `var(--${stage.toLowerCase()})` })
export const hex = (n, width = 4) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(width, '0')
export const pad = (n, w = 2) => String(n).padStart(w, '0')
