function toHex32(val) {
  const n = (val ?? 0) >>> 0;
  return '0x' + n.toString(16).padStart(8, '0');
}

export default function StatePanels({state}) {
  const registers = state?.registers || {R0:0, R1:0, R2:0, R3:0, R4:0, R5:0, R6:0, R7:0};
  const memoryEntries = Object.entries(state?.memory || {});
  const pc = state?.pc ?? 0;
  const nextFetchIdx = Math.floor(pc / 4) + 1;
  const events = state?.events || [];

  // Register pairs in 2-column layout: (R0, R1), (R2, R3), (R4, R5), (R6, R7)
  const registerList = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];

  // 8086 Microprocessor register aliases for easy correlation in college labs
  const ALIAS_8086 = {
    R0: 'SP',
    R1: 'AX',
    R2: 'BX',
    R3: 'CX',
    R4: 'DX',
    R5: 'SI',
    R6: 'DI',
    R7: 'BP'
  };

  return (
    <div className="col-panel state-col">
      {/* 1. Registers Block */}
      <div className="state-block">
        <div className="state-block-header">
          <span className="block-title">REGISTERS</span>
          <span className="block-sub">32-bit (8086 Aliases)</span>
        </div>

        <div className="registers-grid-cards">
          {registerList.map(r => {
            const val = registers[r] ?? 0;
            const isNonZero = val !== 0;

            return (
              <div
                key={r}
                className={`reg-card-item ${isNonZero ? 'nonzero' : ''}`}
                title={`${r} (${ALIAS_8086[r]}): ${val} (${toHex32(val)})`}
              >
                <div className="reg-card-top">
                  <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                    <span className="reg-card-label">{r}</span>
                    <span className="reg-alias-chip">{ALIAS_8086[r]}</span>
                  </div>
                  {isNonZero && <span className="reg-active-dot" />}
                </div>
                <div className="reg-card-val-big">{val}</div>
                <div className="reg-card-hex">{toHex32(val)}</div>
              </div>
            );
          })}
        </div>

        {/* PC and Next Fetch Footer */}
        <div className="pc-status-strip">
          <div className="pc-pill-tag">
            <span style={{color: '#64748b', fontSize: '10px', marginRight: '4px', fontWeight: 700}}>PC</span>
            <span style={{color: '#0f172a', fontWeight: 800}}>{toHex32(pc).slice(0, 6)}</span>
          </div>
          <div className="next-fetch-tag">
            {nextFetchIdx <= (state?.program?.length || 0)
              ? `next fetch #${nextFetchIdx}`
              : 'program drained'}
          </div>
        </div>
      </div>

      {/* 2. Memory Block */}
      <div className="state-block">
        <div className="state-block-header">
          <span className="block-title">MEMORY</span>
          <span className="block-sub">{memoryEntries.length} words written</span>
        </div>

        <div className="memory-box">
          {memoryEntries.length > 0 ? (
            memoryEntries.map(([addr, val]) => (
              <div key={addr} className="memory-entry-card">
                <div className="mem-addr-badge">[{addr}]</div>
                <div className="mem-val-col">
                  <span className="mem-dec-val">{val}</span>
                  <span className="mem-hex-val">{toHex32(val)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="memory-empty-state">
              No stores yet. STORE writes land here in the MEM stage.
            </div>
          )}
        </div>
      </div>

      {/* 3. Event Log Block */}
      <div className="state-block">
        <div className="state-block-header">
          <span className="block-title">EVENT LOG</span>
          <span className="block-sub">cycle {state?.cycle ?? 0}</span>
        </div>

        <div className="events-box">
          <div className="event-entry">
            <span className="event-cycle">00</span>
            <span className="event-type sys">SYS</span>
            <span className="event-text">Program initialized ({state?.program?.length || 0} instructions)</span>
          </div>
          {events.map((e, idx) => (
            <div key={idx} className="event-entry">
              <span className="event-cycle">{String(e.cycle).padStart(2, '0')}</span>
              <span className="event-type raw">{e.type}</span>
              <span className="event-text">
                <strong style={{color: '#cbd5e1'}}>{e.register}</strong> · {e.reason}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
