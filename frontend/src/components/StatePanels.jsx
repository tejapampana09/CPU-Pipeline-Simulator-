import { STAGES } from '@shared/constants.js'
import { Panel, hex, stageVar } from './ui.jsx'

/** Registers whose new value is still in flight, mapped to the writer and where it is. */
function pendingWrites(result, snapshot) {
  const pending = {}
  if (result.mode !== 'pipeline') return pending
  for (const stage of STAGES.slice(1, 4)) {
    const slot = snapshot.stages[stage]
    if (!slot || slot.bubble) continue
    const inst = result.instructions[slot.id - 1]
    if (inst.dest && !pending[inst.dest]) pending[inst.dest] = { id: inst.id, stage }
  }
  return pending
}

export function RegisterPanel({ result, snapshot }) {
  const pending = pendingWrites(result, snapshot)
  const changed = new Set(snapshot.changedRegs)
  return (
    <Panel title="Registers" meta="32-bit · signed">
      <div className="regs">
        {Object.entries(snapshot.registers).map(([name, value]) => {
          const p = pending[name]
          return (
            <div key={changed.has(name) ? `${name}-${snapshot.cycle}` : name} className={`reg ${changed.has(name) ? 'is-changed' : ''} ${value === 0 ? 'is-zero' : ''}`}>
              <div className="reg-top">
                <span className="reg-name">{name}</span>
                {p && <span className="reg-pending" style={stageVar(p.stage)} title={`#${p.id} will write ${name} (now in ${p.stage})`}>#{p.id} {p.stage}</span>}
              </div>
              <div className="reg-value">{value}</div>
              <div className="reg-hex">{hex(value, 8)}</div>
            </div>
          )
        })}
      </div>
      <div className="pc-row">
        <span>PC</span>
        <code>{result.mode === 'pipeline' ? hex(snapshot.pc * 4) : '—'}</code>
        <span className="muted">{result.mode === 'pipeline' && (snapshot.pc < result.instructions.length ? `next fetch #${snapshot.pc + 1}` : 'end of program')}</span>
      </div>
    </Panel>
  )
}

export function MemoryPanel({ snapshot }) {
  const entries = Object.entries(snapshot.memory).sort((a, b) => a[0] - b[0])
  const changed = new Set(snapshot.changedMem.map(String))
  return (
    <Panel title="Memory" meta={`${entries.length} word${entries.length === 1 ? '' : 's'} written`}>
      {entries.length === 0 ? (
        <div className="empty-state">No stores yet. <code>STORE</code> writes land here in the MEM stage.</div>
      ) : (
        <table className="memtable">
          <thead><tr><th>Address</th><th>Dec</th><th>Value</th></tr></thead>
          <tbody>
            {entries.map(([addr, value]) => (
              <tr key={changed.has(addr) ? `${addr}-${snapshot.cycle}` : addr} className={changed.has(addr) ? 'is-changed' : ''}>
                <td><code>{hex(Number(addr))}</code></td>
                <td className="muted">{addr}</td>
                <td className="num">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {snapshot.output.length > 0 && (
        <div className="output">
          <div className="output-head">Program output</div>
          {snapshot.output.map((o) => (
            <div key={o.id} className="output-line"><span className="muted">c{o.cycle}</span> <code>{o.reg}</code> <b>{o.value}</b></div>
          ))}
        </div>
      )}
    </Panel>
  )
}

const KIND_LABEL = { fetch: 'IF', stall: 'STALL', fwd: 'FWD', mem: 'MEM', wb: 'WB', out: 'OUT', retire: 'RET', info: 'SYS', done: 'DONE', issue: 'ISSUE' }

export function EventLog({ result, cycle }) {
  const rows = []
  for (let c = cycle; c >= 0; c--) {
    for (const e of result.snapshots[c].events) rows.push({ ...e, cycle: c })
  }
  return (
    <Panel title="Event log" meta={`cycle ${cycle}`} className="log-panel">
      <ol className="log">
        {rows.map((r, i) => (
          <li key={`${r.cycle}-${i}`} className={`log-${r.kind} ${r.cycle === cycle ? 'is-now' : ''}`}>
            <span className="log-cycle">{String(r.cycle).padStart(2, '0')}</span>
            <span className="log-kind">{KIND_LABEL[r.kind] ?? r.kind}</span>
            <span className="log-text">{r.text}</span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
