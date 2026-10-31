import { useEffect, useRef, useState } from 'react'
import { Panel, Toggle, stageVar } from './ui.jsx'

export function TimingGrid({ result, cycle, onSeek }) {
  const [showAll, setShowAll] = useState(false)
  const scrollRef = useRef(null)
  const total = result.snapshots.length - 1
  const cycles = Array.from({ length: total }, (_, i) => i + 1)

  // Keep the current column in view without scrolling the page.
  useEffect(() => {
    const box = scrollRef.current
    const col = box?.querySelector('th.is-current')
    if (!box || !col) return
    const stickyW = box.querySelector('th.sticky')?.offsetWidth ?? 0
    const left = col.offsetLeft - stickyW
    const right = col.offsetLeft + col.offsetWidth
    if (left < box.scrollLeft) box.scrollLeft = left - 8
    else if (right > box.scrollLeft + box.clientWidth) box.scrollLeft = right - box.clientWidth + 8
  }, [cycle])

  return (
    <Panel
      title="Timing diagram"
      meta={`${result.instructions.length} instr × ${total} cycles`}
      className="timing-panel"
      actions={<Toggle label="Full trace" checked={showAll} onChange={setShowAll} hint="Preview future cycles" />}
    >
      <div className="timing-scroll" ref={scrollRef}>
        <table className="timing">
          <thead>
            <tr>
              <th className="sticky">Instruction</th>
              {cycles.map((c) => (
                <th key={c} className={`cyc ${c === cycle ? 'is-current' : ''} ${c > cycle ? 'is-future' : ''}`}>
                  <button onClick={() => onSeek(c)} title={`Jump to cycle ${c}`}>{c}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.instructions.map((inst) => (
              <tr key={inst.id}>
                <th className="sticky">
                  <span className="inst-id">#{inst.id}</span>
                  <code>{inst.text}</code>
                </th>
                {cycles.map((c) => {
                  const cell = result.timing[inst.id]?.[c]
                  const visible = cell && (c <= cycle || showAll)
                  return (
                    <td key={c} className={`${c === cycle ? 'is-current' : ''}`}>
                      {visible && (
                        <span className={`tcell ${cell.stalled ? 'is-stalled' : ''} ${c > cycle ? 'is-ghost' : ''}`} style={stageVar(cell.stage)} title={cell.stalled ? `${cell.stage} (stalled)` : cell.stage}>
                          {result.mode === 'parallel' ? 'EXE' : cell.stage}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
