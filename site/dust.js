import {rk4} from './dynamics.js';
import {TRACE_STRIDE,TRACER_COLORS} from './tracers.js';
// Dust shed by the pointer follows the system's own equations and is drawn onto the attractor.
export const DUST_CAPACITY=700,DUST_LIFE=9,DUST_SPEED=2.5;
export function dustOpacity(age){
  if(age<0||age>=DUST_LIFE)return 0;
  return .7*Math.min(1,age/.3)*Math.min(1,(DUST_LIFE-age)/2.5);
}
export function createDust(definition,normal,stepLength,capacity=DUST_CAPACITY){
  const states=Array.from({length:capacity},()=>null),ages=new Float32Array(capacity),colors=new Uint8Array(capacity);
  let next=0,carry=0;
  return {
    definition,
    // Normalized display coordinates in, raw state stored, so integration uses the true field.
    spawn(point){
      const i=next;next=(next+1)%capacity;
      states[i]=point.map((v,j)=>v*normal.scale+normal.center[j]);ages[i]=0;colors[i]=Math.floor(Math.random()*TRACER_COLORS.length);
    },
    step(seconds){
      carry+=seconds*DUST_SPEED/stepLength;
      const steps=Math.min(40,Math.floor(carry));carry=Math.min(carry-steps,40);
      for(let i=0;i<capacity;i++){
        if(!states[i])continue;
        ages[i]+=seconds;
        if(ages[i]>=DUST_LIFE){states[i]=null;continue;}
        let s=states[i];
        for(let k=0;k<steps;k++)s=rk4(s,definition.dt,definition.field);
        states[i]=s.every(Number.isFinite)?s:null;
      }
    },
    get active(){return states.some(Boolean);},
    // Each grain is a single point in the shared trace layout; returns how many were written.
    fill(out){
      let count=0;
      for(let i=0;i<capacity;i++){
        const s=states[i];if(!s)continue;
        const o=count*TRACE_STRIDE;
        for(let j=0;j<3;j++){const v=(s[j]-normal.center[j])/normal.scale;out[o+j]=v;out[o+3+j]=v;}
        out.set(TRACER_COLORS[colors[i]],o+6);
        const opacity=dustOpacity(ages[i]);out[o+9]=opacity;out[o+10]=opacity;out[o+11]=5;
        count++;
      }
      return count;
    },
    nearestDistances(guide){
      return states.filter(Boolean).map(s=>{
        const p=s.map((v,j)=>(v-normal.center[j])/normal.scale);
        let best=Infinity;for(const g of guide)best=Math.min(best,Math.hypot(p[0]-g[0],p[1]-g[1],p[2]-g[2]));
        return best;
      });
    }
  };
}
