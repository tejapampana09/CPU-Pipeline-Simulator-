const STATUS_LABEL = { executing: 'Executing', done: 'Done', ready: 'Ready', waiting: 'Waiting' }

export function ParallelBoard({ result, snapshot }) {
  const byId = (id) => result.instructions[id - 1]
  const width = result.options.issueWidth || Math.max(result.summary.peak, 1)

  return (
    <div className="par">
      <div className="lanes" style={{ gridTemplateColumns: `repeat(${Math.min(width, 6)}, minmax(0, 1fr))` }}>
        {Array.from({ length: width }, (_, lane) => {
          const id = snapshot.executing[lane]
          const inst = id && byId(id)
          return (
            <div key={lane} className={`lane ${inst ? 'is-busy' : ''}`}>
              <div className="lane-head">Unit {lane + 1}</div>
              {inst ? (
                <div key={`${snapshot.cycle}-${id}`} className="inst-card is-entering" style={{ '--c': 'var(--ex)' }}>
                  <div className="inst-top"><span className="inst-id">#{inst.id}</span></div>
                  <div className="inst-text">{inst.text}</div>
                  <div className="inst-action">{inst.note}</div>
                </div>
              ) : (
                <div className="slot-empty">idle</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="deplist">
        {result.instructions.map((inst) => {
          const status = snapshot.status[inst.id]
          return (
            <div key={inst.id} className={`dep-row st-${status}`}>
              <span className="inst-id">#{inst.id}</span>
              <code className="dep-text">{inst.text}</code>
              <span className="dep-chips">
                {inst.deps.length === 0 ? <span className="chip chip-free">independent</span> : inst.deps.map((d) => (
                  <span key={d.id} className={`chip ${snapshot.status[d.id] === 'done' || snapshot.status[d.id] === 'executing' ? 'chip-met' : ''}`} title={`${d.kind} dependency on #${d.id}`}>
                    {d.kind} #{d.id}
                  </span>
                ))}
              </span>
              <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
