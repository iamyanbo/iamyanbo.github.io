import test from 'node:test';
import assert from 'node:assert/strict';
import {benchPlan} from '../site/bench-math.js';

const original = {weeks: 5, increase: 10, starts: [145, 155, 165, 175], current: 185, goal: 225};
test('bench plan keeps four sessions and four increases across five weeks', () => {
  const result = benchPlan(original);
  assert.equal(result.rows.length, 5);
  assert.deepEqual(result.rows[0], [145, 155, 165, 175]);
  assert.deepEqual(result.rows[4], [185, 195, 205, 215]);
  assert.equal(result.goalChange, 40);
  assert.deepEqual(benchPlan({...original, goal: 315}).rows, result.rows, 'A goal must not silently set working weights.');
});
test('single weeks, zero increases and fractional loads retain their meaning', () => {
  assert.deepEqual(benchPlan({...original, weeks: 1}).rows, [original.starts]);
  assert.deepEqual(benchPlan({...original, increase: 0}).rows[4], original.starts);
  assert.deepEqual(benchPlan({...original, weeks: 2, increase: 2.5, starts: [72.5, 80, 85, 90]}).rows[1], [75, 82.5, 87.5, 92.5]);
  assert.equal(benchPlan({...original, goal: 175}).goalChange, -10);
});
test('invalid or unbounded calculator values are rejected', () => {
  for (const change of [{weeks: 0}, {weeks: 27}, {weeks: 2.5}, {increase: -5}, {increase: Infinity}, {starts: [145]}, {starts: [NaN, 155, 165, 175]}, {current: 0}, {goal: 2000}]) {
    assert.throws(() => benchPlan({...original, ...change}), RangeError);
  }
});
