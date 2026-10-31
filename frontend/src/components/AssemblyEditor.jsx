import { useMemo, useRef } from 'react'
import { ISA, SAMPLE_PROGRAMS } from '@shared/constants.js'
import { REG_RE } from '../sim/parser.js'
import { Icon, Panel, stageVar } from './ui.jsx'
import { detectLegacySyntax, transpileToRisc } from '../utils/transpiler.js'

const TOKEN_RE = /([A-Za-z_]\w*)|([-+]?(?:0x[\da-f]+|\d+))|(\s+|,|.)/gi

function highlight(line) {
  const commentAt = line.search(/[#;]/)
  const code = commentAt === -1 ? line : line.slice(0, commentAt)
  const comment = commentAt === -1 ? '' : line.slice(commentAt)
  const out = []
  let first = true
  for (const m of code.matchAll(TOKEN_RE)) {
    const [tok, word, num] = m
    let cls = 'tk-punct'
    if (word) {
      cls = first ? (ISA[word.toUpperCase()] ? 'tk-op' : 'tk-bad') : REG_RE.test(word) ? 'tk-reg' : 'tk-bad'
      first = false
    } else if (num) {
      cls = 'tk-num'
      first = false
    } else if (/\s/.test(tok)) {
      out.push(tok)
      continue
    }
    out.push(<span key={m.index} className={cls}>{tok}</span>)
  }
  if (comment) out.push(<span key="c" className="tk-comment">{comment}</span>)
  return out
}

export function AssemblyEditor({ sim, stageByLine }) {
  const { source, setSource, errors, dirty, assemble, loadSample, runError } = sim
  const textRef = useRef(null)
  const preRef = useRef(null)
  const gutterRef = useRef(null)

  const lines = source.split('\n')
  const errorByLine = useMemo(() => new Map(errors.map((e) => [e.line, e.message])), [errors])
  const instCount = useMemo(() => lines.filter((l) => l.replace(/[#;].*$/, '').trim()).length, [lines])
  const legacyNotice = useMemo(() => detectLegacySyntax(source), [source])

  const syncScroll = () => {
    const t = textRef.current
    preRef.current.scrollTop = t.scrollTop
    preRef.current.scrollLeft = t.scrollLeft
    gutterRef.current.scrollTop = t.scrollTop
  }

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      assemble()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const t = e.currentTarget
      const { selectionStart: s, selectionEnd: end } = t
      setSource(source.slice(0, s) + '  ' + source.slice(end))
      requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2 })
    }
  }

  return (
    <Panel
      title="Assembly"
      className="editor-panel"
      meta={dirty ? <span className="badge badge-warn">modified</span> : null}
      actions={
        <select
          className="select"
          value=""
          onChange={(e) => {
            const sample = SAMPLE_PROGRAMS.find((p) => p.id === e.target.value)
            if (sample) loadSample(sample)
          }}
          aria-label="Load example program"
        >
          <option value="" disabled>Examples…</option>
          {SAMPLE_PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      }
    >
      {legacyNotice && (
        <div className="legacy-notice-strip">
          <span>💡 Line {legacyNotice.line}: {legacyNotice.reason}</span>
          <button
            className="btn-transpile"
            onClick={() => {
              const converted = transpileToRisc(source)
              setSource(converted)
            }}
          >
            Convert to RISC ➔
          </button>
        </div>
      )}
      <div className="editor">
        <div className="editor-gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, i) => {
            const stage = !dirty && stageByLine.get(i + 1)
            return (
              <div key={i} className={`gutter-line ${errorByLine.has(i + 1) ? 'has-error' : ''}`}>
                {stage && <span className="gutter-stage" style={stageVar(stage)}>{stage}</span>}
                <span className="ln">{i + 1}</span>
              </div>
            )
          })}
        </div>
        <div className="editor-code">
          <pre className="editor-highlight" ref={preRef} aria-hidden="true">
            {lines.map((l, i) => {
              const stage = !dirty && stageByLine.get(i + 1)
              return (
                <div key={i} className={`code-line ${errorByLine.has(i + 1) ? 'has-error' : ''} ${stage ? 'is-active' : ''}`} style={stage ? stageVar(stage) : undefined}>
                  {highlight(l)}{'​'}
                </div>
              )
            })}
          </pre>
          <textarea
            ref={textRef}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            wrap="off"
            aria-label="Assembly source"
          />
        </div>
      </div>

      <div className="editor-foot">
        {errors.length > 0 ? (
          <ul className="diagnostics">
            {errors.slice(0, 4).map((e) => (
              <li key={e.line}><Icon name="alert" size={13} /><b>Line {e.line}</b> {e.message}</li>
            ))}
            {errors.length > 4 && <li className="more">+{errors.length - 4} more</li>}
          </ul>
        ) : runError ? (
          <ul className="diagnostics"><li><Icon name="alert" size={13} />{runError}</li></ul>
        ) : (
          <div className="ok"><Icon name="check" size={13} /> {instCount} instruction{instCount === 1 ? '' : 's'} · valid</div>
        )}
        <button className={`btn ${dirty ? 'btn-accent' : ''}`} onClick={assemble} disabled={errors.length > 0} title="Assemble & load (⌘/Ctrl + Enter)">
          {dirty ? 'Assemble & load' : 'Reload'} <kbd>⌘↵</kbd>
        </button>
      </div>
    </Panel>
  )
}
