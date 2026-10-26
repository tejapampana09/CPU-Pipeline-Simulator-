import {useState, useEffect} from 'react';
import {api} from '../api/simulationApi.js';

// Clean Markdown & Code-Chip Formatter (Prevents raw asterisks and backticks)
function CleanMarkdown({content}) {
  if (!content) return null;
  const str = String(content);
  const lines = str.split(/\n+/).map(l => l.trim()).filter(Boolean);

  return (
    <>
      {lines.map((line, lIdx) => {
        const isBullet = /^[-*•]\s+/.test(line);
        const cleanLine = line.replace(/^[-*•]\s+/, '');

        // Tokenize by **bold**, `code`, and 'instructions'
        const parts = cleanLine.split(/(\*\*[^*]+\*\*|`[^`]+`|'[^']{2,25}')/g);

        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} className="text-bold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={pIdx} className="code-chip">{part.slice(1, -1)}</code>;
          }
          if (part.startsWith("'") && part.endsWith("'") && /\b(LI|ADD|SUB|AND|OR|LOAD|STORE|R[0-7]|AX|BX|CX|DX)\b/i.test(part)) {
            return <code key={pIdx} className="code-chip">{part.slice(1, -1)}</code>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lIdx} style={{display: 'flex', gap: '6px', margin: '4px 0', alignItems: 'baseline'}}>
              <span style={{color: '#ea580c', fontSize: '9px'}}>●</span>
              <span>{rendered}</span>
            </div>
          );
        }

        return <p key={lIdx} style={{margin: '4px 0'}}>{rendered}</p>;
      })}
    </>
  );
}

export default function TeammatePanel({state, onLoad, disabled}) {
  const [aiConfig, setAiConfig] = useState({configured: false, model: 'gemini-3.5-flash-lite'});
  
  // Independent mode states for each bot!
  const [bot1Mode, setBot1Mode] = useState('ai'); // 'ai' | 'offline'
  const [bot2Mode, setBot2Mode] = useState('ai'); // 'ai' | 'offline'
  const [autoReviewSession, setAutoReviewSession] = useState(null);
  
  // Bot 1 states (AI & Offline)
  const [aiPrompt, setAiPrompt] = useState('Write a program demonstrating a RAW hazard with LOAD and ADD, then store the result at address 25.');
  const [aiProposal, setAiProposal] = useState(null);
  const [operation, setOp] = useState('ADD');
  const [a, setA] = useState(10);
  const [b, setB] = useState(20);
  const [address, setAddress] = useState(30);
  const [proposal, setProposal] = useState(null);

  // Bot 2 states (AI & Offline)
  const [aiExplanation, setAiExplanation] = useState(null);
  const [review, setReview] = useState(null);

  // General UI states
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fetch AI configuration status on mount
  useEffect(() => {
    api('teammates/status')
      .then(res => {
        setAiConfig(res);
        if (!res.configured) {
          setBot1Mode('offline');
          setBot2Mode('offline');
        }
      })
      .catch(() => {
        setAiConfig({configured: false});
        setBot1Mode('offline');
        setBot2Mode('offline');
      });
  }, []);

  // Reset auto-review session tracker on cycle 0 (reset/init)
  useEffect(() => {
    if (state?.cycle === 0) {
      setAutoReviewSession(null);
    }
  }, [state?.cycle]);

  // AUTOMATIC REVIEW for Bot 2: Runs as soon as simulation completes in whatever mode Bot 2 is set to!
  useEffect(() => {
    if (
      state?.status === 'completed' &&
      state?.sessionId &&
      autoReviewSession !== state.sessionId &&
      !busy
    ) {
      setAutoReviewSession(state.sessionId);
      if (bot2Mode === 'ai' && aiConfig.configured) {
        handleAiExplain(state.sessionId);
      } else {
        handleOfflineCall('review', state.sessionId);
      }
    }
  }, [state?.status, state?.sessionId, bot2Mode, aiConfig.configured, autoReviewSession, busy]);

  // Bot 1: AI Assembly Generator
  async function handleAiGenerate(promptToUse) {
    const p = promptToUse || aiPrompt;
    if (!p.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await api('teammates/ai-generate', {prompt: p.trim()});
      if (data.success) {
        setAiProposal(data);
      } else {
        setError(data.message || 'AI generation failed.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Bot 2: AI Pipeline Explainer & Optimizer
  async function handleAiExplain(explicitSessionId) {
    const sid = explicitSessionId || state?.sessionId;
    if (!sid) return;
    setBusy(true);
    setError('');
    try {
      const data = await api('teammates/ai-explain', {sessionId: sid});
      setAiExplanation({...data, sessionId: sid, cycle: state?.cycle});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Offline deterministic bot call
  async function handleOfflineCall(kind, explicitSessionId) {
    const sid = explicitSessionId || state?.sessionId;
    setBusy(true);
    setError('');
    try {
      const data = await api(
        'teammates/' + kind,
        kind === 'prepare'
          ? {operation, a: Number(a), b: Number(b), address: Number(address)}
          : {sessionId: sid}
      );
      if (kind === 'prepare') setProposal(data);
      else setReview({...data, sessionId: sid, cycle: state?.cycle});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const QUICK_PROMPTS = [
    {label: 'RAW Hazard Demo', text: 'Create a program with 2 RAW data hazards between ALU instructions and explain the stalls.'},
    {label: 'Memory Swap', text: 'Swap values in registers R1 and R2 using memory address 10.'},
    {label: 'Load-Use Delay', text: 'Load a number from memory address 5 into R1, then immediately ADD R2, R1, R1 to trigger a load-use stall.'},
    {label: 'Complex Math', text: 'Calculate (12 + 18) - 10, logical AND with 15, and store the result in address 42.'}
  ];

  return (
    <section className="panel teammates">
      <div className="section-heading" style={{marginBottom: '14px'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
          <div>
            <h2>Dual Virtual Bot Teammates</h2>
            <p className="muted" style={{margin: '2px 0 0', fontSize: '11px'}}>
              Two distinct, independent AI/offline software teammates designed for the 7-member COA project.
            </p>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{fontSize: '10.5px', color: '#10b981', background: '#062920', border: '1px solid #0f5132', padding: '3px 8px', borderRadius: '12px', fontWeight: 700}}>
              ⚡ Auto-Review Active
            </span>
            <span className={`badge ${aiConfig.configured ? 'ai-active' : ''}`}>
              {aiConfig.configured ? `Gemini AI (${aiConfig.model})` : 'Offline Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* TWO SEPARATED DEDICATED BOT CARDS */}
      <div className="bot-grid">
        {/* ======================================================== */}
        {/* BOT 1: ASSEMBLY ARCHITECT / ASSISTANT                     */}
        {/* ======================================================== */}
        <article className="bot-card bot-1">
          <div className="bot-card-header">
            <div className="bot-card-title-group">
              <span className="avatar">⚡</span>
              <div>
                <h3>Bot 1: Assembly Assistant</h3>
                <span className="bot-tag-sub">Program Author & Code Transpiler</span>
              </div>
            </div>

            {/* Independent Mode Switch for Bot 1 */}
            <div className="bot-mode-pills">
              <button
                type="button"
                className={`bot-mode-btn ${bot1Mode === 'ai' ? 'active ai' : ''}`}
                onClick={() => setBot1Mode('ai')}
                disabled={!aiConfig.configured}
                title={!aiConfig.configured ? 'Add GEMINI_API_KEY in .env to enable AI' : 'Use Gemini AI Code Generator'}
              >
                ✨ Gemini AI
              </button>
              <button
                type="button"
                className={`bot-mode-btn ${bot1Mode === 'offline' ? 'active offline' : ''}`}
                onClick={() => setBot1Mode('offline')}
                title="Use Deterministic Arithmetic Templates"
              >
                ⚙️ Rule-based
              </button>
            </div>
          </div>

          {/* BOT 1 CONTENT */}
          {bot1Mode === 'ai' ? (
            <div>
              <p style={{fontSize: '11px', color: '#94a3b8', margin: '4px 0 10px'}}>
                Describe any logic in plain English, paste 8086 code, or pick a preset. Gemini AI authors valid 5-stage RISC assembly:
              </p>

              <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px'}}>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    style={{padding: '3px 7px', fontSize: '9.5px', borderRadius: '10px'}}
                    disabled={busy}
                    onClick={() => {
                      setAiPrompt(qp.text);
                      handleAiGenerate(qp.text);
                    }}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              <textarea
                style={{height: '70px', padding: '8px', fontSize: '11px', width: '100%', marginBottom: '8px'}}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Write a program to add 15 and 25, then store in address 40..."
              />

              <button
                className="primary"
                disabled={busy || !aiPrompt.trim()}
                onClick={() => handleAiGenerate()}
              >
                {busy ? 'Consulting Gemini AI...' : 'Generate with AI ⚡'}
              </button>

              {aiProposal && (
                <div style={{marginTop: '12px', background: '#05080e', border: '1px solid #162030', padding: '10px', borderRadius: '6px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <span style={{fontSize: '10px', color: '#38bdf8', fontWeight: 800}}>GENERATED ASSEMBLY CODE</span>
                    <button
                      disabled={disabled}
                      style={{fontSize: '10px', padding: '2px 8px'}}
                      onClick={() => onLoad(aiProposal.source)}
                    >
                      Load into Editor ↗
                    </button>
                  </div>
                  <pre style={{margin: '0 0 8px'}}>{aiProposal.source}</pre>
                  {aiProposal.explanation && (
                    <div style={{fontSize: '11px', color: '#cbd5e1', marginTop: '6px'}}>
                      <strong style={{color: '#94a3b8'}}>Explanation:</strong>
                      <div style={{marginTop: '2px'}}>
                        <CleanMarkdown content={aiProposal.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{fontSize: '11px', color: '#94a3b8', margin: '4px 0 10px'}}>
                Deterministic rule-based generator: builds a validated arithmetic program using fixed templates without network calls.
              </p>
              <div className="bot-inputs" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px'}}>
                <label style={{fontSize: '10.5px', color: '#94a3b8'}}>Operation
                  <select value={operation} onChange={e => setOp(e.target.value)} style={{width: '100%', padding: '4px', marginTop: '2px'}}>
                    {['ADD', 'SUB', 'AND', 'OR'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label style={{fontSize: '10.5px', color: '#94a3b8'}}>Operand A
                  <input type="number" value={a} onChange={e => setA(e.target.value)} style={{width: '100%', padding: '4px', marginTop: '2px'}} />
                </label>
                <label style={{fontSize: '10.5px', color: '#94a3b8'}}>Operand B
                  <input type="number" value={b} onChange={e => setB(e.target.value)} style={{width: '100%', padding: '4px', marginTop: '2px'}} />
                </label>
                <label style={{fontSize: '10.5px', color: '#94a3b8'}}>Store Address (0..1023)
                  <input type="number" min="0" max="1023" value={address} onChange={e => setAddress(e.target.value)} style={{width: '100%', padding: '4px', marginTop: '2px'}} />
                </label>
              </div>

              <button disabled={busy} onClick={() => handleOfflineCall('prepare')}>
                Generate Template Program ↗
              </button>

              {proposal && (
                <div style={{marginTop: '12px', background: '#05080e', border: '1px solid #162030', padding: '10px', borderRadius: '6px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <span style={{fontSize: '10px', color: '#38bdf8', fontWeight: 800}}>TEMPLATE OUTPUT</span>
                    <button disabled={disabled} style={{fontSize: '10px', padding: '2px 8px'}} onClick={() => onLoad(proposal.source)}>
                      Load into Editor ↗
                    </button>
                  </div>
                  <pre style={{margin: '0 0 6px'}}>{proposal.source}</pre>
                  <p style={{fontSize: '11px', color: '#94a3b8', margin: 0}}>{proposal.explanation}</p>
                </div>
              )}
            </div>
          )}
        </article>

        {/* ======================================================== */}
        {/* BOT 2: PIPELINE REVIEWER & OPTIMIZER                      */}
        {/* ======================================================== */}
        <article className="bot-card bot-2">
          <div className="bot-card-header">
            <div className="bot-card-title-group">
              <span className="avatar reviewer">🧠</span>
              <div>
                <h3>Bot 2: Pipeline Reviewer</h3>
                <span className="bot-tag-sub">Independent Verifier & Optimizer</span>
              </div>
            </div>

            {/* Independent Mode Switch for Bot 2 */}
            <div className="bot-mode-pills">
              <button
                type="button"
                className={`bot-mode-btn ${bot2Mode === 'ai' ? 'active ai' : ''}`}
                onClick={() => setBot2Mode('ai')}
                disabled={!aiConfig.configured}
                title={!aiConfig.configured ? 'Add GEMINI_API_KEY in .env to enable AI' : 'Use Gemini AI Pipeline Coach'}
              >
                ✨ Gemini AI Coach
              </button>
              <button
                type="button"
                className={`bot-mode-btn ${bot2Mode === 'offline' ? 'active offline' : ''}`}
                onClick={() => setBot2Mode('offline')}
                title="Use Sequential Reference Interpreter"
              >
                ⚙️ Sequential Verifier
              </button>
            </div>
          </div>

          {/* BOT 2 CONTENT */}
          {bot2Mode === 'ai' ? (
            <div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                <p style={{fontSize: '11px', color: '#94a3b8', margin: 0}}>
                  Explains cycles, breaks down RAW stalls, and provides AI-optimized code with speedup analysis.
                </p>
                {state?.status === 'completed' && (
                  <span style={{fontSize: '9.5px', color: '#10b981', background: '#062920', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, border: '1px solid #0f5132', whiteSpace: 'nowrap'}}>
                    ✓ Auto-Analyzed
                  </span>
                )}
              </div>

              <button
                className="primary"
                disabled={!state || busy || disabled}
                onClick={() => handleAiExplain()}
                style={{marginBottom: '10px'}}
              >
                {busy ? 'Analyzing execution trace...' : 'Re-Analyze with AI 🧠'}
              </button>

              {aiExplanation && (
                <div className="ai-coach-wrap">
                  {/* Summary Header Card */}
                  <div className="ai-summary-card">
                    <div className="ai-summary-header">
                      <div className="ai-summary-title">
                        <span>VERDICT:</span>
                        <span className={`ai-pill ${aiExplanation.verdict === 'pass' ? 'pass' : 'fail'}`}>
                          {aiExplanation.verdict?.toUpperCase() || 'EVALUATED'}
                        </span>
                      </div>
                      {aiExplanation.stats && (
                        <div className="ai-pills-row">
                          <span className="ai-pill">{aiExplanation.stats.cycle} Cycles</span>
                          <span className="ai-pill">{aiExplanation.stats.stalls} Stalls</span>
                          <span className="ai-pill">CPI {aiExplanation.stats.cpi}</span>
                        </div>
                      )}
                    </div>
                    {aiExplanation.overview && (
                      <p className="ai-overview-text">
                        <CleanMarkdown content={aiExplanation.overview} />
                      </p>
                    )}
                  </div>

                  {/* Hazards & Stalls Section */}
                  {aiExplanation.hazards?.length > 0 && (
                    <div className="ai-card-group">
                      <div className="ai-group-header">
                        <span className="ai-group-title">
                          <span>⚠️</span>
                          <span>Where did stalls happen?</span>
                        </span>
                        <span className="ai-badge-count">{aiExplanation.hazards.length} Detected</span>
                      </div>

                      {aiExplanation.hazards.map((h, i) => {
                        const title = typeof h === 'string' ? `RAW Hazard #${i + 1}` : (h.title || `RAW Hazard #${i + 1}`);
                        const reg = typeof h === 'string' ? h.match(/R[0-7]/i)?.[0]?.toUpperCase() : (h.register || h.explanation?.match(/R[0-7]/i)?.[0]?.toUpperCase());
                        const cycles = typeof h === 'string' ? 'Stall Cycles' : (h.cycles || 'Stall Cycles');
                        const stalls = typeof h === 'string' ? 2 : (h.stalls || 2);
                        const desc = typeof h === 'string' ? h : (h.explanation || '');

                        return (
                          <div key={i} className="hazard-item-card">
                            <div className="hazard-item-top">
                              <div className="hazard-tag">
                                <span>🛑</span>
                                <span>{title}</span>
                              </div>
                              <div className="hazard-subtags">
                                {reg && <span className="subtag subtag-reg">Reg {reg}</span>}
                                <span className="subtag subtag-cycle">{cycles} ({stalls} Stalls)</span>
                              </div>
                            </div>
                            {(h.producer || h.consumer) && (
                              <div className="hazard-flow">
                                <span>{h.producer} (Producer)</span>
                                <span className="arrow">➔</span>
                                <span>{h.consumer} (Waiting in ID)</span>
                              </div>
                            )}
                            <div className="hazard-desc">
                              <CleanMarkdown content={desc} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Optimization Advice */}
                  {aiExplanation.optimizationTips?.length > 0 && (
                    <div className="ai-card-group">
                      <div className="ai-group-header">
                        <span className="ai-group-title">
                          <span>💡</span>
                          <span>Optimization & Scheduling Tips</span>
                        </span>
                        <span className="ai-badge-count">{aiExplanation.optimizationTips.length} Tips</span>
                      </div>

                      {aiExplanation.optimizationTips.map((tip, i) => (
                        <div key={i} className="opt-item-card">
                          <div className="opt-item-top">
                            <div className="opt-tag">
                              <span>💡</span>
                              <span>{tip.title || `Tip #${i + 1}`}</span>
                            </div>
                            {tip.benefit && <span className="opt-benefit-pill">{tip.benefit}</span>}
                          </div>
                          <div className="opt-desc">
                            <CleanMarkdown content={tip.advice || tip.explanation || tip} />
                          </div>
                        </div>
                      ))}

                      {/* AI-Optimized Code Box with 1-Click Load into Editor */}
                      {aiExplanation.optimizedCode && (
                        <div className="opt-code-card">
                          <div className="opt-code-header">
                            <span className="opt-code-title">
                              <span>⚡</span>
                              <span>Optimized Assembly Code</span>
                            </span>
                            <span className="opt-code-badge">
                              {(typeof aiExplanation.optimizedCode === 'object' && aiExplanation.optimizedCode.savings) || 'Reduced Stalls'}
                            </span>
                          </div>
                          {typeof aiExplanation.optimizedCode === 'object' && aiExplanation.optimizedCode.explanation && (
                            <p className="opt-code-desc">
                              <CleanMarkdown content={aiExplanation.optimizedCode.explanation} />
                            </p>
                          )}
                          <pre className="opt-code-pre">
                            {typeof aiExplanation.optimizedCode === 'string' ? aiExplanation.optimizedCode : (aiExplanation.optimizedCode.source || '')}
                          </pre>
                          <button
                            className="primary"
                            disabled={disabled}
                            style={{fontSize: '11px', padding: '6px 10px'}}
                            onClick={() => onLoad(typeof aiExplanation.optimizedCode === 'string' ? aiExplanation.optimizedCode : (aiExplanation.optimizedCode.source || ''))}
                          >
                            Load Optimized Code into Editor ↗
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data Forwarding Speedup Banner */}
                  {aiExplanation.forwarding && (
                    <div className="forwarding-banner">
                      <div className="forwarding-top">
                        <div className="forwarding-title">
                          <span>⚡</span>
                          <span>Hardware Data Forwarding Impact</span>
                        </div>
                        <span className="forwarding-pill">
                          {(typeof aiExplanation.forwarding === 'object' && aiExplanation.forwarding.speedup) || '~1.7x Speedup'}
                        </span>
                      </div>
                      <div className="forwarding-summary">
                        <CleanMarkdown content={typeof aiExplanation.forwarding === 'string' ? aiExplanation.forwarding : (aiExplanation.forwarding.summary || '')} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                <p style={{fontSize: '11px', color: '#94a3b8', margin: 0}}>
                  Independently executes program sequentially and mathematically verifies all final registers and memory values.
                </p>
                {state?.status === 'completed' && (
                  <span style={{fontSize: '9.5px', color: '#10b981', background: '#062920', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, border: '1px solid #0f5132', whiteSpace: 'nowrap'}}>
                    ✓ Auto-Reviewed
                  </span>
                )}
              </div>

              <button
                disabled={!state || busy || disabled}
                onClick={() => handleOfflineCall('review')}
                style={{marginBottom: '10px'}}
              >
                Review Current Run (Sequential Reference) ↗
              </button>

              {review && (
                <div className="review" style={{background: '#05080e', border: '1px solid #162030', padding: '12px', borderRadius: '6px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: review.verdict === 'pass' ? '#064e3b' : '#7f1d1d',
                      color: review.verdict === 'pass' ? '#34d399' : '#f87171'
                    }}>
                      VERDICT: {review.verdict.toUpperCase()}
                    </span>
                    {review.sessionId !== state?.sessionId || review.cycle !== state?.cycle ? (
                      <span style={{fontSize: '10px', color: '#64748b'}}>· Previous snapshot</span>
                    ) : null}
                  </div>
                  <p style={{fontSize: '11.5px', color: '#e2e8f0', margin: '4px 0 6px'}}>{review.summary}</p>
                  <small style={{display: 'block', color: '#64748b', fontSize: '10px', borderTop: '1px solid #162030', paddingTop: '4px'}}>
                    Policy: {review.policy}
                  </small>
                  {review.mismatches?.map(x => (
                    <p key={x} style={{color: '#f87171', margin: '4px 0 0', fontSize: '11px'}}>{x}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>
      </div>

      {error && <p role="alert" className="error" style={{marginTop: '12px'}}>{error}</p>}
    </section>
  );
}
