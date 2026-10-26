import {useState, useRef, useEffect} from 'react';
import {SAMPLES} from '../../../shared/contracts.js';
import {detectLegacySyntax, transpileToPipelineIsa} from '../utils/transpiler.js';

export default function AssemblyEditor({source, onChange, onInitialize, disabled, state}) {
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Dependencies');
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = source.split(/\r?\n/);
  const lineCount = Math.max(lines.length, 1);
  const instructionCount = lines.filter(l => l.split('#')[0].trim().length > 0).length;

  const legacyDetected = detectLegacySyntax(source);

  // Simple live check for validity
  let liveError = null;
  const validOpcodes = ['LI', 'ADD', 'SUB', 'AND', 'OR', 'LOAD', 'STORE'];
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].split('#')[0].trim();
    if (!text) continue;
    const parts = text.split(/\s+/);
    const op = parts[0].toUpperCase();
    if (!validOpcodes.includes(op)) {
      if (op === 'MUL') {
        liveError = `Line ${i + 1}: 'MUL' is not supported (single-cycle ALU supports ADD, SUB, AND, OR).`;
      } else if (op === 'HALT' || op === 'HLT') {
        liveError = `Line ${i + 1}: 'HALT' not needed (pipeline drains automatically). Remove line or convert.`;
      } else {
        liveError = `Line ${i + 1}: Unknown instruction '${parts[0]}' (Supported: LI, ADD, SUB, AND, OR, LOAD, STORE)`;
      }
      break;
    }
  }

  function handleAutoTranspile() {
    const converted = transpileToPipelineIsa(source);
    onChange(converted);
    onInitialize(converted);
  }

  // Sync scrolling between textarea and line numbers
  function handleScroll() {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  return (
    <aside className="col-panel editor-col">
      {/* Top Header Row */}
      <div className="panel-header-row">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className="panel-label">ASSEMBLY</span>
          <span className="inst-count-chip">{instructionCount} ops</span>
        </div>

        <select
          className="example-dropdown"
          disabled={disabled}
          value={selectedPreset}
          onChange={e => {
            const presetName = e.target.value;
            setSelectedPreset(presetName);
            const code = SAMPLES[presetName];
            if (code) {
              onChange(code);
              onInitialize(code);
            }
          }}
        >
          <option value="" disabled>Load Example...</option>
          {Object.keys(SAMPLES).map(x => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </div>

      {/* Editor Box with Line Numbers Gutter */}
      <div className="code-editor-container">
        {/* Left Line Numbers Gutter */}
        <div className="line-numbers-gutter" ref={lineNumbersRef}>
          {Array.from({length: lineCount}, (_, i) => (
            <div key={i + 1} className="line-num-item">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <textarea
          ref={textareaRef}
          className="editor-textarea-with-gutter"
          spellCheck="false"
          value={source}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder="Enter assembly code (e.g. LI R1, 10)..."
        />
      </div>

      {/* Editor Footer Status & Assemble Button */}
      <div className="editor-control-footer">
        <div className="editor-status-line">
          {liveError ? (
            <span className="error-indicator" title={liveError}>
              ⚠️ {liveError}
            </span>
          ) : (
            <span className="valid-indicator">
              ✓ {instructionCount} instructions · valid
            </span>
          )}
          <button
            className="btn-reload-mini"
            disabled={disabled}
            onClick={() => onInitialize(source)}
            title="Reload and re-assemble code"
          >
            Reload ↩
          </button>
        </div>

        {legacyDetected && (
          <div className="legacy-transpile-banner">
            <div className="legacy-banner-header">
              <span className="badge-transpile">⚡ COMPATIBILITY</span>
              <span className="legacy-reason">{legacyDetected.reason}</span>
            </div>
            <button
              className="btn-transpile"
              type="button"
              disabled={disabled}
              onClick={handleAutoTranspile}
              title="Automatically translate 8085 / 2-operand syntax to 5-stage RISC pipeline assembly"
            >
              <span>⚡</span> Convert to 5-Stage RISC Pipeline Code
            </button>
          </div>
        )}

        <button
          className="btn-assemble-primary"
          disabled={disabled}
          onClick={() => onInitialize(source)}
        >
          <span>⚡</span> Assemble & Initialize Program
        </button>
      </div>

      {/* Instruction Set Cheat Sheet Accordion */}
      <div
        className="instruction-set-drawer"
        onClick={() => setShowCheatSheet(!showCheatSheet)}
      >
        <span>INSTRUCTION SET &nbsp;·&nbsp; 7 ops &nbsp;·&nbsp; R0–R7</span>
        <span style={{fontSize: '10px'}}>{showCheatSheet ? '▼' : '▶'}</span>
      </div>

      {showCheatSheet && (
        <div className="isa-cheatsheet-card">
          <div className="isa-row">
            <span className="isa-op">LI Rd, imm</span>
            <span className="isa-desc">Load 32-bit immediate</span>
          </div>
          <div className="isa-row">
            <span className="isa-op">ADD Rd, Rs1, Rs2</span>
            <span className="isa-desc">Rd = Rs1 + Rs2</span>
          </div>
          <div className="isa-row">
            <span className="isa-op">SUB Rd, Rs1, Rs2</span>
            <span className="isa-desc">Rd = Rs1 - Rs2</span>
          </div>
          <div className="isa-row">
            <span className="isa-op">AND / OR Rd, Rs1, Rs2</span>
            <span className="isa-desc">Bitwise operations</span>
          </div>
          <div className="isa-row">
            <span className="isa-op">LOAD Rd, addr</span>
            <span className="isa-desc">Rd = Memory[addr] (0..1023)</span>
          </div>
          <div className="isa-row">
            <span className="isa-op">STORE Rs, addr</span>
            <span className="isa-desc">Memory[addr] = Rs (0..1023)</span>
          </div>
          <div style={{marginTop: '6px', fontSize: '10px', color: '#64748b', borderTop: '1px solid #162030', paddingTop: '4px'}}>
            Registers: <code>R0</code> to <code>R7</code> (all writable, 32-bit signed). Comments begin with <code>#</code>.
          </div>
        </div>
      )}
    </aside>
  );
}
