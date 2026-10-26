export function execute(token){
 const [a,b]=token.values??[];
 switch(token.op){case 'LI':return Number(token.args[1]);case 'ADD':return (a+b)|0;case 'SUB':return (a-b)|0;case 'AND':return a&b;case 'OR':return a|b;default:return undefined;}
}
