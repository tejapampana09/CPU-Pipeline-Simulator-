import {Router} from 'express';
import {generateAssemblyAi, generateTemplateAssembly} from '../services/bot1AssemblyService.js';
import {explainPipelineAi, verifyPipelineSequentially} from '../services/bot2ReviewerService.js';
import {isAiConfigured} from '../services/aiService.js';

export function teammateRoutes(service) {
  const r = Router();

  // Status endpoint: checks if Gemini AI is active
  r.get('/status', (req, res) => {
    res.json({
      success: true,
      data: {
        configured: isAiConfigured(),
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      }
    });
  });

  // ========================================================
  // BOT 1: ASSEMBLY ARCHITECT ENDPOINTS
  // ========================================================
  // AI-powered Assembly Generation (Bot 1)
  r.post(['/ai-generate', '/bot1/generate'], async (req, res, next) => {
    try {
      const {prompt} = req.body || {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({
          success: false,
          error: {code: 'INVALID_PROMPT', message: 'Prompt must be a non-empty string.'}
        });
      }
      const data = await generateAssemblyAi({prompt: prompt.trim()});
      res.json({success: true, data});
    } catch (err) {
      next(err);
    }
  });

  // Deterministic Template Generation (Bot 1 Offline)
  r.post(['/prepare', '/bot1/prepare'], (req, res) => {
    res.json({success: true, data: generateTemplateAssembly(req.body)});
  });

  // ========================================================
  // BOT 2: PIPELINE REVIEWER & OPTIMIZER ENDPOINTS
  // ========================================================
  // AI-powered Pipeline Explainer and Optimizer (Bot 2)
  r.post(['/ai-explain', '/bot2/explain'], async (req, res, next) => {
    try {
      const sessionId = req.body?.sessionId;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: {code: 'INVALID_SESSION', message: 'sessionId is required.'}
        });
      }
      const sessionState = service.get(sessionId);
      const data = await explainPipelineAi({sessionState});
      res.json({success: true, data});
    } catch (err) {
      next(err);
    }
  });

  // Deterministic Sequential Reference Verification (Bot 2 Offline)
  r.post(['/review', '/bot2/review'], (req, res) => {
    res.json({success: true, data: verifyPipelineSequentially(service.get(req.body?.sessionId))});
  });

  return r;
}
