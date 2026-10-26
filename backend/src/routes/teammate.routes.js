import {Router} from 'express';
import {prepare} from '../agents/assemblyAssistant.js';
import {review} from '../agents/pipelineReviewer.js';
import {isAiConfigured, generateAssemblyAi, explainPipelineAi} from '../services/aiService.js';

export function teammateRoutes(service) {
  const r = Router();

  // AI configuration status
  r.get('/status', (req, res) => {
    res.json({
      success: true,
      data: {
        configured: isAiConfigured(),
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      }
    });
  });

  // Offline deterministic endpoints (backward compatible)
  r.post('/prepare', (req, res) => {
    res.json({success: true, data: prepare(req.body)});
  });

  r.post('/review', (req, res) => {
    res.json({success: true, data: review(service.get(req.body?.sessionId))});
  });

  // AI-powered Natural Language to Assembly endpoint
  r.post('/ai-generate', async (req, res, next) => {
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

  // AI-powered Pipeline Explainer and Optimizer endpoint
  r.post('/ai-explain', async (req, res, next) => {
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

  return r;
}
