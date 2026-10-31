import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SAMPLE_PROGRAMS } from '@shared/constants.js'
import { parseProgram } from '../sim/parser.js'
import { runSimulation } from '../api/client.js'

export const SPEEDS = [
  { label: '0.5×', ms: 1400 },
  { label: '1×', ms: 700 },
  { label: '2×', ms: 350 },
  { label: '4×', ms: 160 },
]

export function useSimulation() {
  const [source, setSource] = useState(SAMPLE_PROGRAMS[0].source)
  const [assembled, setAssembled] = useState(null)
  const [options, setOptions] = useState({ mode: 'pipeline', forwarding: false, issueWidth: 0 })
  const [result, setResult] = useState(null)
  const [cycle, setCycle] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEEDS[1].ms)
  const [runError, setRunError] = useState(null)
  const requestId = useRef(0)
  const assembledRef = useRef(null)
  assembledRef.current = assembled

  const errors = useMemo(() => parseProgram(source).errors, [source])
  const dirty = assembled !== null && source !== assembled

  const simulate = useCallback(async (src, opts, keepCycle) => {
    const id = ++requestId.current
    try {
      const res = await runSimulation(src, opts)
      if (id !== requestId.current) return
      if (res.errors?.length) {
        setRunError(res.errors[0].message)
        return
      }
      setRunError(null)
      setResult(res)
      setAssembled(src)
      const last = res.snapshots.length - 1
      setCycle((c) => (keepCycle ? Math.min(c, last) : 0))
      if (!keepCycle) setPlaying(false)
    } catch (e) {
      if (id === requestId.current) setRunError(e.message)
    }
  }, [])

  // Re-run when options change, keeping the clock where it is so variants can be compared.
  useEffect(() => {
    simulate(assembledRef.current ?? source, options, assembledRef.current !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, simulate])

  const assemble = useCallback(() => {
    if (errors.length) return
    simulate(source, options, false)
  }, [errors, source, options, simulate])

  const loadSample = useCallback((sample) => {
    setSource(sample.source)
    simulate(sample.source, options, false)
  }, [options, simulate])

  const lastCycle = result ? result.snapshots.length - 1 : 0
  const snapshot = result?.snapshots[Math.min(cycle, lastCycle)] ?? null

  useEffect(() => {
    if (!playing) return
    if (cycle >= lastCycle) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setCycle((c) => Math.min(c + 1, lastCycle)), speed)
    return () => clearTimeout(t)
  }, [playing, cycle, lastCycle, speed])

  const stepForward = useCallback(() => { setPlaying(false); setCycle((c) => Math.min(c + 1, lastCycle)) }, [lastCycle])
  const stepBack = useCallback(() => { setPlaying(false); setCycle((c) => Math.max(c - 1, 0)) }, [])
  const reset = useCallback(() => { setPlaying(false); setCycle(0) }, [])
  const toEnd = useCallback(() => { setPlaying(false); setCycle(lastCycle) }, [lastCycle])
  const seek = useCallback((c) => setCycle(Math.max(0, Math.min(c, lastCycle))), [lastCycle])
  const togglePlay = useCallback(() => {
    if (playing) return setPlaying(false)
    if (cycle >= lastCycle) setCycle(0)
    setPlaying(true)
  }, [playing, cycle, lastCycle])

  return {
    source, setSource, errors, dirty, assemble, loadSample, runError,
    options, setOptions,
    result, snapshot, cycle, lastCycle,
    playing, speed, setSpeed,
    stepForward, stepBack, reset, toEnd, seek, togglePlay,
  }
}
