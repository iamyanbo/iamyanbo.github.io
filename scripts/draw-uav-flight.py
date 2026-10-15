"""Render the archived simulator reference flight from its recorded positions."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

root = Path(__file__).resolve().parents[1]
data = json.loads((root/'assets/uav-reference-flight.json').read_text())
samples = np.asarray(data['samples'])  # seconds, north, east, down
reference = np.asarray(data['reference'])
origin = samples[0, 1:4]
positions = samples[:, 1:4] - origin
reference -= origin
blue, ink, muted = '#2057d5', '#14213b', '#526b87'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 15,
    'text.color': ink, 'axes.labelcolor': muted, 'xtick.color': muted,
    'ytick.color': muted, 'svg.fonttype': 'none'})
fig = plt.figure(figsize=(8, 7.5), facecolor='#eafaff')
fig.text(.075, .947, 'Recorded reference flight', fontsize=25, weight='medium')
fig.text(.075, .904, '152.2 m travelled  ·  102.6 s', fontsize=15, color=muted)
ax = fig.add_axes([.12, .33, .76, .50], facecolor='none')
ax.plot(reference[:, 1], reference[:, 0], color='#8497af', linewidth=2,
        linestyle=(0, (4, 4)), label='Reference waypoints', zorder=2)
ax.plot(positions[:, 1], positions[:, 0], color=blue, linewidth=2.2,
        label='Recorded flight', zorder=3)
ax.scatter(*positions[0, [1, 0]], s=70, color=blue, edgecolor='white', zorder=5)
ax.scatter(*positions[-1, [1, 0]], s=80, color='#df7137', edgecolor='white', zorder=5)
ax.annotate('Start', positions[0, [1, 0]], xytext=(8, -18),
            textcoords='offset points', color=ink, fontsize=13)
ax.annotate('End', positions[-1, [1, 0]], xytext=(-34, 13),
            textcoords='offset points', color=ink, fontsize=13)
for i in [250, 600, 840]:
    a, b = positions[i, [1, 0]], positions[i+24, [1, 0]]
    ax.annotate('', b, xytext=a, arrowprops={'arrowstyle': '-|>', 'color': blue,
                'lw': 1.8, 'mutation_scale': 14}, zorder=4)
ax.set_aspect('equal', adjustable='datalim')
ax.margins(.13)
ax.set_xlabel('East from start (m)', labelpad=8)
ax.set_ylabel('North from start (m)', labelpad=8)
ax.legend(loc='upper left', bbox_to_anchor=(-.035, 1.13), frameon=False,
          fontsize=13, ncol=2, handlelength=2.7)
alt = fig.add_axes([.12, .115, .76, .13], facecolor='none')
alt.plot(samples[:, 0], -positions[:, 2], color=blue, linewidth=1.8)
alt.fill_between(samples[:, 0], -positions[:, 2], color=blue, alpha=.07)
alt.set_xlabel('Elapsed time (s)', labelpad=8)
alt.set_ylabel('Rise from\nstart (m)', fontsize=13, labelpad=9)
alt.set_xlim(0, samples[-1, 0])
for plot in [ax, alt]:
    plot.grid(True, color='#b6cad7', linewidth=.6, alpha=.6)
    plot.set_axisbelow(True)
    plot.spines[['top', 'right']].set_visible(False)
    for side in ['left', 'bottom']:
        plot.spines[side].set_color('#9bb2c5')
    plot.tick_params(labelsize=13, length=3)
output = root/'assets/uav-reference-flight.svg'
fig.savefig(output, metadata={'Date': None}, facecolor=fig.get_facecolor())
# Keep text selectable while using a font available in the web preview.
output.write_text(output.read_text().replace("font-family: 'DejaVu Sans'", "font-family: Arial, sans-serif"))
plt.close(fig)
