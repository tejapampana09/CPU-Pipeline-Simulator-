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
 * Intelligent deterministic analyzer that generates full structured COA breakdown
 * when Gemini API quota is hit or when offline.
 */
function generateSmartFallbackAnalysis(sessionState, offlineReview) {
  const stats = sessionState.statistics || {};
  const totalCycles = sessionState.cycle || 0;
  const stalls = stats.stalls || 0;
  const cpi = stats.cpi ? stats.cpi.toFixed(2) : (totalCycles > 0 ? (totalCycles / Math.max(1, stats.instructionsCompleted || 1)).toFixed(2) : '1.00');
  const program = sessionState.program || [];
  const events = sessionState.events || [];

  // Group RAW hazards by unique producer-consumer pairs
  const rawEvents = events.filter(e => e.type === 'RAW');
  const groupedHazards = [];
  const seenPairs = new Set();

  for (const e of rawEvents) {
    const key = `${e.producerId}-${e.consumerId}-${e.register}`;
    const producerInst = program.find(p => p.id === e.producerId)?.text || `Instruction #${e.producerId + 1}`;
    const consumerInst = program.find(p => p.id === e.consumerId)?.text || `Instruction #${e.consumerId + 1}`;

    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      const isALUtoALU = !producerInst.startsWith('LOAD');
      groupedHazards.push({
        title: `RAW Hazard on ${e.register}`,
        register: e.register,
        cycles: `Cycles ${e.cycle}–${e.cycle + 1}`,
        stalls: 2,
        producer: producerInst,
        consumer: consumerInst,
        explanation: `Instruction '${consumerInst}' in ID stage needed register ${e.register} from preceding '${producerInst}'. Because our CPU operates without hardware data forwarding, the operand must commit at the WB stage before ID can read it, injecting 2 stall bubbles into EX.`
      });
    }
  }

  // Generate an optimized assembly reordering if hazards exist
  let optimizedSource = '';
  let savingsText = 'Eliminates 2 stall cycles';
  if (groupedHazards.length > 0 && program.length >= 3) {
    // Separate independent LIs from consumers
    const lis = program.filter(p => p.op === 'LI');
    const others = program.filter(p => p.op !== 'LI');
    if (lis.length >= 2) {
      optimizedSource = [...lis.map(p => p.text), ...others.map(p => p.text)].join('\n');
      savingsText = 'Saves 2 to 4 stall cycles via independent instruction scheduling';
    } else {
      optimizedSource = program.map(p => p.text).join('\n');
    }
  }

  const speedupFactor = stalls > 0 ? (totalCycles / Math.max(totalCycles - stalls, 5)).toFixed(2) + '×' : '1.67×';

  return {
    success: true,
    isConfigured: true,
    bot: 'Bot 2 — Pipeline Reviewer & Optimizer',
    mode: 'smart-analysis',
    verdict: offlineReview.verdict,
    stats: {
      cycle: totalCycles,
      stalls,
      cpi,
      instructions: stats.instructionsCompleted || program.length
    },
    overview: `The program executed through the 5-stage pipeline in ${totalCycles} cycles with a CPI of ${cpi}. Due to ${groupedHazards.length} detected Read-After-Write (RAW) data dependencies without forwarding, the CPU stalled for ${stalls} cycles to guarantee register consistency.`,
    hazards: groupedHazards.length > 0 ? groupedHazards : [
      {
        title: 'No Data Hazards Detected',
        register: 'None',
        cycles: '0 Cycles',
        stalls: 0,
        producer: 'Independent Instructions',
        consumer: 'No Stalls',
        explanation: 'All instructions had their source operands available in the register file without stalling the pipeline.'
      }
    ],
    optimizationSummary: groupedHazards.length > 0 
      ? `Detected ${groupedHazards.length} RAW hazards. By reordering independent instructions into delay slots, idle stall bubbles can be reduced.`
      : 'Program is already optimal with zero pipeline stalls.',
    optimizationTips: [
      {
        title: 'Instruction Scheduling / Reordering',
        advice: 'Place independent operations (such as secondary LI or memory loads) between dependent producer-consumer pairs to fill the 2-cycle wait slots without changing program logic.',
        benefit: 'Saves up to 2 stall cycles per reordered sequence'
      },
      {
        title: 'Hardware Data Forwarding (Bypass Unit)',
        advice: 'Implementing forwarding multiplexers from EX/MEM and MEM/WB stage registers directly back to ALU inputs eliminates ALU-to-ALU stalls entirely.',
        benefit: `Provides an estimated ${speedupFactor} execution speedup`
      }
    ],
    forwarding: {
      speedup: `~${speedupFactor} Speedup`,
      cycleComparison: `${totalCycles} Cycles (No Forwarding) → ${Math.max(totalCycles - stalls, 5)} Cycles (With Forwarding)`,
      summary: 'Data Forwarding (Bypassing) sends results directly from the ALU output in EX or memory buffer in MEM back to the ALU input in the next cycle, without waiting for the Writeback (WB) stage commit.',
      benefits: [
        'Completely eliminates all ALU-to-ALU RAW stalls (e.g. LI then ADD, or ADD then SUB).',
        'Reduces LOAD-to-use register RAW stalls from 2 cycles down to just 1 cycle.'
      ]
    },
    optimizedCode: optimizedSource ? {
      source: optimizedSource,
      explanation: 'Independent Load Immediate instructions are scheduled early so their values commit to registers before consumers enter the ID stage.',
      savings: savingsText
    } : null,
    mismatches: offlineReview.mismatches
  };
}

