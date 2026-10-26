import {useState,useRef,useEffect} from 'react';
import {api} from '../api/simulationApi.js';
export function useSimulation(){
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[running,setRunning]=useState(false),[error,setError]=useState(''),[speed,setSpeed]=useState(500);
 const lock=useRef(false),live=useRef(true),runRef=useRef(false),current=useRef(null);
 useEffect(()=>()=>{live.current=false;runRef.current=false;},[]);
 function pause(){runRef.current=false;setRunning(false);}
 async function action(path,body){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await api(path,body);if(live.current){current.current=result;setState(result);if(result.status==='completed')pause();}return result;}catch(e){if(live.current){setError(e.message);pause();}}finally{lock.current=false;if(live.current)setBusy(false);}}
 async function initialize(source){pause();const old=current.current?.sessionId;const s=await action('simulations',{source});if(s&&old)api('simulations/'+old,undefined,'DELETE').catch(()=>{});}
 const step=()=>current.current&&action(`simulations/${current.current.sessionId}/step`,{});
 const reset=()=>{pause();return current.current&&action(`simulations/${current.current.sessionId}/reset`,{});};
 useEffect(()=>{if(!running||busy||!state||state.status==='completed')return;const timer=setTimeout(()=>{if(runRef.current)step();},speed);return()=>clearTimeout(timer);},[running,busy,state,speed]);
 function run(){if(!current.current||current.current.status==='completed')return;runRef.current=true;setRunning(true);}
 return {state,busy,running,error,speed,setSpeed,initialize,step,reset,run,pause};
}
