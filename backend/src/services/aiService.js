/**
 * AI Services Bridge
 * Dispatches to independent Bot 1 and Bot 2 services.
 */

import {isBot1AiConfigured, generateAssemblyAi, generateTemplateAssembly} from './bot1AssemblyService.js';
import {isBot2AiConfigured, explainPipelineAi, verifyPipelineSequentially} from './bot2ReviewerService.js';

export function isAiConfigured() {
  return isBot1AiConfigured() || isBot2AiConfigured();
}

// Re-export Bot 1 functions
export {generateAssemblyAi, generateTemplateAssembly};

// Re-export Bot 2 functions
export {explainPipelineAi, verifyPipelineSequentially};
