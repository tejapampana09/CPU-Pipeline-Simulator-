import {Router} from 'express';
import {parse} from '../parser/assemblyParser.js';
export function simulationRoutes(service){const r=Router();const send=(res,data)=>res.json({success:true,data});
 r.post('/validate',(req,res)=>send(res,{program:parse(req.body?.source)}));
 r.post('/',(req,res)=>res.status(201).json({success:true,data:service.create(req.body?.source,{forwarding:req.body?.forwarding})}));
 r.get('/:id',(req,res)=>send(res,service.get(req.params.id)));
 r.post('/:id/step',(req,res)=>send(res,service.step(req.params.id)));
 r.post('/:id/reset',(req,res)=>send(res,service.reset(req.params.id,{forwarding:req.body?.forwarding})));
 r.post('/:id/run',(req,res)=>send(res,service.run(req.params.id,req.body?.maxCycles)));
 r.delete('/:id',(req,res)=>{service.remove(req.params.id);res.status(204).end();});return r;}
