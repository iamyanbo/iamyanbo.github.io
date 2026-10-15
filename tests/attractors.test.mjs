import test from 'node:test';
import assert from 'node:assert/strict';
import {ATTRACTORS,integrateAttractor,resampleTrajectory} from '../site/attractors.js';
import {sectionPosition,sceneWeights,ribbonData,alternatingSide,transportData,transport3DData,framing} from '../site/attractor-scene.js';
import {rk4} from '../site/dynamics.js';
test('all displayed attractors remain finite, resolved, and correctly normalized',()=>{
  for(const definition of ATTRACTORS){
    const original=integrateAttractor(definition),points=resampleTrajectory(original,3600);
    assert.equal(points.length,3600);assert(points.flat().every(Number.isFinite),definition.name);
    assert(Math.max(...points.flat().map(Math.abs))<=1.000001);
    const spans=[0,1,2].map(j=>Math.max(...points.map(p=>p[j]))-Math.min(...points.map(p=>p[j])));
    assert(spans.every(s=>s>.01),definition.name+' must retain three dimensions');
    let full=definition.initial.slice(),half=definition.initial.slice();
    for(let i=0;i<30;i++){
      full=rk4(full,definition.dt,definition.field);
      half=rk4(rk4(half,definition.dt/2,definition.field),definition.dt/2,definition.field);
    }
    assert(Math.max(...full.map((v,j)=>Math.abs(v-half[j])))<.001,definition.name+' short integration convergence');
  }
});
test('section-linked transitions have long holds, exact endpoints, and reverse continuously',()=>{
  const anchors=[1000,2200,3200],viewport=800;
  assert.equal(sectionPosition(0,anchors,viewport),0);
  assert.equal(sectionPosition(900,anchors,viewport),1);
  assert.equal(sectionPosition(2100,anchors,viewport),2);
  assert.equal(sectionPosition(3400,anchors,viewport),3);
  let previous=0;
  for(let y=0;y<=3500;y++){
    const position=sectionPosition(y,anchors,viewport);
    assert(position>=previous&&position-previous<.005);previous=position;
    const weights=sceneWeights(position);
    assert(weights.a>=0&&weights.b>=0&&weights.a+weights.b<=1.000001);
    assert(Math.abs(weights.a+weights.b-1)<1e-12,'Transitions must never fade to an empty scene');
    assert.equal(weights.to,(weights.from+1)%ATTRACTORS.length);
  }
  for(let i=0;i<4;i++)assert.equal(sceneWeights(i).a,1);
});
test('scroll layout alternates sides continuously and reverses without jumps',()=>{
  assert.deepEqual([0,1,2,3].map(alternatingSide),[0,1,0,1]);
  for(let p=0;p<3;p+=.001){
    const x=alternatingSide(p),next=alternatingSide(p+.001);
    assert(x>=0&&x<=1);assert(Math.abs(next-x)<=.001001);
  }
  assert.equal(alternatingSide(-1),0);assert.equal(alternatingSide(4),0);
});
test('six work entries each show a distinct system and continue to alternate sides',()=>{
  const anchors=[1000,2200,3200,4400,5600];
  assert.equal(sectionPosition(7000,anchors,800),5);
  assert.equal(sceneWeights(4).from,4);assert.equal(sceneWeights(5).from,5);
  assert.equal(sceneWeights(3.5).from,3);assert.equal(sceneWeights(3.5).to,4);
  assert.equal(sceneWeights(5.5).to,0);
  assert.deepEqual([0,1,2,3,4,5].map(alternatingSide),[0,1,0,1,0,1]);
});
test('particle handoffs preserve both endpoint point sets and match spatial regions',()=>{
  const a=[[-.8,-.6,0],[.6,.7,.5],[.1,-.5,1]],b=[a[2],a[0],a[1]];
  const data=transportData(a,b);
  assert.equal(data.length,18);assert(data.every(Number.isFinite));
  const start=[],end=[];
  for(let i=0;i<data.length;i+=6){
    const p=[...data.slice(i,i+3)],q=[...data.slice(i+3,i+6)];
    assert.deepEqual(p,q,'Reordering identical point sets should produce stationary particles');start.push(p);end.push(q);
  }
  const round=p=>p.map(v=>Number(v.toFixed(5))).join(',');
  assert.deepEqual(start.map(round).sort(),a.map(round).sort());
  assert.deepEqual(end.map(round).sort(),b.map(round).sort());
});
test('ribbon geometry keeps every segment endpoint and path parameter intact',()=>{
  const points=new Float32Array([0,0,0,1,2,3,4,5,6]);
  const data=ribbonData(points);
  assert.equal(data.length,2*6*9);
  assert(data.every(Number.isFinite));
  for(let segment=0;segment<2;segment++)for(let corner=0;corner<6;corner++){
    const offset=(segment*6+corner)*9,end=data[offset+6];
    assert.deepEqual([...data.slice(offset,offset+3)],[...points.slice(segment*3,segment*3+3)]);
    assert.deepEqual([...data.slice(offset+3,offset+6)],[...points.slice(segment*3+3,segment*3+6)]);
    assert.equal(data[offset+8],(segment+end)/2);
    assert.equal(Math.abs(data[offset+7]),1);
  }
});
test('rotating handoffs retain original 3D endpoints and their colour coordinates',()=>{
  const a=new Float32Array([1,2,3,4,5,6,7,8,9]),b=new Float32Array([7,6,5,4,3,2,1,0,-1]);
  const pa=[[-.8,-.6,0],[.6,.7,.5],[.1,-.5,1]],pb=[[.5,.4,0],[-.4,-.6,.5],[.1,.8,1]];
  const data=transport3DData(a,b,pa,pb),origins=[],destinations=[];
  for(let i=0;i<data.length;i+=8){
    const from=Math.round(data[i+6]*2),to=Math.round(data[i+7]*2);
    assert.deepEqual([...data.slice(i,i+3)],[...a.slice(from*3,from*3+3)]);
    assert.deepEqual([...data.slice(i+3,i+6)],[...b.slice(to*3,to*3+3)]);
    origins.push(from);destinations.push(to);
  }
  assert.deepEqual(origins.sort(),[0,1,2]);assert.deepEqual(destinations.sort(),[0,1,2]);
});
test('the camera orbit fits each trajectory inside its reserved area',()=>{
  for(let index=0;index<ATTRACTORS.length;index++){
    const points=new Float32Array(resampleTrajectory(integrateAttractor(ATTRACTORS[index]),1000).flat());
    const frame=framing(points,index);
    for(let pose=0;pose<47;pose++){
      const yaw=frame.yaw+Math.sin(pose)*.28,pitch=frame.pitch+Math.sin(pose*.7)*.06;
      const c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      for(let i=0;i<points.length;i+=3){
        const [x,y,z]=points.slice(i,i+3),a=x*c-y*s,b=x*s+y*c,factor=1+.08*(b*cp+z*sp);
        assert(Math.abs((a*factor-frame.x)*frame.scale)<.93);
        assert(Math.abs(((b*sp-z*cp)*factor-frame.y)*frame.scale)<.93);
      }
    }
  }
});
