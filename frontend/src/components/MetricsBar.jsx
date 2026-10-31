function Metric({ label, value, sub, tone }) {
  return (
    <div className={`metric ${tone ? `tone-${tone}` : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  )
}

export function MetricsBar({ result, snapshot }) {
  const { summary } = result
  const n = summary.instructions
  const progress = n ? snapshot.completed / n : 0
  const finished = snapshot.cycle === summary.cycles

  if (result.mode === 'parallel') {
    return (
      <div className="metrics">
        <Metric label="Completed" value={<>{snapshot.completed}<small>/{n}</small></>} sub={<span className="bar"><i style={{ width: `${progress * 100}%` }} /></span>} />
        <Metric label="This cycle" value={snapshot.executing.length} sub="issued together" />
        <Metric label="IPC" value={summary.ipc.toFixed(2)} sub={`${summary.cycles} cycles total`} />
        <Metric label="Peak width" value={summary.peak} sub="instructions / cycle" />
        <Metric label="Speedup" value={`${summary.speedup.toFixed(2)}×`} sub="vs. 1 instr / cycle" tone="accent" />
      </div>
    )
  }

  const alt = summary.alternate
  const saved = alt && alt.forwarding === false ? alt.cycles - summary.cycles : 0
  return (
    <div className="metrics">
      <Metric label="Retired" value={<>{snapshot.completed}<small>/{n}</small></>} sub={<span className="bar"><i style={{ width: `${progress * 100}%` }} /></span>} />
      <Metric
        label="CPI"
        value={snapshot.completed === 0 ? '—' : (snapshot.cycle / snapshot.completed).toFixed(2)}
        sub={finished ? `${summary.cycles} cycles total` : snapshot.completed === 0 ? 'nothing retired yet' : 'cycles / retired'}
      />
      <Metric label="Stalls" value={snapshot.stalls} sub={`of ${summary.stalls} total`} tone={snapshot.stalls ? 'danger' : undefined} />
      <Metric label="Forwards" value={snapshot.forwardCount} sub={result.options.forwarding ? `of ${summary.forwards} total` : 'forwarding off'} tone={snapshot.forwardCount ? 'accent' : undefined} />
      <Metric
        label="Speedup"
        value={`${summary.speedup.toFixed(2)}×`}
        sub={alt ? (alt.forwarding ? `${alt.cycles} cycles with forwarding` : saved > 0 ? `saves ${saved} cycles vs. no fwd` : `no-fwd: ${alt.cycles} cycles`) : 'vs. unpipelined'}
        tone="accent"
      />
    </div>
  )
}
