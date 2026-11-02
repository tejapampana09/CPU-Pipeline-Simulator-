import {GoogleGenAI} from '@google/genai';
import {review} from '../agents/pipelineReviewer.js';
import {executeTrace} from './traceService.js';
const DEFAULT_MODEL=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';
export const isBot2AiConfigured=()=>Boolean(process.env.GEMINI_API_KEY?.trim());

function analyze(s){
 const verified=review(s),parallel=s.mode==='parallel';
 const events=s.events.filter(e=>e.type==='RAW');
 const groups=new Map();
 for(const e of events){const key=`${e.producerId}:${e.consumerId}:${e.register}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 const hazards=[...groups.values()].map(es=>({title:`RAW hazard on ${es[0].register}`,register:es[0].register,
  cycles:es.map(e=>e.cycle).join(', '),stalls:es.length,
  producer:s.program[es[0].producerId].text,consumer:s.program[es[0].consumerId].text,
  explanation:`${es.length} recorded stall cycle(s), forwarding ${s.forwarding?'on':'off'}.`}));
 let forwarding=null;
 if(!parallel){
  const off=executeTrace(s.program,{forwarding:false}).at(-1).cycle;
  const on=executeTrace(s.program,{forwarding:true}).at(-1).cycle;
  forwarding={speedup:`${(off/on).toFixed(2)}×`,cycleComparison:`${off} cycles (off) → ${on} cycles (on)`,
   summary:`Measured by executing this program with forwarding off (${off} cycles) and on (${on} cycles).`,benefits:[]};
 }
 return {success:true,isConfigured:isBot2AiConfigured(),provider:'offline',model:null,mode:'smart-analysis',
  bot:'Bot 2 — Pipeline Reviewer & Optimizer',verdict:verified.verdict,mismatches:verified.mismatches,
  stats:{cycle:s.cycle,stalls:s.statistics.stalls,cpi:s.statistics.cpi?.toFixed(2)??'—',instructions:s.statistics.instructionsCompleted},
  overview:`${parallel?'Dependency scheduling model':'Five-stage pipeline; forwarding '+(s.forwarding?'on':'off')}. ${s.statistics.instructionsCompleted} instructions completed in ${s.cycle} cycles. Sequential verification: ${verified.verdict}.`,
  hazards,forwarding,optimizedCode:null,optimizationTips:[],optimizationSummary:'Reordering requires register, memory and output dependency checks. No unverified rewrite is applied.'};
}
export async function explainPipelineAi({sessionState,preferredModel=DEFAULT_MODEL}){
 const result=analyze(sessionState);
 if(!isBot2AiConfigured())return result;
 try{
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY.trim()});
  const response=await ai.models.generateContent({model:preferredModel,contents:JSON.stringify({analysis:result,program:sessionState.program,events:sessionState.events}),config:{responseMimeType:'application/json',systemInstruction:'Explain the supplied verified simulation facts in plain English. Respect the actual execution mode and forwarding setting. Return JSON with overview only. Do not invent cycle counts, speedups, or optimized programs.'}});
  const data=JSON.parse(response.text||'{}');
  return {...result,provider:'gemini',model:preferredModel,mode:'gemini-ai',overview:typeof data.overview==='string'?data.overview:result.overview};
 }catch{return {...result,notice:'Gemini request failed — offline fallback used.'};}
}
export const verifyPipelineSequentially=review;
