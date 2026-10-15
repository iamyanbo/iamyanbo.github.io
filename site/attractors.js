import {rk4,lorenzDerivative} from './dynamics.js';
export const POINT_COUNT=8192;
export const ATTRACTORS=[
  {name:'Lorenz',dt:.006,burn:1300,initial:[.1,.1,.1],field:lorenzDerivative},
  {name:'Rössler',dt:.025,burn:2200,initial:[.1,0,0],field:([x,y,z])=>[-y-z,x+.2*y,.2+z*(x-5.7)]},
  {name:'Thomas',dt:.045,burn:2800,initial:[.1,0,0],field:([x,y,z])=>[Math.sin(y)-.208186*x,Math.sin(z)-.208186*y,Math.sin(x)-.208186*z]},
  {name:'Aizawa',dt:.012,burn:1000,initial:[.1,0,0],field:([x,y,z])=>[(z-.7)*x-3.5*y,3.5*x+(z-.7)*y,.6+.95*z-z*z*z/3-(x*x+y*y)*(1+.25*z)+.1*z*x*x*x]},
  {name:'Halvorsen',dt:.006,burn:1800,initial:[-5,0,0],field:([x,y,z])=>[-1.4*x-4*y-4*z-y*y,-1.4*y-4*x-4*z-z*z,-1.4*z-4*x-4*y-x*x]},
  {name:'Chen',dt:.002,burn:2500,initial:[.1,.1,.1],field:([x,y,z])=>[35*(y-x),-7*x-x*z+28*y,x*y-3*z]}
];
export function integrateAttractor(definition,count=28000){
  let state=definition.initial.slice();const points=[];
  for(let i=0;i<count+definition.burn;i++){
    state=rk4(state,definition.dt,definition.field);
    if(!state.every(Number.isFinite))throw new Error('Nonfinite trajectory: '+definition.name);
    if(i>=definition.burn)points.push(state);
  }
  return points;
}
export function trajectoryFrame(points){
  const lo=[0,1,2].map(j=>Math.min(...points.map(p=>p[j]))),hi=[0,1,2].map(j=>Math.max(...points.map(p=>p[j])));
  return {center:lo.map((v,j)=>(v+hi[j])/2),scale:Math.max(...lo.map((v,j)=>(hi[j]-v)/2))||1};
}
export function resampleTrajectory(points,count=6000,frame){
  const distances=new Float64Array(points.length);
  for(let i=1;i<points.length;i++)distances[i]=distances[i-1]+Math.hypot(...points[i].map((v,j)=>v-points[i-1][j]));
  const total=distances.at(-1),result=[];let cursor=1;
  for(let i=0;i<count;i++){
    const distance=total*i/(count-1);
    while(cursor<points.length-1&&distances[cursor]<distance)cursor++;
    const span=distances[cursor]-distances[cursor-1],t=span?(distance-distances[cursor-1])/span:0;
    result.push(points[cursor-1].map((v,j)=>v+(points[cursor][j]-v)*t));
  }
  const {center,scale}=frame??trajectoryFrame(result);
  return result.map(p=>p.map((v,j)=>(v-center[j])/scale));
}
export const smoothstep=t=>t*t*(3-2*t);
