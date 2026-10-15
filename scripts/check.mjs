import {readFile,access,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ATTRACTORS,POINT_COUNT} from '../site/attractors.js';
for(const file of ['index.html','attractor.html','wave.html','field.html','curi.html']){
  const html=await readFile('dist/'+file,'utf8');
  assert(!html.includes('@@'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const match of html.matchAll(/aria-labelledby="([^"]+)"/g))for(const id of match[1].split(' '))assert(ids.includes(id),'Missing accessible heading: '+id);
  for(const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
    const target=match[1];
    if(target.startsWith('#'))assert(ids.includes(target.slice(1)),target);
    else if(!/^[a-z]+:/i.test(target)){
      const [path,fragment]=target.split('#'),local=path.split('?')[0];await access('dist/'+local);
      if(fragment){const destination=await readFile('dist/'+local,'utf8');assert(destination.includes('id="'+fragment+'"'),'Missing cross-page fragment: '+target);}
    }
  }
  if(file==='curi.html'){assert(html.includes('214'));assert(html.includes('id="reproduce"'));continue;}
  assert(html.includes('id="motion-toggle"'));assert(html.includes('<dialog'));
  assert.equal((html.match(/class="project(?: scene-panel)?"/g)||[]).length,file==='index.html'?4:2);
  if(file==='index.html'){
    assert.equal((html.match(/class="project-notes"/g)||[]).length,5);
    assert.deepEqual([...html.matchAll(/data-scene="(\d+)"/g)].map(m=>Number(m[1])),[0,1,2,3,4,5]);
  }
}
for(const file of (await readdir('dist')).filter(name=>name.endsWith('.js'))){
  const code=await readFile('dist/'+file,'utf8');
  for(const match of code.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g))await access('dist/'+match[1].split('?')[0]);
}
const bytes=await readFile('dist/curves.bin');
assert.equal(bytes.byteLength,ATTRACTORS.length*POINT_COUNT*3*4,'Baked geometry must contain all complete trajectories');
const coordinates=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
assert(coordinates.every(Number.isFinite),'Baked geometry must be finite');
const traceBytes=await readFile('dist/tracer-curves.bin');
assert.equal(traceBytes.byteLength,ATTRACTORS.length*4*POINT_COUNT*3*4);
const tracePoints=new Float32Array(traceBytes.buffer.slice(traceBytes.byteOffset,traceBytes.byteOffset+traceBytes.byteLength)),traceSize=POINT_COUNT*3;
assert(tracePoints.every(Number.isFinite));
assert(tracePoints.every(x=>Math.abs(x)<1.4),'Tracer trajectories must remain within the display envelope');
for(let system=0;system<ATTRACTORS.length;system++)for(let path=1;path<4;path++){
  const start=(system*4+path)*traceSize,previous=start-traceSize;
  assert(tracePoints.subarray(start,start+traceSize).some((x,i)=>Math.abs(x-tracePoints[previous+i])>.01),'Each tracer must have a different integrated path');
}
console.log('Verified combined portfolio and three earlier concepts, local assets, links, controls, and modules.');
