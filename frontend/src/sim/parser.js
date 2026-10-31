// Local mirror of the backend parser (Member 1) so the UI runs standalone.
import { ISA, REGISTER_COUNT, MEMORY_SIZE } from '@shared/constants.js'

export const REG_RE = /^R(\d+)$/i
const NUM_RE = /^[-+]?(0x[0-9a-f]+|\d+)$/i

export function zeroRegisters() {
  const regs = {}
  for (let i = 0; i < REGISTER_COUNT; i++) regs[`R${i}`] = 0
  return regs
}

function toNumber(token) {
  const negative = token.startsWith('-')
  const value = Number(token.replace(/^[-+]/, ''))
  return negative ? -value : value
}

/** Parse source into instructions. Never throws — every bad line becomes an error entry. */
export function parseProgram(source) {
  const instructions = []
  const errors = []

  source.split('\n').forEach((raw, index) => {
    const line = index + 1
    const code = raw.replace(/[#;].*$/, '').trim()
    if (!code) return

    const [mnemonic, ...rest] = code.split(/[\s,]+/).filter(Boolean)
    const op = mnemonic.toUpperCase()
    const spec = ISA[op]
    if (!spec) {
      errors.push({ line, message: `Unknown instruction "${mnemonic}"` })
      return
    }
    if (rest.length !== spec.format.length) {
      const n = spec.format.length
      errors.push({ line, message: `${op} takes ${n} operand${n > 1 ? 's' : ''} — ${spec.syntax}` })
      return
    }

    const operands = []
    for (let i = 0; i < spec.format.length; i++) {
      const kind = spec.format[i]
      const token = rest[i].toUpperCase()
      if (kind === 'reg') {
        const m = REG_RE.exec(token)
        if (!m) {
          errors.push({ line, message: `"${rest[i]}" is not a register (R0–R${REGISTER_COUNT - 1})` })
          return
        }
        if (Number(m[1]) >= REGISTER_COUNT) {
          errors.push({ line, message: `${token} out of range — use R0–R${REGISTER_COUNT - 1}` })
          return
        }
        operands.push(`R${Number(m[1])}`)
      } else {
        if (!NUM_RE.test(token)) {
          errors.push({ line, message: `${kind === 'imm' ? 'Immediate' : 'Address'} "${rest[i]}" must be a number` })
          return
        }
        const value = toNumber(token)
        if (kind === 'addr' && (value < 0 || value >= MEMORY_SIZE)) {
          errors.push({ line, message: `Address ${value} out of range (0–${MEMORY_SIZE - 1})` })
          return
        }
        operands.push(value)
      }
    }

    const inst = { id: instructions.length + 1, line, op, operands, text: `${op} ${operands.join(', ')}` }
    if (op === 'LOAD' || op === 'LI') Object.assign(inst, { dest: operands[0], srcs: [], imm: operands[1] })
    else if (op === 'STORE') Object.assign(inst, { dest: null, srcs: [operands[0]], addr: operands[1] })
    else if (op === 'OUT') Object.assign(inst, { dest: null, srcs: [operands[0]] })
    else Object.assign(inst, { dest: operands[0], srcs: [...new Set([operands[1], operands[2]])] })
    instructions.push(inst)
  })

  return { instructions, errors }
}

const ALU = {
  ADD: { sym: '+', fn: (a, b) => (a + b) | 0 },
  SUB: { sym: '−', fn: (a, b) => (a - b) | 0 },
  MUL: { sym: '×', fn: (a, b) => Math.imul(a, b) },
  AND: { sym: '&', fn: (a, b) => (a & b) | 0 },
  OR:  { sym: '|', fn: (a, b) => (a | b) | 0 },
}

/**
 * Run the program in order once to get each instruction's architectural result.
 * Both engines preserve program-order semantics, so these values are what each
 * instruction computes no matter how it is scheduled.
 */
export function evaluate(instructions) {
  const regs = zeroRegisters()
  for (const inst of instructions) {
    if (inst.op === 'LOAD' || inst.op === 'LI') {
      inst.value = inst.imm | 0
      inst.note = `${inst.dest} ← ${inst.value}`
      regs[inst.dest] = inst.value
    } else if (ALU[inst.op]) {
      const [, rs, rt] = inst.operands
      inst.a = regs[rs]
      inst.b = regs[rt]
      inst.sym = ALU[inst.op].sym
      inst.value = ALU[inst.op].fn(inst.a, inst.b)
      inst.note = `${inst.dest} ← ${inst.a} ${inst.sym} ${inst.b} = ${inst.value}`
      regs[inst.dest] = inst.value
    } else if (inst.op === 'STORE') {
      inst.value = regs[inst.srcs[0]]
      inst.note = `MEM[${inst.addr}] ← ${inst.value}`
    } else if (inst.op === 'OUT') {
      inst.value = regs[inst.srcs[0]]
      inst.note = `OUT ${inst.srcs[0]} = ${inst.value}`
    }
  }
  return instructions
}
