import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACER_COLORS,TRACE_STEPS,TRACE_STRIDE,TRACE_SECONDS,RIBBON_STRIDE,trailOpacity,trajectoryLength,sampleTrajectory,fillTracers,fillTraceRibbon} from '../site/tracers.js';
const repeat=points=>Array.from({length:4},()=>points);
const rates=paths=>paths.map(p=>.45/trajectoryLength(p));
test('a tracer follows interpolated segments of the integrated path',()=>{
  const points=new Float32Array([0,0,0,4,2,0,6,4,2]),out=new Float32Array(3);
  assert.deepEqual([...sampleTrajectory(points,.25,out)],[2,1,0]);
  assert.deepEqual([...sampleTrajectory(points,.75,out)],[5,3,1]);
  assert.deepEqual([...sampleTrajectory(points,-.25,out)],[5,3,1]);
  assert.deepEqual([...sampleTrajectory(points,1,out)],[0,0,0]);
});
test('each coloured head advances along the path with a fading tail',()=>{
  const a=new Float32Array([0,0,0,10,0,0]),b=new Float32Array([0,0,0,0,20,0]);
  const pa=repeat(a),pb=repeat(b);
  const make=time=>fillTracers(pa,pb,time,rates(pa),rates(pb),new Float32Array(4*TRACE_STEPS*TRACE_STRIDE));
  const start=make(0),later=make(1),head=(TRACE_STEPS-1)*TRACE_STRIDE;
  assert(start.every(Number.isFinite));assert(later.every(Number.isFinite));
  assert(Math.abs(later[head]-start[head]-.45)<1e-6);
  assert(Math.abs(later[head+4]-start[head+4]-.45)<1e-6);
  const colors=[];
  for(let tracer=0;tracer<4;tracer++){
    const offset=tracer*TRACE_STEPS*TRACE_STRIDE;
    const rgb=[...start.slice(offset+head+6,offset+head+9)];colors.push(rgb.join(','));
    assert(rgb.every((v,j)=>Math.abs(v-TRACER_COLORS[tracer][j])<1e-6));
    assert(start[offset+9]<start[offset+head+9]);
    assert(start[offset+11]<start[offset+head+11]);
  }
  assert.equal(new Set(colors).size,4);
});
test('head identities and endpoints remain continuous when a new scene becomes active',()=>{
  const a=new Float32Array([0,0,0,10,0,0]),b=new Float32Array([0,0,0,0,20,0]),c=new Float32Array([0,0,0,0,0,30]);
  const data=(from,to)=>{const pa=repeat(from),pb=repeat(to);return fillTracers(pa,pb,4,rates(pa),rates(pb),new Float32Array(4*TRACE_STEPS*TRACE_STRIDE));};
  const first=data(a,b),second=data(b,c);
  for(let i=0;i<first.length;i+=TRACE_STRIDE){
    assert.deepEqual([...first.slice(i+3,i+6)],[...second.slice(i,i+3)]);
    assert.equal(first[i+10],second[i+9]);
  }
});
test('each coloured tracer samples its own independent trajectory',()=>{
  const paths=Array.from({length:4},(_,i)=>new Float32Array([0,i,0,10,i,0]));
  const data=fillTracers(paths,paths,3,rates(paths),rates(paths),new Float32Array(4*TRACE_STEPS*TRACE_STRIDE));
  for(let tracer=0;tracer<4;tracer++)for(let sample=0;sample<TRACE_STEPS;sample++){
    const offset=(tracer*TRACE_STEPS+sample)*TRACE_STRIDE;
    assert.equal(data[offset+1],tracer);assert.equal(data[offset+4],tracer);
  }
});
test('long histories keep their colour until the final quarter, then fade smoothly',()=>{
  assert.equal(TRACE_SECONDS,48);
  for(const age of [0,.25,.5,.75])assert.equal(trailOpacity(age),.72);
  assert(Math.abs(trailOpacity(.875)-.36)<1e-8);
  assert.equal(trailOpacity(1),0);
  assert(Math.abs(trailOpacity(.750001)-trailOpacity(.75))<1e-8);
});
test('continuous trail strips break at wrap seams instead of drawing a diagonal across the attractor',()=>{
  const trace=new Float32Array(4*TRACE_STEPS*TRACE_STRIDE);
  for(let tracer=0;tracer<4;tracer++)for(let sample=0;sample<TRACE_STEPS;sample++){
    const i=(tracer*TRACE_STEPS+sample)*TRACE_STRIDE;
    const x=sample<TRACE_STEPS/2?sample/TRACE_STEPS:2+(sample-TRACE_STEPS/2)/TRACE_STEPS;
    trace.set([x,tracer,0,x,tracer,0,1,0,0,.72,.72,3.4],i);
  }
  const out=new Float32Array(4*TRACE_STEPS*4*RIBBON_STRIDE),ranges=fillTraceRibbon(trace,out);
  assert.equal(ranges.length,4);
  for(const [first,count] of ranges){
    assert.equal(count,TRACE_STEPS*2+2);
    for(let vertex=first+2;vertex<first+count;vertex++){
      const tri=[vertex-2,vertex-1,vertex].map(v=>[...out.slice(v*RIBBON_STRIDE,v*RIBBON_STRIDE+3)]);
      if(Math.max(...tri.map(p=>p[0]))-Math.min(...tri.map(p=>p[0]))>.4){
        // A seam-spanning triangle must repeat a complete vertex and have zero area.
        const entries=[vertex-2,vertex-1,vertex].map(v=>[...out.slice(v*RIBBON_STRIDE,(v+1)*RIBBON_STRIDE)]);
        assert(entries[0].every((x,j)=>x===entries[1][j])||entries[1].every((x,j)=>x===entries[2][j]));
      }
    }
  }
  assert(out.subarray(0,ranges.at(-1).reduce((a,b)=>a+b)*RIBBON_STRIDE).every(Number.isFinite));
});
