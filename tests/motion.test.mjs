import test from 'node:test';
import assert from 'node:assert/strict';
import {ATTRACTORS,integrateAttractor,resampleTrajectory,normalFrame} from '../site/attractors.js';
import {trajectoryLength,TRACE_STEPS,TRACE_STRIDE,TRACER_COLORS} from '../site/tracers.js';
import {createDust,dustOpacity,DUST_LIFE} from '../site/dust.js';
import {createChaosIntro,rhoAt,RHO_START,RHO_END,RHO_HOPF,INTRO_SECONDS} from '../site/intro.js';
test('dust shed near a shape is drawn onto the attractor by its own equations',()=>{
  for(const definition of ATTRACTORS){
    const normal=normalFrame(definition),reference=integrateAttractor(definition);
    const guide=resampleTrajectory(reference,1500,normal),length=trajectoryLength(new Float32Array(resampleTrajectory(reference,8192,normal).flat()));
    const dust=createDust(definition,normal,length/28000,60);
    for(let i=0;i<60;i++)dust.spawn([Math.cos(i)*.45,Math.sin(i*1.7)*.45,Math.sin(i*.6)*.3]);
    const before=dust.nearestDistances(guide);
    for(let frame=0;frame<6*60;frame++)dust.step(1/60);
    const after=dust.nearestDistances(guide);
    const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
    assert(after.length>=50,definition.name+' grains must stay finite');
    assert(mean(after)<mean(before)*.6&&mean(after)<.12,definition.name+' '+mean(before).toFixed(3)+' → '+mean(after).toFixed(3));
  }
  assert.equal(dustOpacity(0),0);assert(dustOpacity(3)>.6);assert.equal(dustOpacity(DUST_LIFE),0);
});
test('the opening sweeps rho from a stable point into chaos, separating the tracers',()=>{
  assert.equal(rhoAt(0),RHO_START);assert.equal(rhoAt(100),RHO_END);
  for(let t=0;t<20;t+=.01)assert(rhoAt(t+.01)>=rhoAt(t));
  const intro=createChaosIntro(normalFrame(ATTRACTORS[0])),phases=new Set();let together=null;
  for(let frame=0;frame<INTRO_SECONDS*60+10;frame++){
    intro.step(1/60);phases.add(intro.phase);
    if(together===null&&intro.phase==='unstable')together=intro.separation();
  }
  assert(intro.done);assert.equal(intro.rho,RHO_END);
  assert.deepEqual([...phases],['settling','unstable','chaotic']);
  // The four start as one line and are pulled apart by sensitive dependence.
  assert(together<.005,'tracers should still overlap: '+together);
  assert(intro.separation()>.2,'tracers should have separated: '+intro.separation());
  for(let frame=0;frame<10*60;frame++)intro.step(1/60);
  const out=intro.fill(new Float32Array(TRACER_COLORS.length*TRACE_STEPS*TRACE_STRIDE));
  assert(out.every(Number.isFinite));
  for(let k=0;k<TRACER_COLORS.length;k++){
    const head=((k+1)*TRACE_STEPS-1)*TRACE_STRIDE;
    assert.deepEqual([...out.slice(head+6,head+9)],[...new Float32Array(TRACER_COLORS[k])]);
    assert.equal(out[head+11],24);
  }
  assert(RHO_START<RHO_HOPF&&RHO_HOPF<RHO_END);
});
