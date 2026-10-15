import {writeFileSync} from 'node:fs';
import {ATTRACTORS,POINT_COUNT,integrateAttractor,resampleTrajectory,trajectoryFrame} from '../site/attractors.js';
// Integrate once while building, rather than blocking the visitor's main thread.
const guides=[],traces=[],offsets=[[0,0,0],[.05,.025,-.04],[-.04,.09,.03],[.09,-.03,-.06]];
for(const definition of ATTRACTORS){
  const reference=integrateAttractor(definition),frame=trajectoryFrame(reference);
  guides.push(...resampleTrajectory(reference,POINT_COUNT,frame).flat());
  for(const offset of offsets){
    const initial=definition.initial.map((v,j)=>v+offset[j]);
    const independent=integrateAttractor({...definition,initial},9000);
    traces.push(...resampleTrajectory(independent,POINT_COUNT,frame).flat());
  }
}
for(const [name,points] of [['curves.bin',guides],['tracer-curves.bin',traces]]){
  const data=new Float32Array(points);
  writeFileSync(new URL('../dist/'+name,import.meta.url),new Uint8Array(data.buffer));
}
