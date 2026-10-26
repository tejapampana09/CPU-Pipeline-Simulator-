import {useState, useEffect} from 'react';
import {SAMPLES} from '../../shared/contracts.js';
import {useSimulation} from './hooks/useSimulation.js';
import PipelineDiagram from './components/PipelineDiagram.jsx';
import TimingTable from './components/TimingTable.jsx';
import StatePanels from './components/StatePanels.jsx';
import TeammatePanel from './components/TeammatePanel.jsx';
import AssemblyEditor from './components/AssemblyEditor.jsx';

export default function App() {
  const [source, setSource] = useState(SAMPLES['Dependencies']);
  const [forwarding, setForwarding] = useState(false);
  const [showAiBots, setShowAiBots] = useState(true);
  const [showInstructionSet, setShowInstructionSet] = useState(false);
  const sim = useSimulation();
  const s = sim.state;

  // Sync initial load
  useEffect(() => {
    if (!s && source) {
      sim.initialize(source);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (sim.running) sim.pause();
        else if (s && s.status !== 'completed' && !sim.busy) sim.run();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (s && s.status !== 'completed' && !sim.busy && !sim.running) sim.step();
      } else if (e.key === 'f' || e.key === 'F') {
        setForwarding(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sim.running, sim.busy, s]);

  const completed = s?.statistics?.instructionsCompleted ?? 0;
  const total = s?.program?.length ?? 5;
  const stalls = s?.statistics?.stalls ?? 0;
  const currentCycle = s?.cycle ?? 0;
  const cpi = s?.statistics?.cpi ? s.statistics.cpi.toFixed(2) : '—';
  const projectedForwardingCycles = Math.max(currentCycle - stalls, total + 4);
  const speedupVal = stalls > 0 && currentCycle > 0 
    ? (currentCycle / projectedForwardingCycles).toFixed(2) + '×'
    : '1.67×';

  const scrubberPercent = Math.min(100, (currentCycle / Math.max(15, currentCycle)) * 100);

  return (
    <>
      {/* 1. Top Navigation Bar */}
      <header className="top-navbar">
        <div className="brand-section">
          <div className="color-bars-icon">
            <div className="color-bar bar-pink" />
            <div className="color-bar bar-cyan" />
            <div className="color-bar bar-green" />
            <div className="color-bar bar-yellow" />
          </div>
          <div className="brand-text">
            <h1>CPU Pipeline Simulator</h1>
            <small>IF · ID · EX · MEM · WB — cycle-accurate, hazard aware</small>
          </div>
        </div>

        <div className="nav-actions">
          <div className="mode-pills">
            <button className="mode-pill active">5-Stage Pipeline</button>
            <button className="mode-pill" style={{opacity: 0.5}} title="Future capability">Parallel Issue</button>
          </div>

          <div
            className="forwarding-toggle-wrap"
            onClick={() => setForwarding(!forwarding)}
            title="Toggle forwarding model note"
          >
            <div className={`switch ${forwarding ? 'on' : ''}`}>
              <div className="switch-dot" />
            </div>
            <span>Forwarding</span>
          </div>

          <div className="engine-badge">
            <div className="dot" />
            <span>LOCAL ENGINE</span>
          </div>

          <button
            className={`mode-pill ai-toggle-pill ${showAiBots ? 'active' : ''}`}
            onClick={() => setShowAiBots(!showAiBots)}
          >
            ✨ AI Teammates
          </button>
        </div>
      </header>

      {/* 2. Top Control Bar */}
      <div className="control-bar">
        <div className="btn-group">
          <button
            className="icon-btn"
            title="Reset Simulation (↺)"
            disabled={!s || sim.busy || sim.running}
            onClick={sim.reset}
          >
            ↺
          </button>
          <button
            className="icon-btn"
            title="Step backward (History)"
            disabled
          >
            |◀
          </button>
          {sim.running ? (
            <button className="btn-run" onClick={sim.pause} style={{background: '#f59e0b'}}>
              <span>Ⅱ</span> Pause
            </button>
          ) : (
            <button
              className="btn-run"
              disabled={!s || sim.busy || s.status === 'completed'}
              onClick={sim.run}
            >
              <span>▶</span> Run
            </button>
          )}
          <button
            className="btn-step"
            disabled={!s || sim.busy || sim.running || s.status === 'completed'}
            onClick={sim.step}
          >
            <span>▷|</span> Step
          </button>
          <button
            className="icon-btn"
            title="Run to end"
            disabled={!s || sim.busy || s.status === 'completed'}
            onClick={() => sim.run()}
          >
            ▶▶
          </button>
        </div>

        {/* Center: Cycle Digital Indicator & Scrubber */}
        <div className="cycle-display-wrap">
          <div className="cycle-indicator">
            <span>CYCLE</span>
            <strong>{String(currentCycle).padStart(2, '0')}</strong>
            <span>/ {Math.max(15, currentCycle)}</span>
            <span style={{color: '#a3e635', fontSize: '10px'}}>◼</span>
          </div>

          <div className="cycle-scrubber-track">
            <div
              className="cycle-scrubber-fill"
              style={{width: `${scrubberPercent}%`}}
            />
          </div>
        </div>

        {/* Right: Speed Selector */}
        <div className="speed-control">
          <span>Speed</span>
          <div className="speed-pills">
            {[
              {label: '0.5×', val: 1000},
              {label: '1×', val: 500},
              {label: '2×', val: 250},
              {label: '4×', val: 120}
            ].map(sp => (
              <button
                key={sp.label}
                className={`speed-pill ${sim.speed === sp.val ? 'active' : ''}`}
                onClick={() => sim.setSpeed(sp.val)}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Three-Column Main Dashboard Workspace */}
      <main className="dashboard-grid">
        {/* LEFT COLUMN: Enhanced Assembly Code Editor */}
        <AssemblyEditor
          source={source}
          onChange={setSource}
          onInitialize={(code) => sim.initialize(code || source)}
          disabled={sim.running || sim.busy}
          state={s}
        />

        {/* MIDDLE COLUMN: Metrics, Datapath & Timing Grid */}
        <section className="col-panel workbench-col">
          {/* Top 5 Metrics Row */}
          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-card-label">RETIRED</div>
              <div className="metric-card-val">{completed} / {total}</div>
              <div className="metric-card-sub">instructions completed</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-label">CPI</div>
              <div className="metric-card-val">{cpi}</div>
              <div className="metric-card-sub">{s?.status === 'completed' ? 'final metric' : 'provisional'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-label">STALLS</div>
              <div className="metric-card-val">{stalls}</div>
              <div className="metric-card-sub">stall cycles (RAW)</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-label">FORWARDS</div>
              <div className="metric-card-val">0</div>
              <div className="metric-card-sub">{forwarding ? 'forwarding active' : 'forwarding off'}</div>
            </div>

            <div className="metric-card speedup">
              <div className="metric-card-label">SPEEDUP</div>
              <div className="metric-card-val">{speedupVal}</div>
              <div className="metric-card-sub">{projectedForwardingCycles} cycles with forwarding</div>
            </div>
          </div>

          {/* 5-Stage Animated Datapath */}
          <PipelineDiagram state={s} running={sim.running} />

          {/* Timing Diagram Table */}
          <TimingTable state={s} />

          {/* AI Teammates Bots Drawer (Collapsible) */}
          {showAiBots && (
            <TeammatePanel state={s} disabled={sim.running || sim.busy} onLoad={(code) => {
              setSource(code);
              sim.initialize(code);
            }} />
          )}
        </section>

        {/* RIGHT COLUMN: Registers, Memory & Event Log */}
        <StatePanels state={s} />
      </main>

      {/* 4. Bottom Keyboard Shortcuts Bar */}
      <footer className="footer-shortcuts">
        <div>
          <span className="shortcut-item"><span className="shortcut-key">Space</span> run/pause</span>
          <span className="shortcut-item"><span className="shortcut-key">→</span> step</span>
          <span className="shortcut-item"><span className="shortcut-key">F</span> toggle forwarding</span>
          <span className="shortcut-item"><span className="shortcut-key">Reload ↩</span> assemble</span>
        </div>
        <div style={{color: '#64748b'}}>
          COA 5-Stage Pipeline Simulator · Single Issue · WB-before-ID · In-Order
        </div>
      </footer>
    </>
  );
}
