import { Icon, Segmented, pad } from './ui.jsx'
import { SPEEDS } from '../hooks/useSimulation.js'

function Scrubber({ value, max, onChange, marks }) {
  const pct = max ? (value / max) * 100 : 0
  return (
    <div className="scrubber" style={{ '--p': `${pct}%` }}>
      <div className="scrubber-track">
        <div className="scrubber-fill" />
        {max > 0 && marks.map((m) => (
          <span key={m.cycle} className={`scrubber-mark mark-${m.kind}`} style={{ left: `${(m.cycle / max) * 100}%` }} />
        ))}
      </div>
      <input type="range" min={0} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Clock cycle" />
    </div>
  )
}

export function Controls({ sim }) {
  const { cycle, lastCycle, playing, result } = sim
  const atEnd = lastCycle > 0 && cycle >= lastCycle

  const marks = (result?.snapshots ?? []).flatMap((s) =>
    s.hazards?.length ? [{ cycle: s.cycle, kind: 'stall' }] : s.forwards?.length ? [{ cycle: s.cycle, kind: 'fwd' }] : [],
  )

  return (
    <div className="transport">
      <div className="transport-buttons">
        <button className="icon-btn" onClick={sim.reset} disabled={cycle === 0} title="Reset (Home)"><Icon name="reset" /></button>
        <button className="icon-btn" onClick={sim.stepBack} disabled={cycle === 0} title="Step back (←)"><Icon name="back" /></button>
        <button className={`btn-play ${playing ? 'is-playing' : ''}`} onClick={sim.togglePlay} disabled={!result} title="Run / pause (Space)">
          <Icon name={playing ? 'pause' : 'play'} />
          <span>{playing ? 'Pause' : atEnd ? 'Replay' : 'Run'}</span>
        </button>
        <button className="btn-step" onClick={sim.stepForward} disabled={atEnd || !result} title="Step one cycle (→)">
          <Icon name="step" /><span>Step</span>
        </button>
        <button className="icon-btn" onClick={sim.toEnd} disabled={atEnd || !result} title="Run to end (End)"><Icon name="end" /></button>
      </div>

      <div className="clock" aria-live="polite">
        <i className={`clock-led ${playing ? 'live' : ''}`} key={cycle} />
        <span className="clock-label">CYCLE</span>
        <span className="clock-value">{pad(cycle)}</span>
        <span className="clock-total">/ {pad(lastCycle)}</span>
      </div>

      <Scrubber value={cycle} max={lastCycle} onChange={sim.seek} marks={marks} />

      <div className="field">
        <span>Speed</span>
        <Segmented size="sm" label="Speed" value={sim.speed} onChange={sim.setSpeed} options={SPEEDS.map((s) => ({ value: s.ms, label: s.label }))} />
      </div>
    </div>
  )
}
