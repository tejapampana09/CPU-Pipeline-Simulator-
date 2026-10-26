import {useEffect, useState} from 'react';
import {api} from '../api/simulationApi.js';

const EXAMPLES = [
  ['RAW Hazard', 'Write a program demonstrating two RAW hazards using LI, ADD and STORE.'],
  ['Memory Swap', 'Swap two memory values at addresses 10 and 11 using registers.'],
  ['Arithmetic', 'Calculate (12 + 18) - 10 and store the result at address 42.']
];

export default function TeammatePanel({state, onLoad, disabled}) {
  const [config, setConfig] = useState({configured: false, model: 'gemini-2.5-flash'});
  const [prompt, setPrompt] = useState('Write a program to add 10 and 20 and store the result at address 30.');
  const [proposal, setProposal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [autoReviewed, setAutoReviewed] = useState(null);

  useEffect(() => {
    api('teammates/status').then(setConfig).catch(() => setConfig({configured: false}));
  }, []);

  async function generate(input = prompt) {
    if (!input.trim() || generating) return;
    setGenerating(true);
    setError('');
    setProposal(null);
    try {
      const result = await api('teammates/ai-generate', {prompt: input.trim()});
      if (!result?.success || result?.mode !== 'gemini-ai') throw new Error(result?.message || 'Online AI generation failed');
      setProposal(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function analyze(sessionId = state?.sessionId) {
    if (!sessionId || reviewing) return;
    setReviewing(true);
    setError('');
    setAnalysis(null);
    try {
      const result = await api('teammates/ai-explain', {sessionId});
      if (!result?.success || result?.mode !== 'gemini-ai') throw new Error(result?.message || 'Online AI review failed');
      setAnalysis(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  }

  useEffect(() => {
    if (state?.status !== 'completed' || !state?.sessionId || !config.configured) return;
    const key = state.sessionId + ':' + state.cycle;
    if (autoReviewed === key) return;
    setAutoReviewed(key);
    analyze(state.sessionId);
  }, [state?.status, state?.sessionId, state?.cycle, config.configured, autoReviewed]);

  return (
    <section className="panel teammates">
      <div className="section-heading">
        <h2>AI Bot Teammates</h2>
        <span className={config.configured ? 'badge ai-active' : 'badge'}>
          {config.configured ? `Online Gemini · ${config.model}` : 'Gemini API key required'}
        </span>
      </div>

      {!config.configured && (
        <div className="offline-tip">
          These bots require a live Gemini API. Add <code>GEMINI_API_KEY=your_key</code> to <code>backend/.env</code> and restart the backend. No offline AI fallback is used.
        </div>
      )}

      {error && <div role="alert" className="offline-tip">{error}</div>}

      <div className="bot-grid">
        <article>
          <h3><span className="avatar">⚡</span> AI Assembly Architect</h3>
          <p>Generate executable assembly from natural-language instructions using Gemini.</p>
          <div style={{display:'flex', flexWrap:'wrap', gap:8, margin:'12px 0'}}>
            {EXAMPLES.map(([label, value]) => (
              <button key={label} disabled={!config.configured || generating} onClick={() => {setPrompt(value); generate(value);}}>{label}</button>
            ))}
          </div>
          <textarea aria-label="AI assembly request" value={prompt} onChange={e => setPrompt(e.target.value)}
            rows={4} style={{width:'100%', boxSizing:'border-box'}} />
          <button className="primary" disabled={!config.configured || generating || !prompt.trim()} onClick={() => generate()}>
            {generating ? 'Generating with Gemini...' : 'Generate Assembly with AI'}
          </button>
          {proposal && (
            <div style={{marginTop:16}}>
              <pre style={{whiteSpace:'pre-wrap'}}>{proposal.source}</pre>
              <p>{proposal.explanation}</p>
              <p>{proposal.hazardsInsight}</p>
              <button disabled={disabled} onClick={() => onLoad(proposal.source)}>Use in Editor</button>
            </div>
          )}
        </article>

        <article>
          <h3><span className="avatar reviewer">🧠</span> AI Pipeline Coach</h3>
          <p>Live Gemini analysis of the completed pipeline, hazards, optimization, and cycle count.</p>
          <button className="primary" disabled={!config.configured || !state?.sessionId || reviewing}
            onClick={() => analyze()}>
            {reviewing ? 'Analyzing with Gemini...' : 'Analyze Pipeline with AI'}
          </button>
          {analysis && (
            <div style={{marginTop:16}}>
              <h4>Verdict: {analysis.verdict}</h4>
              <p>{analysis.overview}</p>
              {analysis.stats && <p>Cycles: {analysis.stats.cycle} · Stalls: {analysis.stats.stalls} · CPI: {analysis.stats.cpi}</p>}
              {analysis.hazards?.map((hazard, i) => (
                <div key={i} style={{marginTop:12}}>
                  <strong>{hazard.title || `Hazard ${i + 1}`}</strong>
                  <p>{hazard.explanation}</p>
                </div>
              ))}
              <h4>Optimization</h4>
              <p>{analysis.optimizationSummary}</p>
              {analysis.optimizationTips?.map((tip, i) => <p key={i}>{tip.advice}</p>)}
              {analysis.optimizedCode?.source && (
                <>
                  <pre style={{whiteSpace:'pre-wrap'}}>{analysis.optimizedCode.source}</pre>
                  <button disabled={disabled} onClick={() => onLoad(analysis.optimizedCode.source)}>Use Optimized Assembly</button>
                </>
              )}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
