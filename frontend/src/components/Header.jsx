import { Segmented, Toggle } from './ui.jsx'

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="4" width="10" height="4" rx="1" fill="var(--if)" />
      <rect x="7" y="10" width="10" height="4" rx="1" fill="var(--id)" />
      <rect x="12" y="16" width="10" height="4" rx="1" fill="var(--ex)" />
      <rect x="17" y="22" width="10" height="4" rx="1" fill="var(--mem)" />
      <rect x="22" y="28" width="8" height="2" rx="1" fill="var(--wb)" />
    </svg>
  )
}

export function Header({ options, setOptions, engine, showAiBots, setShowAiBots }) {
  const set = (patch) => setOptions((o) => ({ ...o, ...patch }))
  return (
    <header className="topbar">
      <div className="brand">
        <BrandMark />
        <div>
          <div className="brand-title">CPU Pipeline Simulator</div>
          <div className="brand-sub">IF · ID · EX · MEM · WB — cycle-accurate, hazard aware</div>
        </div>
      </div>

      <div className="topbar-controls">
        <Segmented
          label="Execution model"
          value={options.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: 'pipeline', label: '5-Stage Pipeline' },
            { value: 'parallel', label: 'Parallel Issue' },
          ]}
        />
        {options.mode === 'pipeline' ? (
          <Toggle
            label="Forwarding"
            checked={options.forwarding}
            onChange={(forwarding) => set({ forwarding })}
            hint="Bypass results from EX/MEM and MEM/WB straight into EX (F)"
          />
        ) : (
          <div className="field">
            <span>Issue width</span>
            <Segmented
              size="sm"
              label="Issue width"
              value={options.issueWidth}
              onChange={(issueWidth) => set({ issueWidth })}
              options={[1, 2, 4, 0].map((w) => ({ value: w, label: w || '∞' }))}
            />
          </div>
        )}
        <span className={`engine engine-${engine ?? 'local'}`} title={engine === 'backend' ? 'Results from the Express API' : 'Backend not connected — using the bundled engine'}>
          <i /> {engine === 'backend' ? 'Backend' : 'Local engine'}
        </span>
        <button
          className={`btn-ai-toggle ${showAiBots ? 'on' : ''}`}
          onClick={() => setShowAiBots(!showAiBots)}
          title="Toggle Gemini 3.5 Virtual AI Teammates (Bot 1 & Bot 2)"
        >
          ✨ AI Teammates
        </button>
      </div>
    </header>
  )
}
