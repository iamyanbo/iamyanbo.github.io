export const TRACER_COLORS=[[.08,.30,.85],[.92,.37,.13],[.69,.15,.66],[.02,.55,.64]];
export const TRACE_STEPS=1024;
export const TRACE_STRIDE=12;
export const TRACE_SECONDS=48;
export const RIBBON_STRIDE=19;
export function trailOpacity(age){
  const taper=Math.max(0,Math.min(1,(age-.75)/.25));
  return .72*(1-taper*taper*(3-2*taper));
}
export function trajectoryLength(points){
  let length=0;
  for(let i=3;i<points.length;i+=3)length+=Math.hypot(points[i]-points[i-3],points[i+1]-points[i-2],points[i+2]-points[i-1]);
  return length;
}
export function sampleTrajectory(points,phase,out,offset=0){
  const count=points.length/3,p=((phase%1)+1)%1*(count-1),from=Math.floor(p)*3,to=Math.min(from+3,points.length-3),t=p-Math.floor(p);
  for(let j=0;j<3;j++)out[offset+j]=points[from+j]+(points[to+j]-points[from+j])*t;
  return out;
}
function seamFade(phase){
  const p=((phase%1)+1)%1;
  return Math.min(1,p/.004,(1-p)/.004);
}
export function fillTracers(a,b,time,rateA,rateB,out){
  let offset=0;
  for(let tracer=0;tracer<TRACER_COLORS.length;tracer++){
    const seed=.071+tracer*.237,phaseA=seed+time*rateA[tracer],phaseB=seed+time*rateB[tracer];
    for(let step=TRACE_STEPS-1;step>=0;step--){
      const age=step*TRACE_SECONDS/(TRACE_STEPS-1);
      sampleTrajectory(a[tracer],phaseA-age*rateA[tracer],out,offset);
      sampleTrajectory(b[tracer],phaseB-age*rateB[tracer],out,offset+3);
      out.set(TRACER_COLORS[tracer],offset+6);
      const opacity=step===0?1:trailOpacity(step/(TRACE_STEPS-1));
      out[offset+9]=opacity*seamFade(phaseA-age*rateA[tracer]);
      out[offset+10]=opacity*seamFade(phaseB-age*rateB[tracer]);
      out[offset+11]=step===0?12:3.4;
      offset+=TRACE_STRIDE;
    }
  }
  return out;
}
// Joined triangle strips keep long trails continuous at every display scale.
// Degenerate vertices break the finite sampled curve at its wrap seam.
export function fillTraceRibbon(trace,out,ranges=[]){
  let cursor=0;ranges.length=0;
  const distant=(a,b)=>{
    for(let base=0;base<=3;base+=3){
      const x=trace[a+base]-trace[b+base],y=trace[a+base+1]-trace[b+base+1],z=trace[a+base+2]-trace[b+base+2];
      if(x*x+y*y+z*z>.16)return true;
    }
    return false;
  };
  const put=(i,next,side)=>{
    for(let j=0;j<12;j++)out[cursor+j]=trace[i+j];
    for(let j=0;j<6;j++)out[cursor+12+j]=trace[next+j];
    out[cursor+11]=1.25;out[cursor+18]=side;cursor+=RIBBON_STRIDE;
  };
  for(let tracer=0;tracer<TRACER_COLORS.length;tracer++){
    const start=tracer*TRACE_STEPS*TRACE_STRIDE,first=cursor/RIBBON_STRIDE;
    for(let step=0;step<TRACE_STEPS;step++){
      const i=start+step*TRACE_STRIDE,previous=i-TRACE_STRIDE;
      let next=step<TRACE_STEPS-1?i+TRACE_STRIDE:previous;
      if(distant(i,next))next=step>0&&!distant(i,previous)?previous:i;
      if(step>0&&distant(i,previous)){
        out.set(out.subarray(cursor-RIBBON_STRIDE,cursor),cursor);cursor+=RIBBON_STRIDE;
        put(i,next,-1);
      }
      // The last point uses the previous tangent: keep the strip's side order.
      const sign=next<i?-1:1;
      put(i,next,-sign);put(i,next,sign);
    }
    ranges.push([first,cursor/RIBBON_STRIDE-first]);
  }
  return ranges;
}
