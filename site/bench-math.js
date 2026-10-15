export function benchPlan({weeks, increase, starts, current, goal}) {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 26 ||
      !Number.isFinite(increase) || increase < 0 || increase > 100 ||
      !Array.isArray(starts) || starts.length !== 4 ||
      ![...starts, current, goal].every(value => Number.isFinite(value) && value >= 1 && value <= 1500)) {
    throw new RangeError('Enter valid weeks and weights.');
  }
  return {
    rows: Array.from({length: weeks}, (_, week) => starts.map(start => Math.round((start + week * increase) * 100) / 100)),
    goalChange: Math.round((goal - current) * 100) / 100
  };
}
