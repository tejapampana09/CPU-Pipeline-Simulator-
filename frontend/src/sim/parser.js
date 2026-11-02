// Validation uses exactly the same pure parser as the server.
import {parse} from '../../../shared/parser.js';
export function parseProgram(source){
 try{return {instructions:parse(source),errors:[]};}
 catch(e){return {instructions:[],errors:e.details?.length?e.details.map(x=>({line:x.line,message:x.reason})):[{line:1,message:e.message}]};}
}
export const REG_RE = /^R([0-7])$/i;
