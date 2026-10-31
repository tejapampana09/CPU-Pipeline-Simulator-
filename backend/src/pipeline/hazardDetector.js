// WB commits before ID reads. Only EX/MEM producers can block ID when forwarding is off.
// When hardware forwarding is enabled, only Load-Use dependencies require a 1-cycle stall.
export function detectHazards(pipeline, forwarding = false){
 if(!pipeline.ID)return [];
 if(!forwarding){
   return ['EX','MEM'].flatMap(stage=>{
     const producer=pipeline[stage];return producer?.dst && pipeline.ID.src.includes(producer.dst)?[{producerId:producer.id,consumerId:pipeline.ID.id,register:producer.dst,stage}]:[];
   });
 }
 const ex = pipeline.EX;
 if(ex && ex.op === 'LOAD' && ex.dst && pipeline.ID.src.includes(ex.dst)){
   return [{producerId: ex.id, consumerId: pipeline.ID.id, register: ex.dst, stage: 'EX', isLoadUse: true}];
 }
 return [];
}
