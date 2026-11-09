import { useState, useEffect } from 'react'
import { api } from '../api/simulationApi.js'
import { usePipelineReview } from '../hooks/usePipelineReview.js'

// Clean Markdown & Code-Chip Formatter (Prevents raw asterisks and backticks)
function CleanMarkdown({ content }) {
  if (!content) return null
  const str = String(content)
  const lines = str.split(/\n+/).map((l) => l.trim()).filter(Boolean)

  return (
    <div className="clean-md">
      {lines.map((line, lIdx) => {
        const isBullet = /^[-*•]\s+/.test(line)
        const cleanLine = line.replace(/^[-*•]\s+/, '')

        // Tokenize by **bold**, `code`, and 'instructions'
        const parts = cleanLine.split(/(\*\*[^*]+\*\*|`[^`]+`|'[^']{2,25}')/g)

        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} className="text-bold">{part.slice(2, -2)}</strong>
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={pIdx} className="code-chip">{part.slice(1, -1)}</code>
          }
          if (
            part.startsWith("'") &&
            part.endsWith("'") &&
            /\b(LI|ADD|SUB|AND|OR|LOAD|STORE|OUT|R[0-7]|AX|BX|CX|DX)\b/i.test(part)
          ) {
            return <code key={pIdx} className="code-chip">{part.slice(1, -1)}</code>
          }
          return part
        })

        if (isBullet) {
          return (
            <div key={lIdx} className="md-bullet-line">
              <span className="bullet-dot">▸</span>
              <span className="bullet-text">{rendered}</span>
            </div>
          )
        }

        return <p key={lIdx} className="md-p">{rendered}</p>
      })}
    </div>
  )
}

export default function TeammatePanel({ state, onLoad, disabled, autoReview, setAutoReview }) {
  const [aiConfig, setAiConfig] = useState({ configured: false, model: null })

  // Bot 1: generated code or an explicitly labeled offline template.
  const [aiPrompt, setAiPrompt] = useState(
    'Write a program demonstrating a RAW hazard with LOAD and ADD, then store the result at address 25.'
  )
  const [aiProposal, setAiProposal] = useState(null)

  const review = usePipelineReview(state, autoReview)
  const aiExplanation = review.data
  const reviewing = review.status === 'loading'

  // General UI states
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Fetch AI configuration status on mount
  useEffect(() => {
    api('teammates/status')
      .then((res) => {
        if (res) {
          setAiConfig(res)
        }
      })
      .catch(() => {
        // Keep default config
      })
  }, [])

  // Bot 1: AI Assembly Generator
  async function handleAiGenerate(promptToUse) {
    const p = promptToUse || aiPrompt
    if (!p.trim()) return
    setBusy(true)
    setError('')
    try {
      const data = await api('teammates/ai-generate', { prompt: p.trim() })
      if (data && data.success !== false) {
        setAiProposal(data)
      } else {
        setError(data?.message || 'Assembly generation failed.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const QUICK_PROMPTS = [
    { label: '⚡ RAW Hazards', text: 'Create a program with 2 RAW data hazards between ALU instructions and explain the stalls.' },
    { label: '🔄 Memory Swap', text: 'Swap values in registers R1 and R2 using memory address 10.' },
    { label: '⏱️ Load-Use Delay', text: 'Load a number from memory address 5 into R1, then immediately ADD R2, R1, R1 to trigger a load-use stall.' },
    { label: '🧮 Math & Logic', text: 'Calculate (12 + 18) - 10, logical AND with 15, and store the result in address 42.' }
  ]

  return (
    <div className="teammates-wrapper">
      {/* Top Meta Bar */}
      <div className="teammates-topbar">
        <div className="teammates-desc">
          <span className="teammates-title">Virtual AI Teammates</span>
          <span className="teammates-sub">Program Authoring & Independent Verification</span>
        </div>
        <div className="teammates-status-badges">
          <span className="status-pill">
            <label><input type="checkbox" checked={autoReview} onChange={(event) => setAutoReview(event.target.checked)} /> Auto-review on completion</label>
          </span>
          <span className="status-pill model-active">
            {aiConfig.configured ? `Gemini configured · ${aiConfig.model}` : 'Offline fallback active'}
          </span>
        </div>
      </div>

      {/* Two Dedicated Sleek Cards */}
      <div className="bot-grid">
        {/* ======================================================== */}
        {/* BOT 1: ASSEMBLY ARCHITECT                                */}
        {/* ======================================================== */}
        <article className="bot-card bot-1">
          <div className="bot-card-head">
            <div className="bot-identity">
              <div className="bot-avatar bot-1-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="bot-titles">
                <h3>Bot 1: Assembly Architect</h3>
                <span className="bot-role-tag">Program Author & Transpiler</span>
              </div>
            </div>

            <span className="bot-ai-badge">{aiProposal?.provider === 'gemini' ? `Gemini · ${aiProposal.model}` : 'Assembly assistant'}</span>
          </div>

          <div className="bot-card-body">
            <div className="bot-flow">
              <p className="bot-instruction-note">
                Describe any logic in plain English, paste legacy 8086 code, or pick a preset chip:
              </p>

              {/* Preset Chips */}
              <div className="quick-presets">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-chip"
                    disabled={busy}
                    onClick={() => {
                      setAiPrompt(qp.text)
                      handleAiGenerate(qp.text)
                    }}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div className="input-group">
                <textarea
                  className="bot-textarea"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Write a program to add 15 and 25, then store in address 40..."
                />
              </div>

              {/* Action CTA */}
              <div className="bot-actions-row">
                <button
                  className="btn btn-accent btn-bot-cta"
                  disabled={busy || !aiPrompt.trim()}
                  onClick={() => handleAiGenerate()}
                >
                  {busy ? (
                    <>
                      <span className="spinner-mini" /> Generating assembly...
                    </>
                  ) : (
                    <>
                      <span>⚡ Generate with AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Output Box */}
              {aiProposal && (
                <div className="bot-output-card">
                  <div className="output-card-header">
                    <span className="output-tag">GENERATED ASSEMBLY CODE</span>
                    <button
                      className="btn-link-action"
                      disabled={disabled}
                      onClick={() => onLoad(aiProposal.source)}
                    >
                      Load into Editor ↗
                    </button>
                  </div>
                  <CleanMarkdown content={aiProposal.notice || (aiProposal.provider === 'gemini' ? `Gemini · ${aiProposal.model}` : 'Offline fallback active')} />
                  <pre className="output-code-pre">{aiProposal.source}</pre>
                  {aiProposal.explanation && (
                    <div className="output-explanation">
                      <span className="explanation-label">Architecture Explanation:</span>
                      <CleanMarkdown content={aiProposal.explanation} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* ======================================================== */}
        {/* BOT 2: PIPELINE REVIEWER                     */}
        {/* ======================================================== */}
        <article className="bot-card bot-2">
          <div className="bot-card-head">
            <div className="bot-identity">
              <div className="bot-avatar bot-2-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z" />
                </svg>
              </div>
              <div className="bot-titles">
                <h3>Bot 2: Pipeline Reviewer</h3>
                <span className="bot-role-tag">Pipeline Coach & Verifier</span>
              </div>
            </div>

            <span className="bot-ai-badge coach">{aiExplanation?.provider === 'gemini' ? `Gemini · ${aiExplanation.model}` : 'Independent reviewer'}</span>
          </div>

          <div className="bot-card-body">
            <div className="bot-flow">
              <div className="bot-reviewer-controls">
                <button
                  className="btn btn-bot-cta"
                  disabled={!state || reviewing || disabled}
                  onClick={review.analyze}
                >
                  {reviewing ? (
                    <>
                      <span className="spinner-mini" /> Analyzing Execution Trace...
                    </>
                  ) : (
                    <>
                      <span>🧠 {review.status === 'error' ? 'Retry Review' : 'Review Current Cycle'}</span>
                    </>
                  )}
                </button>
                {review.status === 'success' && (
                  <span className="auto-analyzed-badge">✓ Reviewed cycle {state.cycle}</span>
                )}
                {review.status === 'error' && <div role="alert" className="bot-error-banner">{review.error}</div>}
              </div>

              {aiExplanation && (
                <div className="ai-coach-wrap">
                  <CleanMarkdown content={aiExplanation.notice || (aiExplanation.provider === 'gemini' ? `Gemini · ${aiExplanation.model}` : 'Offline fallback active')} />
                  {/* Summary Header Card */}
                  <div className="ai-summary-card">
                    <div className="ai-summary-header">
                      <div className="ai-summary-title">
                        <span className="label-dim">VERDICT:</span>
                        <span
                          className={`ai-pill-verdict ${
                            aiExplanation.verdict === 'pass' ? 'pass' : 'fail'
                          }`}
                        >
                          {aiExplanation.verdict?.toUpperCase() || 'EVALUATED'}
                        </span>
                      </div>
                      {aiExplanation.stats && (
                        <div className="ai-pills-row">
                          <span className="ai-stat-pill">
                            <b>{aiExplanation.stats.cycle}</b> Cycles
                          </span>
                          <span className="ai-stat-pill">
                            <b>{aiExplanation.stats.stalls}</b> Stalls
                          </span>
                          <span className="ai-stat-pill">
                            CPI <b>{aiExplanation.stats.cpi}</b>
                          </span>
                        </div>
                      )}
                    </div>
                    {aiExplanation.overview && (
                      <div className="ai-overview-text">
                        <CleanMarkdown content={aiExplanation.overview} />
                      </div>
                    )}
                  </div>

                  {/* Hazards & Stalls Section */}
                  {aiExplanation.hazards?.length > 0 && (
                    <div className="ai-card-group">
                      <div className="ai-group-header">
                        <span className="ai-group-title">
                          <span className="header-icon">⚠️</span>
                          <span>Pipeline Stalls & Hazards</span>
                        </span>
                        <span className="ai-badge-count">
                          {aiExplanation.hazards.length} Detected
                        </span>
                      </div>

                      <div className="hazard-cards-list">
                        {aiExplanation.hazards.map((h, i) => {
                          const title =
                            typeof h === 'string'
                              ? `RAW Hazard #${i + 1}`
                              : h.title || `RAW Hazard #${i + 1}`
                          const reg =
                            typeof h === 'string'
                              ? h.match(/R[0-7]/i)?.[0]?.toUpperCase()
                              : h.register ||
                                h.explanation?.match(/R[0-7]/i)?.[0]?.toUpperCase()
                          const cycles =
                            typeof h === 'string' ? 'Stall Cycles' : h.cycles || 'Stall Cycles'
                          const stalls = typeof h === 'string' ? 2 : h.stalls ?? 0
                          const desc = typeof h === 'string' ? h : h.explanation || ''

                          return (
                            <div key={i} className="hazard-item-card">
                              <div className="hazard-item-top">
                                <div className="hazard-tag">
                                  <span className="hazard-dot">🛑</span>
                                  <span className="hazard-title-text">{title}</span>
                                </div>
                                <div className="hazard-subtags">
                                  {reg && <span className="subtag subtag-reg">{reg}</span>}
                                  <span className="subtag subtag-cycle">
                                    {cycles} ({stalls} {stalls === 1 ? 'Stall' : 'Stalls'})
                                  </span>
                                </div>
                              </div>
                              {(h.producer || h.consumer) && (
                                <div className="hazard-flow">
                                  <span className="flow-step producer">{h.producer}</span>
                                  <span className="flow-arrow">➔</span>
                                  <span className="flow-step consumer">{h.consumer}</span>
                                </div>
                              )}
                              <div className="hazard-desc">
                                <CleanMarkdown content={desc} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Data Forwarding Speedup Banner */}
                  {aiExplanation.forwarding && (
                    <div className="forwarding-banner">
                      <div className="forwarding-top">
                        <div className="forwarding-title">
                          <span className="forwarding-icon">⚡</span>
                          <span>Hardware Data Forwarding Impact</span>
                        </div>
                        <span className="forwarding-pill">
                          {(typeof aiExplanation.forwarding === 'object' &&
                            aiExplanation.forwarding.speedup) ||
                            'Not measured'}
                        </span>
                      </div>
                      <div className="forwarding-summary">
                        <CleanMarkdown
                          content={
                            typeof aiExplanation.forwarding === 'string'
                              ? aiExplanation.forwarding
                              : aiExplanation.forwarding.summary || ''
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      {error && (
        <div role="alert" className="bot-error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

