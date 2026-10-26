import {LIMITS} from '../../../shared/contracts.js';
export function validOperand(value,kind){
 if(kind==='reg') return /^R[0-7]$/.test(value);
 if(!/^-?\d+$/.test(value)) return false;
 const n=Number(value);
 return Number.isInteger(n) && (kind==='addr' ? n>=0 && n<LIMITS.memory : n>=-2147483648 && n<=2147483647);
}
export function fail(message,code='VALIDATION_ERROR',status=400,details=[]){return Object.assign(new Error(message),{code,status,details});}
