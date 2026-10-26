export const readMemory=(memory,address)=>memory[address]??0;
export const writeMemory=(memory,address,value)=>{memory[address]=value|0;};
