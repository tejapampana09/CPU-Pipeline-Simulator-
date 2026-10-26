import {parse} from '../parser/assemblyParser.js';
import {fail} from '../parser/validator.js';
export function prepare({operation='ADD',a=10,b=20,address=30}={}){
 if(!['ADD','SUB','AND','OR'].includes(operation)||![a,b,address].every(Number.isInteger))throw fail('Choose ADD, SUB, AND or OR and integer inputs.');
 const source=`LI R1, ${a}\nLI R2, ${b}\n${operation} R3, R1, R2\nSTORE R3, ${address}`;parse(source);
 return {bot:'Assembly Assistant',mode:'deterministic',source,explanation:`Loads operands into R1/R2, applies ${operation}, stores R3 at word address ${address}. The reviewer independently checks the final state.`};
}
