/**
 * BOT 1: ASSEMBLY ARCHITECT & CODE GENERATOR SERVICE
 * Dedicated independent module for Bot 1.
 * Handles Natural Language to Assembly generation via Gemini AI
 * and deterministic template-based assembly generation.
 */

import {GoogleGenAI} from '@google/genai';
import {ISA,MEMORY_SIZE} from '../../../shared/constants.js';
import {parse} from '../parser/assemblyParser.js';
import {prepare} from '../agents/assemblyAssistant.js';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export function isBot1AiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Smart Fallback Generator when API is rate-limited or offline
 */
function generateSmartFallbackCode(prompt) {
  const p = prompt.toLowerCase();
  let source = '';
  let explanation = '';

  if (p.includes('hazard') || p.includes('raw') || p.includes('stall')) {
    source = `LI R1, 10\nLI R2, 20\nADD R3, R1, R2\nSUB R4, R3, R1\nSTORE R4, 30`;
    explanation = 'Loads 10 into R1 and 20 into R2, computes R3 = R1 + R2 (30), computes R4 = R3 - R1 (20), and stores R4 at memory address 30.';
  } else if (p.includes('swap')) {
    source = `LI R1, 45\nLI R2, 90\nSTORE R1, 10\nOR R1, R2, R2\nLOAD R2, 10`;
    explanation = 'Initializes R1=45 and R2=90. Saves R1 into memory[10], copies R2 into R1 using OR, then restores original R1 from memory into R2 to complete the swap.';
  } else if (p.includes('load-use') || p.includes('load use')) {
    source = `LI R1, 42\nSTORE R1, 5\nLOAD R2, 5\nADD R3, R2, R2\nSTORE R3, 6`;
    explanation = 'Initializes memory[5] with 42, then immediately loads from memory[5] into R2 and executes an ADD. Demonstrates a true Load-to-Use stall in the pipeline.';
  } else if (p.includes('sub') || p.includes('minus') || p.includes('subtract')) {
    source = `LI R1, 50\nLI R2, 20\nSUB R3, R1, R2\nSTORE R3, 15`;
    explanation = 'Loads 50 into R1 and 20 into R2, subtracts R2 from R1 into R3 (30), and stores the result at memory address 15.';
  } else {
    // Default addition / arithmetic
    source = `LI R1, 15\nLI R2, 25\nADD R3, R1, R2\nSTORE R3, 40`;
    explanation = 'Loads 15 into R1 and 25 into R2, adds them into R3 (15 + 25 = 40), and stores R3 into RAM memory address 40.';
  }

  parse(source);
  return {
    success: true,
    isConfigured: isBot1AiConfigured(),
    provider: 'offline',
    model: null,
    bot: 'Bot 1 — Assembly Architect',
    mode: 'smart-analysis',
    source,
    explanation,
    hazardsInsight: 'Inspect the actual trace for hazards. Stall counts depend on the forwarding setting.',
    notice: 'Offline template fallback active; request may not be fully represented.'
  };
}

/**
 * AI-powered Assembly Generation (Bot 1)
 */
export async function generateAssemblyAi({prompt, preferredModel = DEFAULT_MODEL}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {...generateSmartFallbackCode(prompt), notice: 'Offline template fallback active; supports a limited set of examples.'};
  }

  const ai = new GoogleGenAI({apiKey});

  const systemInstruction = `You are an expert Computer Organization & Architecture (COA) Assembly Architect (Bot 1).
Generate assembly code for a custom 5-stage pipelined CPU (IF, ID, EX, MEM, WB) with:
- Forwarding can be enabled or disabled by the user; explain hazards conditionally without inventing fixed stall counts.
- NO branch or jump instructions (loops must be completely unrolled).
- 8 signed 32-bit registers: R0, R1, R2, R3, R4, R5, R6, R7 (all writable, initial 0).
- 1024 word memory: address 0 to 1023 (initial 0).

ALLOWED INSTRUCTIONS ONLY (Case-insensitive, 1 to 200 lines):
${Object.values(ISA).map(s=>s.syntax+': '+s.summary).join('\n')}
Memory addresses: 0 to ${MEMORY_SIZE-1}.

CRITICAL RULES:
- Output valid assembly lines only, optionally with '#' comments.
- Do NOT use labels, JMP, BEQ, BNE, DIV or any other opcodes.
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
      provider: 'gemini',
      bot: 'Bot 1 — Assembly Architect',
      mode: 'gemini-ai',
      model: preferredModel,
      source: data.source,
      explanation: data.explanation || 'Program generated for our 5-stage CPU architecture.',
      hazardsInsight: data.hazardsInsight || 'Inspect the timing table to observe RAW stalls.'
    };
  } catch (err) {
    console.warn(`Gemini API call with ${preferredModel} failed:`, err.message);
    const fallback = generateSmartFallbackCode(prompt);
    return {
      ...fallback,
      notice: 'Gemini request failed — offline template fallback used.'
    };
  }
}

/**
 * Deterministic Template-based Assembly Generation (Bot 1 Offline)
 */
export function generateTemplateAssembly(params) {
  return prepare(params);
}
