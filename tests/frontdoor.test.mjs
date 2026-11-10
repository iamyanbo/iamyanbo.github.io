import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('dist/index.html','utf8');
test('research front door presents LLM work before selected research',()=>{
 assert.ok(html.indexOf('id="essays"')<html.indexOf('id="research"'));
 assert.ok(html.indexOf('id="project-curi"')<html.indexOf('id="project-world-model"'));
 assert.match(html,/Seeking ML research internships and research engineering opportunities/);
 assert.match(html,/href="assets\/Yanbo-Cheng-resume.pdf"/);
 assert.match(html,/mailto:yanbocheng01234@gmail.com/);
});
test('reordered scene indexes remain contiguous and preserve negative results',()=>{
 assert.deepEqual([...html.matchAll(/data-scene="(\d+)"/g)].map(x=>+x[1]),[0,1,2,3,4,5]);
 assert.match(html,/0 of 24/);
 assert.match(html,/marginal/i);
});
