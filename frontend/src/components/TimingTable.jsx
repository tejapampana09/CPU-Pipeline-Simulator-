import {STAGES} from '../../../shared/contracts.js';

export default function TimingTable({state}) {
  const history = state?.history || [];
  const program = state?.program || [];
  const totalCycles = state?.cycle || 0;

  // Render at least 15 cycles columns like in screenshot, or totalCycles
  const columnCount = Math.max(15, totalCycles);
  const cycleCols = Array.from({length: columnCount}, (_, i) => i + 1);

  return (
    <div className="timing-diagram-section">
      <div className="section-subhead">
        <span>
          TIMING DIAGRAM &nbsp;·&nbsp; {program.length} instr &nbsp;·&nbsp; {totalCycles} cycles
        </span>
        <span style={{fontSize: '10px', color: '#64748b'}}>cycle-accurate grid</span>
      </div>

      <div className="timing-table-scroll">
        <table className="dark-timing-table">
          <thead>
            <tr>
              <th>INSTRUCTION</th>
              {cycleCols.map(c => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {program.length > 0 ? (
              program.map(p => (
                <tr key={p.id}>
                  <th>
                    <span style={{color: '#38bdf8', marginRight: '6px'}}>#{p.id + 1}</span>
                    <span>{p.text}</span>
                  </th>
                  {cycleCols.map(c => {
                    const h = history.find(entry => entry.cycle === c);
                    if (!h) return <td key={c} style={{color: '#1a2436'}}>·</td>;

                    const stage = STAGES.find(s => h.stages[s] === p.id);
                    if (!stage) return <td key={c} style={{color: '#1a2436'}}>·</td>;

                    const isStalled = h.stalled && (stage === 'IF' || stage === 'ID');

                    return (
                      <td
                        key={c}
                        className={`cell-${stage} ${isStalled ? 'cell-stall' : ''}`}
                        title={`Cycle ${c}: ${stage}${isStalled ? ' (Stalled)' : ''}`}
                      >
                        {stage}{isStalled ? '*' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={16} style={{padding: '24px', textAlign: 'center', color: '#475569'}}>
                  Initialize a program to display cycle timing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
