import {SPEC,LIMITS} from '../../../shared/contracts.js';
import {validOperand,fail} from './validator.js';
export function parse(source){
 if(typeof source!=='string'||source.length>30000) throw fail('Source must be a string of at most 30,000 characters.');
 const errors=[],program=[];
 source.split(/\r?\n/).forEach((raw,index)=>{
  const text=raw.split('#')[0].trim().toUpperCase();if(!text)return;
  const match=text.match(/^(\w+)(?:\s+(.*))?$/);const op=match?.[1];const args=(match?.[2]??'').split(',').map(x=>x.trim());
  if(!SPEC[op]||args.length!==SPEC[op].length||!args.every((x,i)=>validOperand(x,SPEC[op][i]))){errors.push({line:index+1,source:raw,reason:'Invalid opcode, operand count, register, or integer/address range.'});return;}
  const dst=op==='STORE'?null:args[0];const src=['ADD','SUB','AND','OR'].includes(op)?args.slice(1):op==='STORE'?[args[0]]:[];
  program.push({id:program.length,pc:program.length*4,line:index+1,text,op,args,dst,src});
 });
 if(errors.length)throw fail('Assembly contains errors.','ASSEMBLY_PARSE_ERROR',400,errors);
 if(!program.length||program.length>LIMITS.instructions)throw fail('Use 1–200 instructions.');
 return program;
}
