// WB commits before ID reads. Only EX/MEM producers can block ID.
export function detectHazards(pipeline){
 if(!pipeline.ID)return [];
 return ['EX','MEM'].flatMap(stage=>{
 const producer=pipeline[stage];return producer?.dst && pipeline.ID.src.includes(producer.dst)?[{producerId:producer.id,consumerId:pipeline.ID.id,register:producer.dst,stage}]:[];
 });
}
