import {TRACE_STEPS,TRACE_STRIDE,TRACER_COLORS,trailOpacity} from './tracers.js';
// Order to chaos: the four coloured tracers start a hair apart while rho rises through the point where
// Lorenz's fixed points destabilize. They travel as one line until chaos separates them, then keep running
// as the ambient tracers, slowing to the ambient pace.
export const RHO_START=20,RHO_END=28,RHO_HOPF=24.74;
export const INTRO_HOLD=4,INTRO_RAMP=6,INTRO_LENGTH=52,INTRO_SECONDS=13,TRACER_OFFSET=.005;
const DT=.006,SIGMA=10,BETA=8/3,CAPACITY=4096,INTRO_WINDOW=2000,MAX_WINDOW=2000,AMBIENT_SPEED=.45,AMBIENT_SECONDS=48;
const COUNT=TRACER_COLORS.length;
export function rhoAt(tau){
  const u=Math.max(0,Math.min(1,(tau-INTRO_HOLD)/INTRO_RAMP));
  return RHO_START+(RHO_END-RHO_START)*u*u*(3-2*u);
}
// One RK4 step of the Lorenz field for every state in a flat array, without allocating.
function stepAll(states,rho){
  const h=DT/2;
  for(let i=0;i<states.length;i+=3){
    const x=states[i],y=states[i+1],z=states[i+2];
    const ax=SIGMA*(y-x),ay=x*(rho-z)-y,az=x*y-BETA*z;
    let px=x+ax*h,py=y+ay*h,pz=z+az*h;
    const bx=SIGMA*(py-px),by=px*(rho-pz)-py,bz=px*py-BETA*pz;
    px=x+bx*h;py=y+by*h;pz=z+bz*h;
    const cx=SIGMA*(py-px),cy=px*(rho-pz)-py,cz=px*py-BETA*pz;
    px=x+cx*DT;py=y+cy*DT;pz=z+cz*DT;
    const dx=SIGMA*(py-px),dy=px*(rho-pz)-py,dz=px*py-BETA*pz;
    states[i]=x+DT*(ax+2*bx+2*cx+dx)/6;states[i+1]=y+DT*(ay+2*by+2*cy+dy)/6;states[i+2]=z+DT*(az+2*bz+2*cz+dz)/6;
  }
}
export function createChaosIntro(normal){
  const total=Math.round(INTRO_LENGTH/DT),peak=total*1.6/INTRO_SECONDS;
  // Begin just off the stable point so the first act is a visible inward spiral.
  const point=Math.sqrt(BETA*(RHO_START-1)),start=[point+3,point+3,RHO_START+5];
  const states=new Float64Array(COUNT*3),history=new Float32Array(COUNT*CAPACITY*3);
  for(let k=0;k<COUNT;k++)for(let j=0;j<3;j++)states[k*3+j]=start[j]+TRACER_OFFSET*Math.cos(k*2.4+j*1.7);
  let steps=0,flipped=false,side=1,elapsed=0,carry=0,stride=0;
  const store=()=>{
    const slot=steps%CAPACITY;
    for(let k=0;k<COUNT;k++)for(let j=0;j<3;j++)history[(k*CAPACITY+slot)*3+j]=(states[k*3+j]-normal.center[j])/normal.scale;
  };
  store();
  // Steps per second at the ambient head speed, from the lead's recent step length.
  const ambientRate=()=>AMBIENT_SPEED/Math.max(1e-6,stride);
  return {
    get done(){return steps>=total;},
    get progress(){return Math.min(1,elapsed/INTRO_SECONDS);},
    get rho(){return rhoAt(Math.min(steps,total)*DT);},
    // settling: rho below the Hopf point; unstable: past it, still near the point; chaotic: first wing switch.
    get phase(){return flipped?'chaotic':this.rho<RHO_HOPF?'settling':'unstable';},
    step(seconds){
      elapsed+=seconds;
      let goal;
      if(elapsed<=INTRO_SECONDS)goal=Math.round(total*Math.pow(elapsed/INTRO_SECONDS,1.6));
      else{
        // After the opening, ease from its closing speed down to the ambient tracers' pace.
        const ambient=ambientRate(),rate=ambient+(peak-ambient)*Math.exp(-(elapsed-INTRO_SECONDS)/1.2);
        carry+=seconds*rate;goal=Math.max(steps,total)+Math.floor(carry);carry-=Math.floor(carry);
      }
      while(steps<goal){
        const rho=rhoAt(Math.min(steps,total)*DT),x=states[0],y=states[1],z=states[2];
        stepAll(states,rho);steps++;store();
        const length=Math.hypot(states[0]-x,states[1]-y,states[2]-z)/normal.scale;stride=stride?stride*.998+length*.002:length;
        const sign=Math.sign(states[0]);
        if(sign!==side&&rho>=RHO_HOPF)flipped=true;
        side=sign;
      }
    },
    // The four histories in the shared trace layout, styled as the ambient tracers.
    // The window shortens from the opening's long view to the ambient trail length.
    fill(out){
      const settle=smooth(Math.max(0,Math.min(1,(elapsed-INTRO_SECONDS)/3)));
      const length=Math.min(MAX_WINDOW,INTRO_WINDOW+(AMBIENT_SECONDS*ambientRate()-INTRO_WINDOW)*settle);
      const window=Math.min(steps,length),first=steps-window;
      for(let k=0;k<COUNT;k++)for(let n=0;n<TRACE_STEPS;n++){
        const along=n/(TRACE_STEPS-1),s=first+along*window,from=Math.floor(s),to=Math.min(steps,from+1),t=s-from;
        const o=(k*TRACE_STEPS+n)*TRACE_STRIDE,a=(k*CAPACITY+from%CAPACITY)*3,b=(k*CAPACITY+to%CAPACITY)*3;
        for(let j=0;j<3;j++){const v=history[a+j]+(history[b+j]-history[a+j])*t;out[o+j]=v;out[o+3+j]=v;}
        out.set(TRACER_COLORS[k],o+6);
        const head=n===TRACE_STEPS-1,opacity=head?1:trailOpacity(1-along);
        out[o+9]=opacity;out[o+10]=opacity;out[o+11]=head?24:3.4;
      }
      return out;
    },
    separation(){
      let widest=0;
      for(let a=0;a<COUNT;a++)for(let b=a+1;b<COUNT;b++)widest=Math.max(widest,Math.hypot(states[a*3]-states[b*3],states[a*3+1]-states[b*3+1],states[a*3+2]-states[b*3+2])/normal.scale);
      return widest;
    }
  };
}
const smooth=t=>t*t*(3-2*t);
