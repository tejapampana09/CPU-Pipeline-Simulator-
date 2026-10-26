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
          if (part.startsWith("'") && part.endsWith("'") && /\b(LI|ADD|SUB|AND|OR|LOAD|STORE|R[0-7])\b/i.test(part)) {
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
  const [aiConfig, setAiConfig] = useState({configured: false, model: 'gemini-2.5-flash'});
  const [activeTab, setActiveTab] = useState('ai');
  const [autoReviewSession, setAutoReviewSession] = useState(null);
  
  // AI Bot state
  const [aiPrompt, setAiPrompt] = useState('Write a program demonstrating a RAW hazard with LOAD and ADD, then store the result at address 25.');
  const [aiProposal, setAiProposal] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);

  // Offline Bot state
  const [operation, setOp] = useState('ADD');
  const [a, setA] = useState(10);
  const [b, setB] = useState(20);
  const [address, setAddress] = useState(30);
  const [proposal, setProposal] = useState(null);
  const [review, setReview] = useState(null);

  // General UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fetch AI status on mount
  useEffect(() => {
    api('teammates/status')
      .then(res => {
        setAiConfig(res);
        if (!res.configured) {
          setActiveTab('offline');
        }
      })
      .catch(() => {
        setAiConfig({configured: false});
        setActiveTab('offline');
      });
  }, []);

  // Reset auto-review session when cycle is 0 (reset/init)
  useEffect(() => {
    if (state?.cycle === 0) {
      setAutoReviewSession(null);
    }
  }, [state?.cycle]);

  // AUTOMATIC REVIEW: Triggers automatically as soon as simulation completes!
  useEffect(() => {
    if (
      state?.status === 'completed' &&
      state?.sessionId &&
      autoReviewSession !== state.sessionId &&
      !busy
    ) {
      setAutoReviewSession(state.sessionId);
      if (activeTab === 'ai' && aiConfig.configured) {
        handleAiExplain(state.sessionId);
      } else {
        handleOfflineCall('review', state.sessionId);
      }
    }
  }, [state?.status, state?.sessionId, activeTab, aiConfig.configured, autoReviewSession, busy]);

  // AI Assembly Generator
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

  // AI Pipeline Explainer & Optimizer
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
      <div className="section-heading">
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <h2>Your bot teammates</h2>
          <div className="tabs" style={{margin: 0}}>
            <button
              className={activeTab === 'ai' ? 'selected' : ''}
              onClick={() => setActiveTab('ai')}
              style={{padding: '5px 10px', fontSize: '11px'}}
            >
              ✨ AI Teammate Mode {aiConfig.configured ? <span style={{color: '#18775e'}}>● Active</span> : ''}
            </button>
            <button
              className={activeTab === 'offline' ? 'selected' : ''}
              onClick={() => setActiveTab('offline')}
              style={{padding: '5px 10px', fontSize: '11px'}}
            >
              ⚙️ Offline (Rule-based)
            </button>
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span style={{fontSize: '11px', color: '#16765d', background: '#eaf6f0', padding: '3px 8px', borderRadius: '12px', border: '1px solid #cce8dc', fontWeight: 600}}>
            ⚡ Auto-Review Active
          </span>
          <span className={`badge ${activeTab === 'ai' && aiConfig.configured ? 'ai-active' : ''}`}>
            {activeTab === 'ai'
              ? aiConfig.configured
                ? `Gemini AI (${aiConfig.model})`
                : 'AI Key Not Found'
              : 'Deterministic · Offline'}
          </span>
        </div>
      </div>

      {activeTab === 'ai' && !aiConfig.configured && (
        <div className="offline-tip">
          <b>💡 How to activate Google Gemini AI:</b>
          <p style={{margin: '4px 0 0'}}>
            Add <code>GEMINI_API_KEY=your_key</code> in <code>coa-pipeline-simulator/backend/.env</code> and restart the server.
          </p>
        </div>
      )}

      {activeTab === 'ai' ? (
        /* AI TEAMMATE MODE */
        <div className="bot-grid">
          {/* Bot 1: AI Assembly Architect */}
          <article>
            <h3><span className="avatar">⚡</span> AI Assembly Architect</h3>
            <p>Describe what you want to compute, and the AI will author valid assembly for our 5-stage CPU.</p>

            <div style={{margin: '12px 0'}}>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px'}}>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    style={{padding: '4px 8px', fontSize: '10px', borderRadius: '12px'}}
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
                style={{height: '75px', padding: '10px', fontSize: '11px', background: '#1c2833'}}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Write a program to calculate 5 * 3 using repeated additions..."
              />
            </div>

            <button
              className="primary"
              disabled={busy || !aiPrompt.trim()}
              onClick={() => handleAiGenerate()}
            >
              {busy ? 'Consulting Gemini AI...' : 'Generate with AI ⚡'}
            </button>

            {aiProposal && (
              <div style={{marginTop: '14px'}}>
                <pre>{aiProposal.source}</pre>
                <div style={{fontSize: '12px', margin: '8px 0'}}>
                  <strong>Explanation:</strong>
                  <div style={{marginTop: '3px'}}>
                    <CleanMarkdown content={aiProposal.explanation} />
                  </div>
                </div>
                {aiProposal.hazardsInsight && (
                  <div style={{color: '#985800', background: '#fff9ed', padding: '10px 12px', borderRadius: '6px', border: '1px solid #fae4b6', fontSize: '11.5px', marginTop: '8px'}}>
                    <strong>Pipeline Hazard Analysis:</strong>
                    <div style={{marginTop: '4px'}}>
                      <CleanMarkdown content={aiProposal.hazardsInsight} />
                    </div>
                  </div>
                )}
                <button
                  disabled={disabled}
                  style={{marginTop: '10px'}}
                  onClick={() => onLoad(aiProposal.source)}
                >
                  Use in editor ↗
                </button>
              </div>
            )}
          </article>

          {/* Bot 2: AI Pipeline Explainer & Optimizer */}
          <article>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <h3><span className="avatar reviewer">🧠</span> AI Pipeline Coach & Optimizer</h3>
              {state?.status === 'completed' && (
                <span style={{fontSize: '10px', color: '#16765d', background: '#eaf6f0', padding: '2px 7px', borderRadius: '10px', fontWeight: 600}}>
                  ✓ Auto-Analyzed
                </span>
              )}
            </div>
            <p>Automatically explains execution results, reasons for stalls, and gives optimization code.</p>

            <button
              className="primary"
              disabled={!state || busy || disabled}
              onClick={() => handleAiExplain()}
              style={{marginTop: '10px'}}
            >
              {busy ? 'Analyzing execution trace...' : 'Re-Analyze with AI 🧠'}
            </button>

            {busy && (
              <div style={{marginTop: '12px', background: '#eaf5ef', padding: '10px', borderRadius: '6px', color: '#18775e', fontSize: '11.5px'}}>
                ⚡ AI Coach is analyzing the pipeline trace automatically...
              </div>
            )}

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
                      <span className="ai-badge-count">{aiExplanation.hazards.length} Stalls</span>
                    </div>

                    {aiExplanation.hazards.map((h, i) => {
                      const title = h.title || `RAW Hazard #${i + 1}`;
                      const reg = h.register || (h.explanation?.match(/R[0-7]/i)?.[0]?.toUpperCase());
                      const cycles = h.cycles || 'Stall Cycles';
                      const stalls = h.stalls || 2;

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
                            <CleanMarkdown content={h.explanation} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Optimization Tips Section */}
                {aiExplanation.optimizationTips?.length > 0 && (
                  <div className="ai-card-group">
                    <div className="ai-group-header">
                      <span className="ai-group-title">
                        <span>💡</span>
                        <span>Can we make this code faster?</span>
                      </span>
                      <span className="ai-badge-count">Advice</span>
                    </div>

                    {aiExplanation.optimizationSummary && (
                      <div style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '9px 12px', fontSize: '11.5px', color: '#334155', marginBottom: '8px'}}>
                        <strong>Verdict:</strong> <CleanMarkdown content={aiExplanation.optimizationSummary} />
                      </div>
                    )}

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
                    {aiExplanation.optimizedCode?.source && (
                      <div className="opt-code-card">
                        <div className="opt-code-header">
                          <span className="opt-code-title">
                            <span>⚡</span>
                            <span>Optimized Assembly Code</span>
                          </span>
                          <span className="opt-code-badge">
                            {aiExplanation.optimizedCode.savings || 'Reduced Stalls'}
                          </span>
                        </div>
                        {aiExplanation.optimizedCode.explanation && (
                          <p className="opt-code-desc">
                            <CleanMarkdown content={aiExplanation.optimizedCode.explanation} />
                          </p>
                        )}
                        <pre className="opt-code-pre">{aiExplanation.optimizedCode.source}</pre>
                        <button
                          className="primary"
                          disabled={disabled}
                          style={{fontSize: '11px', padding: '7px 12px'}}
                          onClick={() => onLoad(aiExplanation.optimizedCode.source)}
                        >
                          Load Optimized Code into Editor ↗
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Data Forwarding Impact Card */}
                {aiExplanation.forwarding && (
                  <div className="forwarding-banner">
                    <div className="forwarding-top">
                      <div className="forwarding-title">
                        <span>⚡</span>
                        <span>Hardware Data Forwarding (Bypass)</span>
                      </div>
                      <span className="forwarding-pill">
                        {aiExplanation.forwarding.speedup || '~1.5x Speedup'}
                      </span>
                    </div>
                    {aiExplanation.forwarding.summary && (
                      <div className="forwarding-summary">
                        <CleanMarkdown content={aiExplanation.forwarding.summary} />
                      </div>
                    )}
                    {aiExplanation.forwarding.benefits?.length > 0 && (
                      <ul className="forwarding-list">
                        {aiExplanation.forwarding.benefits.map((b, bi) => (
                          <li key={bi}><CleanMarkdown content={b} /></li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Mismatches if any */}
                {aiExplanation.mismatches?.length > 0 && (
                  <div style={{color: '#c0392b', marginTop: '8px', background: '#fff0ee', padding: '10px', borderRadius: '6px', border: '1px solid #efc5bf', fontSize: '11px'}}>
                    <strong>Mismatches:</strong>
                    {aiExplanation.mismatches.map(x => <p key={x} style={{margin: '2px 0'}}>{x}</p>)}
                  </div>
                )}
              </div>
            )}
          </article>
        </div>
      ) : (
        /* OFFLINE DETERMINISTIC MODE */
        <div className="bot-grid">
          <article>
            <h3><span className="avatar">A</span> Assembly Assistant (Offline)</h3>
            <p>Build a validated arithmetic program using fixed templates.</p>
            <div className="bot-inputs">
              <label>Operation
                <select value={operation} onChange={e => setOp(e.target.value)}>
                  {['ADD', 'SUB', 'AND', 'OR'].map(x => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label>Operand A<input type="number" value={a} onChange={e => setA(e.target.value)} /></label>
              <label>Operand B<input type="number" value={b} onChange={e => setB(e.target.value)} /></label>
              <label>Store address<input type="number" min="0" max="1023" value={address} onChange={e => setAddress(e.target.value)} /></label>
            </div>
            <button disabled={busy} onClick={() => handleOfflineCall('prepare')}>Generate program ↗</button>
            {proposal && (
              <div style={{marginTop: '12px'}}>
                <pre>{proposal.source}</pre>
                <p>{proposal.explanation}</p>
                <button disabled={disabled} onClick={() => onLoad(proposal.source)}>Use in editor</button>
              </div>
            )}
          </article>

          <article>
            <h3><span className="avatar reviewer">R</span> Pipeline Reviewer (Offline)</h3>
            <p>Compare execution with an independent sequential interpreter.</p>
            <button disabled={!state || busy || disabled} onClick={() => handleOfflineCall('review')}>
              Review current run ↗
            </button>
            {review && (
              <div className="review">
                <b>{review.verdict.toUpperCase()}{review.sessionId !== state?.sessionId || review.cycle !== state?.cycle ? ' · Previous snapshot' : ''}</b>
                <p>{review.summary}</p>
                <small>{review.policy}</small>
                {review.mismatches?.map(x => <p key={x}>{x}</p>)}
              </div>
            )}
          </article>
        </div>
      )}

      {error && <p role="alert" className="error" style={{marginTop: '16px'}}>{error}</p>}
    </section>
  );
}
