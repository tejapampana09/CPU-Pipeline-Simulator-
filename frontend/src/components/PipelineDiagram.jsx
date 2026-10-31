import {STAGES} from '../../../shared/contracts.js';

const STAGE_META = {
  IF: {name: 'Instruction Fetch', color: 'stage-IF'},
  ID: {name: 'Decode · Reg Read', color: 'stage-ID'},
  EX: {name: 'Execute · ALU', color: 'stage-EX'},
  MEM: {name: 'Memory Access', color: 'stage-MEM'},
  WB: {name: 'Write Back', color: 'stage-WB'}
};

export default function PipelineDiagram({state, running, forwarding}) {
  const last = state?.history?.at(-1);
  const currentHazards = (state?.events || []).filter(e => e.cycle === state?.cycle && e.type === 'RAW');
  const currentForwards = (state?.events || []).filter(e => e.cycle === state?.cycle && e.type === 'FORWARD');

  return (
    <div className="datapath-section">
      <div className="section-subhead">
        <span>
          PIPELINE DATAPATH &nbsp;·&nbsp;
          {forwarding ? (
            <span style={{color: '#059669', fontWeight: 800}}>⚡ Forwarding ON (Hardware Bypassing Active)</span>
          ) : (
            <span>Forwarding OFF (Stall on RAW)</span>
          )}
        </span>
        <span>{state?.status || 'idle'}</span>
      </div>

      {last?.stalled && currentHazards.length > 0 && (
        <div className="datapath-hazard-banner">
          <span className="hazard-tag-badge">🛑 RAW HAZARD (Cycle {state?.cycle})</span>
          <span className="hazard-banner-msg">
            Waiting for operand {currentHazards.map(h => `${h.register} (producer in ${h.stage})`).join(' & ')} · Holding IF/ID, Injecting BUBBLE into EX
          </span>
        </div>
      )}

      {currentForwards.length > 0 && (
        <div className="datapath-forward-banner">
          <span className="forward-tag-badge">⚡ DATA FORWARD (Cycle {state?.cycle})</span>
          <span className="forward-banner-msg">
            {currentForwards.map(f => f.reason).join(' · ')}
          </span>
        </div>
      )}

      <div className="pipeline-stages-row">
        {STAGES.map((stage, idx) => {
          const meta = STAGE_META[stage];
          const token = state?.pipeline?.[stage];
          const isStalledHold = last?.stalled && (stage === 'IF' || stage === 'ID');
          const isBubble = last?.stalled && stage === 'EX' && !token;

          return (
            <div
              key={stage}
              className={`stage-card ${meta.color} ${isStalledHold ? 'stalled-hold' : ''}`}
            >
              <div className="stage-card-header">
                <span className="stage-abbr">{stage}</span>
                <span className="stage-full">{meta.name}</span>
              </div>

              {token ? (
                <div className="stage-token-box active">
                  <span className="token-id-tag">I{token.id + 1}</span>
                  <span className="token-inst-text" title={token.text}>{token.text}</span>
                </div>
              ) : isBubble ? (
                <div className="stage-token-box bubble">
                  <span className="token-bubble-tag">BUBBLE</span>
                </div>
              ) : (
                <div className="stage-token-box idle">
                  <span>IDLE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="datapath-caption">
        {running
          ? '▶ Clock running... executing instruction flow.'
          : state?.status === 'completed'
          ? '✓ Program completed. Drained all stages.'
          : 'Clock stopped. Press ▷| to step or Space to run.'}
      </div>
    </div>
  );
}