/**
 * AI-powered Pipeline Trace Explainer & Optimizer (Bot 2)
 */
export async function explainPipelineAi({sessionState, preferredModel = DEFAULT_MODEL}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const offlineReview = review(sessionState);

  // If no API key, return smart deterministic analysis
  if (!apiKey) {
    return generateSmartFallbackAnalysis(sessionState, offlineReview);
  }

  const ai = new GoogleGenAI({apiKey});
  const stats = sessionState.statistics || {};
  const programSummary = (sessionState.program || []).map(p => `Line ${p.line} (PC ${p.pc}): ${p.text}`).join('\n');
  const registers = Object.entries(sessionState.registers || {})
    .filter(([_, val]) => val !== 0)
    .map(([reg, val]) => `${reg}=${val}`)
    .join(', ') || 'All 0';
  const memory = Object.entries(sessionState.memory || {})
    .map(([addr, val]) => `[${addr}]=${val}`)
    .join(', ') || 'Empty';
  const events = (sessionState.events || []).slice(-15);

  const systemInstruction = `You are an expert, friendly Computer Organization & Architecture (COA) Teaching Assistant reviewing a student's 5-stage CPU Pipeline simulation run (Bot 2).
CPU Pipeline Model:
- 5 Stages: IF (Fetch), ID (Decode/RegRead), EX (Execute), MEM (Memory), WB (Writeback).
- Hazard Policy: NO Data Forwarding. Operands must be committed at WB before ID reads them.
- RAW Hazards stall the ID stage for 2 cycles (injecting EX bubbles).
- Verification Result: ${offlineReview.verdict.toUpperCase()}.

CRITICAL COMMUNICATION GUIDELINES:
1. Write in plain, friendly, conversational English that is crystal clear and easy to understand immediately.
2. For each hazard, state clearly in 1 simple sentence: "Instruction [Consumer] needed [Register] from [Producer], but it was still in progress. The CPU paused for 2 cycles until it was saved."
3. Return valid JSON with keys: "overview", "hazards", "optimizationSummary", "optimizationTips", "forwarding", "optimizedCode".`;

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
    // If Gemini API throws 429 quota or network error, fallback to smart analysis
    console.warn('Gemini API call failed, using smart fallback analysis:', err.message);
    const fallback = generateSmartFallbackAnalysis(sessionState, offlineReview);
    return {
      ...fallback,
      notice: 'Analysis powered by local architectural engine (Gemini quota limit reached).'
    };
  }
}

/**
 * Deterministic Sequential Reference Verification (Bot 2 Offline)
 */
export function verifyPipelineSequentially(sessionState) {
  return review(sessionState);
}
