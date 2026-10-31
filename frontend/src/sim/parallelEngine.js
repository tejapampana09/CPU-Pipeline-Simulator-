// Dataflow model: every instruction whose dependencies have completed issues in the
// same cycle (up to the issue width). RAW, WAR and WAW orderings are preserved.
import { zeroRegisters } from './parser.js'

export function simulateParallel(instructions, { issueWidth = 0 } = {}) {
  const n = instructions.length
  const width = issueWidth > 0 ? issueWidth : Infinity
  const writes = (i) => (i.dest ? [i.dest] : [])

  for (let i = 0; i < n; i++) {
    const cur = instructions[i]
    cur.deps = []
    for (let j = 0; j < i; j++) {
      const prev = instructions[j]
      const raw = cur.srcs.some((r) => writes(prev).includes(r))
      const war = writes(cur).some((w) => prev.srcs.includes(w))
      const waw = writes(cur).some((w) => writes(prev).includes(w))
      const sameAddr = cur.op === 'STORE' && prev.op === 'STORE' && cur.addr === prev.addr
      if (raw || war || waw || sameAddr) cur.deps.push({ id: prev.id, kind: raw ? 'RAW' : war ? 'WAR' : waw ? 'WAW' : 'MEM' })
    }
  }

  const doneAt = {}
  const statusAt = (cycle) => {
    const status = {}
    for (const inst of instructions) {
      if (doneAt[inst.id] !== undefined) status[inst.id] = doneAt[inst.id] === cycle ? 'executing' : 'done'
      else status[inst.id] = inst.deps.every((d) => doneAt[d.id] !== undefined) ? 'ready' : 'waiting'
    }
    return status
  }

  let registers = zeroRegisters()
  let memory = {}
  let output = []
  let peak = 0
  const timing = {}
  const snapshots = [{
    cycle: 0, executing: [], status: statusAt(0), registers, memory, output,
    events: [{ kind: 'info', text: `Program loaded — ${n} instruction${n === 1 ? '' : 's'}, dependencies analysed` }],
    changedRegs: [], changedMem: [], completed: 0,
  }]

  for (let cycle = 1; Object.keys(doneAt).length < n; cycle++) {
    const ready = instructions.filter((i) => doneAt[i.id] === undefined && i.deps.every((d) => doneAt[d.id] !== undefined))
    const batch = ready.slice(0, width)
    const events = [{ kind: 'issue', text: `Issued ${batch.length}: ${batch.map((i) => `#${i.id}`).join(', ')}` }]
    const changedRegs = []
    const changedMem = []
    for (const inst of batch) {
      doneAt[inst.id] = cycle
      ;(timing[inst.id] ??= {})[cycle] = { stage: 'EX', stalled: false }
      if (inst.dest) {
        registers = { ...registers, [inst.dest]: inst.value }
        changedRegs.push(inst.dest)
        events.push({ kind: 'wb', text: `${inst.note}  (#${inst.id})` })
      } else if (inst.op === 'STORE') {
        memory = { ...memory, [inst.addr]: inst.value }
        changedMem.push(inst.addr)
        events.push({ kind: 'mem', text: `${inst.note}  (#${inst.id})` })
      } else {
        output = [...output, { cycle, id: inst.id, reg: inst.srcs[0], value: inst.value }]
        events.push({ kind: 'out', text: `${inst.note}  (#${inst.id})` })
      }
    }
    peak = Math.max(peak, batch.length)
    snapshots.push({
      cycle, executing: batch.map((i) => i.id), status: statusAt(cycle), registers, memory, output, events,
      changedRegs, changedMem, completed: Object.keys(doneAt).length,
    })
  }

  const cycles = snapshots.length - 1
  snapshots[cycles].events.push({ kind: 'done', text: `All ${n} instructions completed in ${cycles} cycles` })

  return {
    mode: 'parallel',
    options: { issueWidth },
    instructions,
    snapshots,
    timing,
    summary: { cycles, instructions: n, ipc: cycles ? n / cycles : 0, peak, speedup: cycles ? n / cycles : 0 },
  }
}
