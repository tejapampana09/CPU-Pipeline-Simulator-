/**
 * BOT 1: ASSEMBLY ARCHITECT & CODE GENERATOR SERVICE
 * Dedicated independent module for Bot 1.
 * Handles Natural Language to Assembly generation via Gemini AI
 * and deterministic template-based assembly generation.
 */

import {GoogleGenAI} from '@google/genai';
import {parse} from '../parser/assemblyParser.js';
import {prepare} from '../agents/assemblyAssistant.js';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function isBot1AiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * AI-powered Assembly Generation (Bot 1)
 */
export async function generateAssemblyAi({prompt, preferredModel = DEFAULT_MODEL}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      isConfigured: false,
      bot: 'Bot 1 — Assembly Architect',
      message: 'GEMINI_API_KEY is missing in backend/.env. Please add your key to enable the AI Assembly Architect.'
    };
  }

  const ai = new GoogleGenAI({apiKey});

  const systemInstruction = `You are an expert Computer Organization & Architecture (COA) Assembly Architect (Bot 1).
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
      bot: 'Bot 1 — Assembly Architect',
      mode: 'gemini-ai',
      source: data.source,
      explanation: data.explanation || 'Program generated for our 5-stage CPU architecture.',
      hazardsInsight: data.hazardsInsight || 'Inspect the timing table to observe RAW stalls.'
    };
  } catch (err) {
    return {
      success: false,
      isConfigured: true,
      bot: 'Bot 1 — Assembly Architect',
      error: err.message,
      message: `AI generation failed: ${err.message}`
    };
  }
}

/**
 * Deterministic Template-based Assembly Generation (Bot 1 Offline)
 */
export function generateTemplateAssembly(params) {
  return prepare(params);
}
