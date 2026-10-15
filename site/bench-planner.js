import {benchPlan} from './bench-math.js';

const form = document.querySelector('#bench-plan-form');
if (form) {
  const rows = document.querySelector('#bench-plan-rows');
  const caption = document.querySelector('#bench-plan-caption');
  const status = document.querySelector('#bench-plan-status');
  const dayNames = ['day1', 'day3', 'day5', 'day7'];
  const defaults = {weeks: 5, increase: 10, current: 185, goal: 225, day1: 145, day3: 155, day5: 165, day7: 175};
  const format = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value);
  function update() {
    if (!form.checkValidity()) {
      rows.replaceChildren();
      caption.textContent = 'Bench plan · waiting for valid numbers';
      status.textContent = 'Fill in every field. Use 1–26 whole weeks, positive weights, and a weekly increase of 0–100 lb.';
      return;
    }
    const values = Object.fromEntries(Object.keys(defaults).map(name => [name, form.elements.namedItem(name).valueAsNumber]));
    const {rows: weights, goalChange} = benchPlan({...values, starts: dayNames.map(name => values[name])});
    const mine = Object.entries(defaults).every(([key, value]) => values[key] === value);
    caption.textContent = mine ? 'My five-week bench plan · lb' : 'Your bench plan · lb';
    const fragment = document.createDocumentFragment();
    weights.forEach((week, index) => {
      const row = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = String(index + 1);
      row.append(heading);
      for (const weight of week) {
        const cell = document.createElement('td');
        cell.textContent = format(weight);
        row.append(cell);
      }
      fragment.append(row);
    });
    rows.replaceChildren(fragment);
    const duration = `${values.weeks} ${values.weeks === 1 ? 'week' : 'weeks'}`;
    status.textContent = goalChange > 0
      ? `${format(values.current)} → ${format(values.goal)} lb: a ${format(goalChange)} lb goal over ${duration}.`
      : `${format(values.current)} → ${format(values.goal)} lb over ${duration}. Your goal is ${goalChange === 0 ? 'equal to' : 'below'} your current max.`;
  }
  form.hidden = false;
  form.addEventListener('input', update);
  form.addEventListener('submit', event => {event.preventDefault(); update();});
  form.addEventListener('reset', event => {
    event.preventDefault();
    for (const [name, value] of Object.entries(defaults)) form.elements.namedItem(name).value = String(value);
    update();
  });
  update();
}
