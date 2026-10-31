// Local mirror of the pipeline + hazard units (Members 3 & 4).
// Classic in-order 5-stage pipeline, register file written in the first half of
// a cycle and read in the second, hazards resolved by stalling in ID.
import { STAGES } from '@shared/constants.js'
import { zeroRegisters } from './parser.js'

const MAX_CYCLES = 2000
const EMPTY = { IF: null, ID: null, EX: null, MEM: null, WB: null }

const real = (slot) => (slot && !slot.bubble ? slot : null)

export function simulatePipeline(instructions, { forwarding = false } = {}) {
  const n = instructions.length
  const byId = (id) => instructions[id - 1]
  const writerOf = (slot, reg) => {
    const s = real(slot)
    return s && byId(s.id).dest === reg ? s : null
  }

  let occ = EMPTY
  let pc = 0
  let registers = zeroRegisters()
  let memory = {}
  let output = []
  let completed = 0
  let totalStalls = 0
  let totalForwards = 0
  const timing = {}

  const snapshots = [{
    cycle: 0, pc: 0, stages: EMPTY, registers, memory, output,
    events: [{ kind: 'info', text: `Program loaded — ${n} instruction${n === 1 ? '' : 's'}, registers cleared` }],
    hazards: [], forwards: [], changedRegs: [], changedMem: [],
    completed: 0, stalls: 0, forwardCount: 0,
  }]

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    const next = { WB: occ.MEM, MEM: occ.EX }
    const events = []
    const hazards = []
    const forwards = []

    // Hazard detection: without forwarding, the instruction in ID must wait until
    // every producer it depends on has reached WB.
    const decoding = real(occ.ID)
    if (decoding && !forwarding) {
      for (const reg of byId(decoding.id).srcs) {
        for (const stage of ['EX', 'MEM']) {
          const producer = writerOf(occ[stage], reg)
          if (producer) {
            hazards.push({ reg, consumer: decoding.id, producer: producer.id, producerStage: stage === 'EX' ? 'MEM' : 'WB' })
            break
          }
        }
      }
    }

    if (hazards.length) {
      next.EX = { bubble: true, bid: cycle, cause: decoding.id }
      next.ID = { id: decoding.id, stalled: true }
      next.IF = occ.IF ? { id: occ.IF.id, stalled: true } : null
      totalStalls++
      for (const h of hazards) {
        events.push({ kind: 'stall', text: `#${h.consumer} stalls in ID — needs ${h.reg} from #${h.producer}` })
      }
    } else {
      next.EX = occ.ID ? { id: occ.ID.id } : null
      next.ID = occ.IF ? { id: occ.IF.id } : null
      next.IF = pc < n ? { id: ++pc } : null
      if (next.IF) events.push({ kind: 'fetch', text: `Fetch #${next.IF.id}  ${byId(next.IF.id).text}` })
    }

    if (STAGES.every((s) => !real(next[s])) && pc >= n) break

    const executing = real(next.EX)
    if (executing && forwarding) {
      for (const reg of byId(executing.id).srcs) {
        const fromMem = writerOf(next.MEM, reg)
        const fromWb = !fromMem && writerOf(next.WB, reg)
        const producer = fromMem || fromWb
        if (producer) {
          const path = fromMem ? 'EX/MEM → EX' : 'MEM/WB → EX'
          forwards.push({ reg, producer: producer.id, consumer: executing.id, from: fromMem ? 'MEM' : 'WB', path })
          events.push({ kind: 'fwd', text: `${reg} forwarded ${path}  (#${producer.id} → #${executing.id})` })
        }
      }
      totalForwards += forwards.length
    }

    const changedRegs = []
    const changedMem = []
    const memSlot = real(next.MEM)
    if (memSlot && byId(memSlot.id).op === 'STORE') {
      const inst = byId(memSlot.id)
      memory = { ...memory, [inst.addr]: inst.value }
      changedMem.push(inst.addr)
      events.push({ kind: 'mem', text: `MEM[${inst.addr}] ← ${inst.value}  (#${inst.id})` })
    }

    const wbSlot = real(next.WB)
    if (wbSlot) {
      const inst = byId(wbSlot.id)
      completed++
      if (inst.dest) {
        registers = { ...registers, [inst.dest]: inst.value }
        changedRegs.push(inst.dest)
        events.push({ kind: 'wb', text: `${inst.dest} ← ${inst.value}  (#${inst.id} retired)` })
      } else if (inst.op === 'OUT') {
        output = [...output, { cycle, id: inst.id, reg: inst.srcs[0], value: inst.value }]
        events.push({ kind: 'out', text: `OUT ${inst.srcs[0]} = ${inst.value}  (#${inst.id} retired)` })
      } else {
        events.push({ kind: 'retire', text: `#${inst.id} retired` })
      }
    }

    for (const stage of STAGES) {
      const slot = real(next[stage])
      if (slot) (timing[slot.id] ??= {})[cycle] = { stage, stalled: !!slot.stalled }
    }

    snapshots.push({
      cycle, pc, stages: next, registers, memory, output, events, hazards, forwards,
      changedRegs, changedMem, completed, stalls: totalStalls, forwardCount: totalForwards,
    })
    occ = next
  }

  const last = snapshots[snapshots.length - 1]
  last.events.push({ kind: 'done', text: `Pipeline drained — ${n} instructions in ${last.cycle} cycles` })

  return {
    mode: 'pipeline',
    options: { forwarding },
    instructions,
    snapshots,
    timing,
    summary: {
      cycles: last.cycle,
      instructions: n,
      stalls: totalStalls,
      forwards: totalForwards,
      cpi: n ? last.cycle / n : 0,
      unpipelined: n * STAGES.length,
      speedup: last.cycle ? (n * STAGES.length) / last.cycle : 0,
    },
  }
}
