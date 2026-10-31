import { useEffect, useMemo, useState } from 'react'
import { STAGES } from '@shared/constants.js'
import { useSimulation } from './hooks/useSimulation.js'
import { Header } from './components/Header.jsx'
import { Controls } from './components/Controls.jsx'
import { AssemblyEditor } from './components/AssemblyEditor.jsx'
import { IsaReference } from './components/IsaReference.jsx'
import { MetricsBar } from './components/MetricsBar.jsx'
import { PipelineDiagram } from './components/PipelineDiagram.jsx'
import { ParallelBoard } from './components/ParallelBoard.jsx'
import { TimingGrid } from './components/TimingGrid.jsx'
import { RegisterPanel, MemoryPanel, EventLog } from './components/StatePanels.jsx'
import { Panel } from './components/ui.jsx'
import TeammatePanel from './components/TeammatePanel.jsx'

function useShortcuts(sim) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('textarea, input, select') || e.metaKey || e.ctrlKey || e.altKey) return
      const actions = {
        ' ': sim.togglePlay,
        ArrowRight: sim.stepForward,
        ArrowLeft: sim.stepBack,
        Home: sim.reset,
        End: sim.toEnd,
        f: () => sim.options.mode === 'pipeline' && sim.setOptions((o) => ({ ...o, forwarding: !o.forwarding })),
      }
      const action = actions[e.key]
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sim])
}

export default function App() {
  const [showAiBots, setShowAiBots] = useState(false)
  const sim = useSimulation()
  const { result, snapshot } = sim
  useShortcuts(sim)

  // Which source line sits in which stage right now — drives the editor gutter.
  const stageByLine = useMemo(() => {
    const map = new Map()
    if (!result || !snapshot) return map
    if (result.mode === 'pipeline') {
      for (const s of STAGES) {
        const slot = snapshot.stages[s]
        if (slot && !slot.bubble) map.set(result.instructions[slot.id - 1].line, s)
      }
    } else {
      for (const id of snapshot.executing) map.set(result.instructions[id - 1].line, 'EX')
    }
    return map
  }, [result, snapshot])

  return (
    <div className="app">
      <Header options={sim.options} setOptions={sim.setOptions} engine={result?.engine} showAiBots={showAiBots} setShowAiBots={setShowAiBots} />
      <Controls sim={sim} />

      <main className="workspace">
        <aside className="col col-left">
          <AssemblyEditor sim={sim} stageByLine={stageByLine} />
          <IsaReference />
        </aside>

        {result && snapshot && (
          <>
            <section className="col col-center">
              <MetricsBar result={result} snapshot={snapshot} />
              {result.mode === 'pipeline' ? (
                <Panel
                  title="Pipeline datapath"
                  meta={result.options.forwarding ? 'forwarding on · EX/MEM, MEM/WB → EX' : 'forwarding off · stall on RAW'}
                  className="pipe-panel"
                >
                  <PipelineDiagram result={result} snapshot={snapshot} previous={result.snapshots[sim.cycle - 1]} speed={sim.speed} />
                </Panel>
              ) : (
                <Panel title="Parallel issue" meta={result.options.issueWidth ? `${result.options.issueWidth}-wide` : 'unbounded width'} className="pipe-panel">
                  <ParallelBoard result={result} snapshot={snapshot} />
                </Panel>
              )}
              <TimingGrid result={result} cycle={sim.cycle} onSeek={sim.seek} />

              {showAiBots && (
                <Panel title="Virtual AI Teammates" meta="Google Gemini 3.5 Flash Lite · Bot 1 & Bot 2">
                  <TeammatePanel
                    state={snapshot ? {
                      sessionId: 'local',
                      cycle: sim.cycle,
                      status: sim.cycle >= (result?.snapshots.length - 1) ? 'completed' : 'running',
                      program: result?.instructions.map(i => ({
                        id: i.id - 1,
                        line: i.line,
                        pc: i.id - 1,
                        op: i.op,
                        args: i.operands || [],
                        text: i.text
                      })),
                      registers: snapshot.registers || {},
                      memory: snapshot.memory || {},
                      events: (result?.snapshots.slice(0, sim.cycle + 1) || []).flatMap(s =>
                        (s.hazards && s.hazards.length > 0)
                          ? s.hazards.map(h => ({
                              cycle: s.cycle,
                              type: 'RAW',
                              register: h.reg,
                              producerId: h.producer - 1,
                              consumerId: h.consumer - 1,
                              reason: `#${h.consumer} stalls in ID — needs ${h.reg} from #${h.producer}`
                            }))
                          : s.events.filter(e => e.kind === 'stall').map(e => ({
                              cycle: s.cycle,
                              type: 'RAW',
                              register: 'R1',
                              reason: e.text
                            }))
                      ),
                      statistics: {
                        stalls: snapshot.stalls ?? 0,
                        cpi: snapshot.completed ? (sim.cycle / snapshot.completed) : 1,
                        instructionsCompleted: snapshot.completed ?? 0
                      }
                    } : null}
                    onLoad={(code) => {
                      sim.setSource(code)
                      sim.assemble()
                    }}
                  />
                </Panel>
              )}
            </section>

            <aside className="col col-right">
              <RegisterPanel result={result} snapshot={snapshot} />
              <MemoryPanel snapshot={snapshot} />
              <EventLog result={result} cycle={sim.cycle} />
            </aside>
          </>
        )}
      </main>

      <footer className="statusbar">
        <span><kbd>Space</kbd> run/pause</span>
        <span><kbd>←</kbd><kbd>→</kbd> step</span>
        <span><kbd>Home</kbd><kbd>End</kbd> jump</span>
        <span><kbd>F</kbd> forwarding</span>
        <span><kbd>⌘↵</kbd> assemble</span>
      </footer>
    </div>
  )
}
