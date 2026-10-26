import {GoogleGenAI} from '@google/genai';
import {parse} from '../parser/assemblyParser.js';
import {review} from '../agents/pipelineReviewer.js';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({apiKey});
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateAssemblyAi({prompt, preferredModel = DEFAULT_MODEL}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      isConfigured: false,
      message: 'GEMINI_API_KEY is missing in backend/.env. Please add your key to enable the AI Assembly Architect.'
    };
  }

  const ai = new GoogleGenAI({apiKey});

  const systemInstruction = `You are an expert Computer Organization & Architecture (COA) Assembly Architect.
Generate assembly code for a custom 5-stage pipelined CPU (IF, ID, EX, MEM, WB) with:
- NO forwarding (operands must be committed at WB before ID reads them).
- NO branch or jump instructions (loops must be completely unrolled).
- 8 signed 32-bit registers: R0, R1, R2, R3, R4, R5, R6, R7 (all writable, initial 0).
- 1024 word memory: address 0 to 1023 (initial 0).

ALLOWED INSTRUCTIONS ONLY (Case-insensitive, 1 to 200 lines):
1. LI Rd, imm        (Load Immediate: imm is -2147483648 to 2147483647)
2. ADD Rd, Rs1, Rs2  (Rd = Rs1 + Rs2)
3. SUB Rd, Rs1, Rs2  (Rd = Rs1 - Rs2)
4. AND Rd, Rs1, Rs2  (Rd = Rs1 & Rs2)
5. OR Rd, Rs1, Rs2   (Rd = Rs1 | Rs2)
6. LOAD Rd, addr     (Rd = memory[addr], addr is 0 to 1023)
7. STORE Rs, addr    (memory[addr] = Rs, addr is 0 to 1023)

CRITICAL RULES:
- Output valid assembly lines only, optionally with '#' comments.
- Do NOT use labels, JMP, BEQ, BNE, MUL, DIV or any other opcodes.
- Unroll loops manually using repeated ADD/SUB/LI instructions.
- Respond in strictly valid JSON format with keys:
  "source": string (the complete assembly program with newlines),
  "explanation": string (simple, direct explanation of what the program computes and register usage),
  "hazardsInsight": string (friendly analysis of RAW hazards/stalls created and how the pipeline will handle them).`;

  try {
    const response = await ai.models.generateContent({
      model: preferredModel,
      contents: `Generate assembly for: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim() || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) data = JSON.parse(match[0]);
      else throw new Error('Failed to parse AI response as JSON.');
    }

    if (!data.source) {
      throw new Error('AI did not return any assembly source.');
    }

    // Validate the generated assembly using authoritative parser
    parse(data.source);

    return {
      success: true,
      isConfigured: true,
      bot: 'AI Assembly Architect',
      mode: 'gemini-ai',
      source: data.source,
      explanation: data.explanation || 'Program generated for our 5-stage CPU architecture.',
      hazardsInsight: data.hazardsInsight || 'Inspect the timing table to observe RAW stalls.'
    };
  } catch (err) {
    return {
      success: false,
      isConfigured: true,
      error: err.message,
      message: `AI generation failed: ${err.message}`
    };
  }
}

export async function explainPipelineAi({sessionState, preferredModel = DEFAULT_MODEL}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const offlineReview = review(sessionState);

  if (!apiKey) {
    return {
      success: false,
      isConfigured: false,
      bot: 'Offline Pipeline Reviewer',
      mode: 'deterministic-offline',
      verdict: offlineReview.verdict,
      mismatches: offlineReview.mismatches,
      summary: offlineReview.summary,
      offlineReview,
      message: 'GEMINI_API_KEY is not configured in backend/.env. Showing offline deterministic review.'
    };
  }

  const ai = new GoogleGenAI({apiKey});

  const programSummary = (sessionState.program || []).map(p => `Line ${p.line} (PC ${p.pc}): ${p.text}`).join('\n');
  const registers = Object.entries(sessionState.registers || {})
    .filter(([_, val]) => val !== 0)
    .map(([reg, val]) => `${reg}=${val}`)
    .join(', ') || 'All 0';
  const memory = Object.entries(sessionState.memory || {})
    .map(([addr, val]) => `[${addr}]=${val}`)
    .join(', ') || 'Empty';
  const stats = sessionState.statistics || {};
  const events = (sessionState.events || []).slice(-15);

  const contextData = {
    program: programSummary,
    status: sessionState.status,
    totalCycles: sessionState.cycle,
    instructionsCompleted: stats.instructionsCompleted,
    stallCycles: stats.stalls,
    cpi: stats.cpi?.toFixed(2),
    nonZeroRegisters: registers,
    modifiedMemory: memory,
    hazardEvents: events,
    deterministicVerdict: offlineReview.verdict,
    mismatches: offlineReview.mismatches
  };

  const systemInstruction = `You are an expert, friendly Computer Organization & Architecture (COA) Teaching Assistant reviewing a student's 5-stage CPU Pipeline simulation run.
CPU Pipeline Model:
- 5 Stages: IF (Fetch), ID (Decode/RegRead), EX (Execute), MEM (Memory), WB (Writeback).
- Hazard Policy: NO Data Forwarding. Operands must be committed at WB before ID reads them.
- RAW Hazards stall the ID stage for 2 cycles (injecting EX bubbles).
- Verification Result: ${offlineReview.verdict.toUpperCase()}.

CRITICAL COMMUNICATION GUIDELINES:
1. Write in plain, friendly, conversational English that is crystal clear and easy to understand immediately.
2. Avoid confusing, convoluted textbook jargon (e.g. do not say "overshadowed by the longer 2-cycle stall").
3. For each hazard, state clearly in 1 simple sentence: "Instruction [Consumer] needed [Register] from [Producer], but it was still in progress. The CPU paused for 2 cycles until it was saved."
4. For Optimization:
   - Clearly state if the program is a sequential chain (domino effect) where every instruction directly feeds the next.
   - If independent instructions exist (e.g. unrelated LI, LOAD, arithmetic), reorder them to fill the 2-cycle delay slots and provide the exact valid assembly code in "optimizedCode".
   - If all instructions are strictly interdependent, provide a rescheduled version that demonstrates interleaved calculations without stalls!

Return valid JSON with these exact keys:
{
  "overview": "Short 2-sentence summary: The program completed with 100% correct results in [X] cycles. Due to [Y] data dependencies, the CPU had to pause for [Z] stall cycles.",
  "hazards": [
    {
      "title": "Stall on [Register]",
      "register": "R1",
      "cycles": "Cycles 5–6",
      "stalls": 2,
      "producer": "LI R1, 10",
      "consumer": "ADD R3, R1, R2",
      "explanation": "ADD needed R1 and R2, but they were still calculating. The CPU paused for 2 cycles until the values were written back to registers."
    }
  ],
  "optimizationSummary": "Plain-English verdict: can this code be reordered, or is it a strict dependency chain?",
  "optimizationTips": [
    {
      "title": "Instruction Scheduling",
      "advice": "Placing independent operations between dependent lines fills the 2-cycle wait slots so the CPU never has to pause.",
      "benefit": "Eliminates idle stall bubbles"
    }
  ],
  "forwarding": {
    "speedup": "~1.5x to ~1.7x Faster",
    "cycleComparison": "${sessionState.cycle} Cycles (No Forwarding) → ${Math.max(sessionState.cycle - stats.stalls, 5)} Cycles (With Forwarding)",
    "summary": "Data Forwarding (Bypass Unit) sends ALU results directly from EX/MEM to ID without waiting for WB.",
    "benefits": [
      "Completely eliminates all ALU-to-ALU RAW stalls (0 wait cycles).",
      "Reduces LOAD-to-use delays from 2 cycles down to just 1 cycle."
    ]
  },
  "optimizedCode": {
    "source": "string (reordered assembly code using ONLY LI, ADD, SUB, AND, OR, LOAD, STORE, R0-R7)",
    "explanation": "string (simple 1-sentence explanation of how this code runs with fewer stalls)",
    "savings": "string (e.g. 'Saves 2 to 4 stall cycles')"
  }
}`;

  try {
    const response = await ai.models.generateContent({
      model: preferredModel,
      contents: `Analyze this pipeline simulation run:\n${JSON.stringify(contextData, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim() || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) data = JSON.parse(match[0]);
      else throw new Error('Failed to parse AI response as JSON.');
    }

    // Normalize hazards into clean array of objects
    let normalizedHazards = [];
    if (Array.isArray(data.hazards)) {
      normalizedHazards = data.hazards;
    } else if (Array.isArray(data.hazardBreakdown)) {
      normalizedHazards = data.hazardBreakdown.map((item, idx) => {
        if (typeof item === 'object' && item !== null) return item;
        const regMatch = String(item).match(/R[0-7]/i);
        const cycleMatch = String(item).match(/Cycle[s]?\s*[\d–\-,\s]+/i);
        return {
          title: `RAW Hazard ${regMatch ? `(${regMatch[0].toUpperCase()})` : `#${idx + 1}`}`,
          register: regMatch ? regMatch[0].toUpperCase() : 'Reg',
          cycles: cycleMatch ? cycleMatch[0] : 'Pipeline stall',
          stalls: 2,
          explanation: String(item).replace(/\*\*/g, '').replace(/^[-•*]\s*/, '').trim()
        };
      });
    }

    // Normalize optimization tips
    let normalizedTips = [];
    if (Array.isArray(data.optimizationTips)) {
      normalizedTips = data.optimizationTips.map((tip, idx) => {
        if (typeof tip === 'object' && tip !== null) return tip;
        return {
          title: `Optimization Tip #${idx + 1}`,
          advice: String(tip).replace(/\*\*/g, '').replace(/^[-•*]\s*/, '').trim(),
          benefit: 'Reduces stall cycles'
        };
      });
    }

    // Normalize forwarding
    const forwarding = typeof data.forwarding === 'object' && data.forwarding !== null ? data.forwarding : {
      speedup: '~1.5x Speedup',
      cycleComparison: `${sessionState.cycle} Cycles → Optimized`,
      summary: data.forwardingInsight || 'Hardware Data Forwarding eliminates EX/MEM stall cycles.',
      benefits: ['Eliminates ALU RAW stalls', 'Reduces load-use delays']
    };

    // Validate and normalize optimizedCode
    let optimizedCode = null;
    if (data.optimizedCode?.source && typeof data.optimizedCode.source === 'string') {
      try {
        const cleanSrc = data.optimizedCode.source.trim();
        parse(cleanSrc);
        optimizedCode = {
          source: cleanSrc,
          explanation: data.optimizedCode.explanation || 'Reordered instructions to reduce RAW pipeline stalls.',
          savings: data.optimizedCode.savings || 'Reduced stall cycles'
        };
      } catch (_) {
        optimizedCode = null;
      }
    }

    return {
      success: true,
      isConfigured: true,
      bot: 'AI Pipeline Coach & Reviewer',
      mode: 'gemini-ai',
      verdict: offlineReview.verdict,
      mismatches: offlineReview.mismatches,
      overview: data.overview || offlineReview.summary,
      optimizationSummary: data.optimizationSummary,
      hazards: normalizedHazards,
      optimizationTips: normalizedTips,
      forwarding,
      optimizedCode,
      stats: {
        cycle: sessionState.cycle,
        stalls: stats.stalls,
        cpi: stats.cpi?.toFixed(2),
        instructionsCompleted: stats.instructionsCompleted
      }
    };
  } catch (err) {
    return {
      success: false,
      isConfigured: true,
      bot: 'Pipeline Reviewer (Fallback)',
      mode: 'deterministic-fallback',
      verdict: offlineReview.verdict,
      mismatches: offlineReview.mismatches,
      summary: offlineReview.summary,
      error: err.message,
      message: `AI analysis unavailable (${err.message}). Showing deterministic review.`
    };
  }
}
