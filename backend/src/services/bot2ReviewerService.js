/**
 * BOT 2: PIPELINE REVIEWER & OPTIMIZER SERVICE
 * Dedicated independent module for Bot 2.
 * Handles AI-powered microarchitectural analysis, stall breakdowns,
 * optimization recommendations, data forwarding speedup analysis,
 * and deterministic sequential interpreter verification.
 */

import {GoogleGenAI} from '@google/genai';
import {review} from '../agents/pipelineReviewer.js';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function isBot2AiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * AI-powered Pipeline Trace Explainer & Optimizer (Bot 2)
 */
export async function explainPipelineAi({sessionState, preferredModel = DEFAULT_MODEL}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const offlineReview = review(sessionState);

  if (!apiKey) {
    return {
      success: false,
      isConfigured: false,
      bot: 'Bot 2 — Pipeline Reviewer',
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

  const systemInstruction = `You are an expert, friendly Computer Organization & Architecture (COA) Teaching Assistant reviewing a student's 5-stage CPU Pipeline simulation run (Bot 2).
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
      contents: `Explain this simulation trace:\n${JSON.stringify({
        program: programSummary,
        cycles: sessionState.cycle,
        instructions: stats.instructionsCompleted,
        stalls: stats.stalls,
        cpi: stats.cpi?.toFixed(2),
        registers,
        memory,
        events,
        verdict: offlineReview.verdict
      }, null, 2)}`,
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

    return {
      success: true,
      isConfigured: true,
      bot: 'Bot 2 — Pipeline Reviewer & Optimizer',
      mode: 'gemini-ai',
      verdict: offlineReview.verdict,
      stats: {
        cycle: sessionState.cycle,
        stalls: stats.stalls ?? 0,
        cpi: stats.cpi?.toFixed(2) ?? '1.00',
        instructions: stats.instructionsCompleted ?? 0
      },
      overview: data.overview || 'The simulation executed through the 5-stage pipeline.',
      hazards: Array.isArray(data.hazards) ? data.hazards : [],
      optimizationSummary: data.optimizationSummary || '',
      optimizationTips: Array.isArray(data.optimizationTips) ? data.optimizationTips : [],
      forwarding: data.forwarding || null,
      optimizedCode: data.optimizedCode || null,
      mismatches: offlineReview.mismatches
    };
  } catch (err) {
    return {
      success: false,
      isConfigured: true,
      bot: 'Bot 2 — Pipeline Reviewer & Optimizer',
      verdict: offlineReview.verdict,
      mismatches: offlineReview.mismatches,
      summary: offlineReview.summary,
      offlineReview,
      error: err.message,
      message: `AI analysis failed: ${err.message}`
    };
  }
}

/**
 * Deterministic Sequential Reference Verification (Bot 2 Offline)
 */
export function verifyPipelineSequentially(sessionState) {
  return review(sessionState);
}
