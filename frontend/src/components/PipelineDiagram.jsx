import { STAGES, STAGE_INFO } from '@shared/constants.js'
import { hex, stageVar } from './ui.jsx'

const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s, i]))

function stageAction(inst, stage, stalled) {
  switch (stage) {
    case 'IF': return stalled ? 'held — pipeline frozen' : `fetch @ ${hex((inst.id - 1) * 4)}`
    case 'ID': return stalled ? `waiting on ${inst.srcs.join(', ')}` : inst.srcs.length ? `read ${inst.srcs.join(', ')}` : 'decode immediate'
    case 'EX':
      if (inst.sym) return `${inst.a} ${inst.sym} ${inst.b} = ${inst.value}`
      if (inst.op === 'LOAD' || inst.op === 'LI') return `imm → ${inst.value}`
      if (inst.op === 'STORE') return `addr = ${inst.addr}`
      return `pass ${inst.srcs[0]}`
    case 'MEM': return inst.op === 'STORE' ? `MEM[${inst.addr}] ← ${inst.value}` : 'no access'
    case 'WB':
      if (inst.dest) return `${inst.dest} ← ${inst.value}`
      if (inst.op === 'OUT') return `out ${inst.value}`
      return 'no write'
    default: return 'retired'
  }
}

// Column geometry for a 5-column grid with a 12px gap.
const COL = '((100% - 48px) / 5)'
const colLeft = (i) => `calc(${i} * (${COL} + 12px))`
const centre = (i) => `calc(${i} * (${COL} + 12px) + ${COL} / 2)`
const span = (n) => `calc(${n} * (${COL} + 12px))`

function Link({ from, to, label, kind, row }) {
  const lo = Math.min(STAGE_INDEX[from], STAGE_INDEX[to])
  const hi = Math.max(STAGE_INDEX[from], STAGE_INDEX[to])
  return (
    <div className={`link link-${kind}`} style={{ left: centre(lo), width: span(hi - lo), top: row * 30 }}>
      <span className="link-arrow" />
      <span className="link-label">{label}</span>
    </div>
  )
}

/**
 * Cards live in one absolutely positioned layer keyed by instruction, so the same
 * DOM node slides from stage to stage via a CSS transition on `left`.
 */
function cardsFor(snapshot, previous) {
  const cards = []
  const present = new Set()
  STAGES.forEach((stage, i) => {
    const slot = snapshot.stages[stage]
    if (!slot) return
    const key = slot.bubble ? `b${slot.bid}` : `i${slot.id}`
    present.add(key)
    cards.push({ key, slot, stage, index: i })
  })
  // Whatever just left WB slides out to the right and fades.
  const retired = previous?.stages.WB
  if (retired) {
    const key = retired.bubble ? `b${retired.bid}` : `i${retired.id}`
    if (!present.has(key)) cards.push({ key, slot: retired, stage: 'WB', index: 5, leaving: true })
  }
  return cards.sort((a, b) => a.key.localeCompare(b.key))
}

export function PipelineDiagram({ result, snapshot, previous, speed }) {
  const byId = (id) => result.instructions[id - 1]
  const links = [
    ...snapshot.hazards.map((h) => ({ from: h.producerStage, to: 'ID', label: `RAW ${h.reg}`, kind: 'stall' })),
    ...snapshot.forwards.map((f) => ({ from: f.from, to: 'EX', label: `${f.reg} ⇢ EX`, kind: 'fwd' })),
  ]
  const move = `${Math.round(Math.min(480, speed * 0.6))}ms`

  return (
    <div className="pipe" style={{ '--move': move }}>
      <div className="pipe-stages">
        {STAGES.map((stage) => {
          const slot = snapshot.stages[stage]
          return (
            <div key={stage} className={`stage ${slot && !slot.bubble ? 'is-busy' : ''} ${slot?.stalled ? 'is-stalled' : ''}`} style={stageVar(stage)}>
              <div className="stage-head">
                <span className="stage-code">{stage}</span>
                <span className="stage-name">{STAGE_INFO[stage].name}</span>
              </div>
              <div className="stage-slot"><div className="slot-empty">idle</div></div>
            </div>
          )
        })}

        <div className="pipe-cards">
          {cardsFor(snapshot, previous).map(({ key, slot, stage, index, leaving }) => {
            const style = { left: colLeft(index), ...stageVar(stage) }
            if (slot.bubble) {
              return (
                <div key={key} className={`inst-card is-bubble ${leaving ? 'is-leaving' : ''}`} style={style}>
                  <div className="inst-top"><span className="inst-id">NOP</span><span className="tag tag-bubble">BUBBLE</span></div>
                  <div className="inst-text">— — —</div>
                  <div className="inst-action">inserted for #{slot.cause}</div>
                </div>
              )
            }
            const inst = byId(slot.id)
            return (
              <div key={key} className={`inst-card ${slot.stalled ? 'is-stalled' : ''} ${leaving ? 'is-leaving' : ''}`} style={style}>
                <div className="inst-top">
                  <span className="inst-id">#{inst.id}</span>
                  {slot.stalled && <span className="tag tag-stall">STALL</span>}
                </div>
                <div className="inst-text">{inst.text}</div>
                <div className="inst-action">{stageAction(inst, leaving ? null : stage, slot.stalled)}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pipe-links" style={{ height: Math.max(1, links.length) * 30 }}>
        {links.map((l, i) => <Link key={i} {...l} row={i} />)}
      </div>

      <div className="callouts">
        {snapshot.cycle === 0 ? (
          <span className="callout muted">Clock stopped. Press <kbd>→</kbd> to step or <kbd>Space</kbd> to run.</span>
        ) : links.length === 0 ? (
          <span className="callout muted">No hazards this cycle — every stage advanced.</span>
        ) : null}
        {snapshot.hazards.map((h, i) => (
          <span key={`h${i}`} className="callout">
            <span className="tag tag-stall">STALL</span>
            #{h.consumer} <code>{byId(h.consumer).text}</code> needs <b>{h.reg}</b> from #{h.producer} (now in {h.producerStage}) → bubble into EX
          </span>
        ))}
        {snapshot.forwards.map((f, i) => (
          <span key={`f${i}`} className="callout">
            <span className="tag tag-fwd">FORWARD</span>
            <b>{f.reg}</b> = {byId(f.producer).value} via {f.path} (#{f.producer} → #{f.consumer})
          </span>
        ))}
      </div>
    </div>
  )
}
