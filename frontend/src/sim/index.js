import { parseProgram, evaluate } from './parser.js'
import { simulatePipeline } from './pipelineEngine.js'
import { simulateParallel } from './parallelEngine.js'

export function simulate(source, { mode = 'pipeline', forwarding = false, issueWidth = 0 } = {}) {
  const { instructions, errors } = parseProgram(source)
  if (errors.length) return { errors }
  if (!instructions.length) return { errors: [{ line: 1, message: 'Program is empty — write at least one instruction' }] }
  evaluate(instructions)

  if (mode === 'parallel') return simulateParallel(instructions, { issueWidth })

  const result = simulatePipeline(instructions, { forwarding })
  // Run the other variant too so the UI can show what forwarding buys.
  const other = simulatePipeline(instructions, { forwarding: !forwarding })
  result.summary.alternate = { forwarding: !forwarding, cycles: other.summary.cycles }
  return result
}
