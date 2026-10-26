import express from 'express';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();
try {
  dotenv.config({path: fileURLToPath(new URL('../../.env', import.meta.url))});
  dotenv.config({path: fileURLToPath(new URL('../.env', import.meta.url))});
} catch (_) {}

import {createService} from './services/simulationService.js';
import {simulationRoutes} from './routes/simulation.routes.js';
import {teammateRoutes} from './routes/teammate.routes.js';

export function createApp() {
  const app = express(), service = createService();
  app.disable('x-powered-by');
  app.use(express.json({limit: '40kb'}));

  app.get('/health', (req, res) => res.json({success: true, data: {status: 'ok', service: 'coa-pipeline-api'}}));
  app.use('/api/v1/simulations', simulationRoutes(service));
  app.use('/api/v1/teammates', teammateRoutes(service));

  const dist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  if (existsSync(dist)) app.use(express.static(dist));

  app.use((req, res) => res.status(404).json({success: false, error: {code: 'NOT_FOUND', message: 'Route not found'}}));
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: err.code || (status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR'),
        message: status === 500 ? 'Unexpected server error' : err.message,
        details: err.details ?? []
      }
    });
  });

  return app;
}
