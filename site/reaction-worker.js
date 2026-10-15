import {createReaction,stepReaction} from './dynamics.js';
const state=createReaction();let running=true,timer;
function send(){
  const pixels=new Uint8ClampedArray(state.v.length*4);
  for(let i=0;i<state.v.length;i++){
    const t=Math.min(1,Math.max(0,state.v[i]*3.1)),q=t*t*(3-2*t),j=i*4;
    pixels[j]=Math.round(233-205*q);pixels[j+1]=Math.round(240-161*q);
    pixels[j+2]=Math.round(251-40*q);pixels[j+3]=255;
  }
  postMessage({pixels,width:state.width,height:state.height,step:state.step},[pixels.buffer]);
}
function tick(){if(!running)return;for(let i=0;i<6;i++)stepReaction(state);send();}
// Produce a developed pattern off the main thread before the first frame.
for(let i=0;i<1400;i++)stepReaction(state);
send();timer=setInterval(tick,100);
onmessage=event=>{if(event.data.type==='running')running=event.data.value;};
