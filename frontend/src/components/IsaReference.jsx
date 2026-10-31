import { ISA, REGISTER_COUNT } from '@shared/constants.js'
import { Icon } from './ui.jsx'

export function IsaReference() {
  return (
    <details className="panel isa">
      <summary className="panel-head">
        <h2 className="panel-title">Instruction set</h2>
        <span className="panel-meta">{Object.keys(ISA).length} ops · R0–R{REGISTER_COUNT - 1}</span>
        <span className="isa-chevron"><Icon name="chevron" size={14} /></span>
      </summary>
      <div className="panel-body">
        <table className="isa-table">
          <tbody>
            {Object.entries(ISA).map(([op, spec]) => (
              <tr key={op}>
                <td><code className="tk-op">{op}</code></td>
                <td><code>{spec.syntax.replace(/^\w+\s/, '')}</code></td>
                <td className="muted"><code>{spec.semantics}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">One instruction per line. Comments start with <code>#</code> or <code>;</code>. Numbers may be decimal or <code>0x</code> hex.</p>
      </div>
    </details>
  )
}
