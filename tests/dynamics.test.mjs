import test from 'node:test';
import assert from 'node:assert/strict';
import {rk4,lorenzTrajectory,waveHeight,createReaction,stepReaction} from '../site/dynamics.js';
test('Lorenz integration stays finite and approaches the same path when the step is refined',()=>{
  const points=lorenzTrajectory();
  assert.equal(points.length,6500);assert(points.flat().every(Number.isFinite));
  let full=[1,1,1],half=[1,1,1];
  for(let i=0;i<80;i++){full=rk4(full,.006);half=rk4(rk4(half,.003),.003);}
  assert(Math.max(...full.map((v,i)=>Math.abs(v-half[i])))<.0001);
});
test('the displayed wave satisfies the wave equation to finite-difference precision',()=>{
  const x=1.3,y=2.1,t=.7,h=.0001,u=waveHeight(x,y,t);
  const tt=(waveHeight(x,y,t+h)-2*u+waveHeight(x,y,t-h))/(h*h);
  const xx=(waveHeight(x+h,y,t)-2*u+waveHeight(x-h,y,t))/(h*h);
  const yy=(waveHeight(x,y+h,t)-2*u+waveHeight(x,y-h,t))/(h*h);
  assert(Math.abs(tt-xx-yy)<.000001);
});
test('reaction diffusion develops a spatial pattern while concentrations remain bounded',()=>{
  const field=createReaction(80,64);
  for(let i=0;i<1500;i++)stepReaction(field);
  assert.equal(field.step,1500);
  assert([...field.u,...field.v].every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  assert(Math.max(...field.v)-Math.min(...field.v)>.2);
});
