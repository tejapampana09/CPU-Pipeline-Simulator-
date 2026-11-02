import {api} from './simulationApi.js';
export async function runSimulation(source,options){
 const session=await api('simulations',{source,...options});
 try{return await api(`simulations/${session.sessionId}/trace`);}
 catch(error){await api(`simulations/${session.sessionId}`,undefined,'DELETE').catch(()=>{});throw error;}
}
