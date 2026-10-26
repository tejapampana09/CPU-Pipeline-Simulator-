import {Router} from 'express';
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
      res.status(data.success ? 200 : (data.isConfigured ? 502 : 503)).json({success: data.success, data, error: data.success ? undefined : {message: data.message || data.error}});
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
