"""Content changes for the combined portfolio; preserve the earlier design studies."""
from pathlib import Path
import re, json, html as markup

def revise_portfolio(html, root: Path):
    def change(old, new):
        nonlocal html
        assert old in html, old[:90]
        html = html.replace(old, new, 1)
    html = re.sub(r'<div class="hero-kicker">.*?</div>\n', '', html)
    html = re.sub(r'<a class="hero-scroll".*?</a>\n', '', html)
    change('Explore my work <span aria-hidden="true">↘</span>', 'Research projects <span aria-hidden="true">↘</span>')
    change('<a href="https://iamyanbo.github.io/llm-notes/">Read the essays <span aria-hidden="true">↗</span></a>', '<a href="#essays">Personal projects <span aria-hidden="true">↘</span></a>')
    change('I study how models represent language and the visual world. I build experiments and interactive explanations to understand them.',
           'A place to showcase the interesting work and projects I’ve built, and to explore models and the mathematics behind them.')
    change('<a href="#essays">Essays</a><a href="#about">About</a>', '<a href="#essays">Personal projects</a><a href="#notes">Notes</a><a href="#about">About me</a>')
    change('Questions I’m working on.', 'Current Research')
    change('<p>Visual prediction, decisions from learned representations, and the experiments that test them.</p>', '')
    change('Can a model predict what a drone will see next?', 'Long Horizon Planning for UAV Navigation')
    change('An image-goal navigation study: reproduce a released baseline, learn action-conditioned visual predictions, and examine whether those predictions help with decisions.',
           'A drone given only a goal image must work out where it is and how to get there. I’m studying how memory of earlier observations can help it choose a route.')
    change('<img class="uav-image" src="assets/uav-observation.png" width="640" height="480" alt="A simulator camera observation overlooking a city waterfront." loading="lazy">',
           '<div class="uav-task-views"><img class="uav-image" src="assets/uav-start.png" width="640" height="480" alt="Captured starting view from the UAV simulator: an aerial view along a city street." loading="lazy"><span class="uav-start-label">Start</span><div class="uav-goal-view"><span>Goal image</span><img src="assets/uav-goal.png" width="640" height="480" alt="The captured goal view for the same city navigation task." loading="lazy"></div></div>')
    change('Simulator observation from the RGB navigation work.', 'Captured start and goal images from the simulator task setup.')
    change('Does uncertainty help a model see in 3D?', 'DifficultyPainting')
    change('<span class="status">Ablation study</span>', '<span class="status">3D object detection</span>')
    change('Project semantic predictions from camera images onto LiDAR points, then test what an added entropy feature contributes. The result depends on the detector.',
           'Point painting attaches information from a 2D image to a 3D point cloud. I used this method to give a LiDAR detector an estimate of how difficult each object is to recognize.')
    change('<figure class="image-stack"><img class="scientific-image" src="assets/uncertainty.png" width="1800" height="500" alt="A road image alongside predicted semantic classes and their entropy map." loading="lazy"><img class="scientific-image" src="assets/point-cloud.png" width="1200" height="400" alt="A LiDAR point cloud colored by projected uncertainty, with coordinate axes and a color scale." loading="lazy"><figcaption><span class="image-caption-number">Fig. 02</span>From camera predictions to painted LiDAR points.</figcaption></figure>',
           '<figure><img class="scientific-image" src="assets/difficulty-overlay.png" alt="DifficultyPainting’s reported road-scene example, with object boxes coloured by predicted detection difficulty." loading="lazy"><figcaption><span class="image-caption-number">Fig. 02</span>Predicted detection difficulty in a KITTI scene. Original project visualization.</figcaption></figure>')
    change('Can predicted data help us recover the rule?', 'Reservoir Computing + SINDy')
    change('Can an agent investigate, rather than just improve a score?', 'CURI')
    change('<span class="status">Research agents</span>', '<span class="status">Research pipeline</span>')
    change('CURI starts with a question and competing explanations. It runs experiments, independently checks decisive results, and keeps the negative and inconclusive findings in the research record.',
           'A better benchmark score is not much use if I cannot explain why it improved. CURI runs experiments around competing explanations and keeps the evidence, including failed tests.')
    html = re.sub(r'<div class="project-detail">.*?</div></div>', '', html, flags=re.S)
    evidence = json.loads((root/'content/project-evidence.json').read_text(encoding='utf-8'))
    for title, entry in evidence.items():
        pattern = r'(<h3 class="project-title">'+re.escape(title)+r'</h3><p>.*?</p>)'
        result = (root/'content/difficulty-results.html').read_text(encoding='utf-8') if title == 'DifficultyPainting' else markup.escape(entry['result'])
        block = '<dl class="project-evidence"><dt>What I built</dt><dd>'+markup.escape(entry['contribution'])+'</dd><dt>Results</dt><dd>'+result+'</dd></dl><a class="evidence-source" href="'+entry['source']+'">'+markup.escape(entry['source_label'])+' ↗</a>'
        html, count = re.subn(pattern, lambda match: match[1]+block, html, count=1, flags=re.S)
        assert count == 1, title
    change('Look inside CURI <span aria-hidden="true">↗</span>', 'Inside the research loop <span aria-hidden="true">↗</span>')
    change('<a class="project-source" href="https://github.com/iamyanbo/CURI">Repository ↗</a>', '<a class="flagship-link" href="curi.html">Read the complete CURI case study <span aria-hidden="true">↗</span></a><a class="project-source" href="https://github.com/iamyanbo/CURI">Repository ↗</a>')
    change('02 / Interactive essays', '02 / Personal projects')
    change('Follow the construction.', 'Personal projects')
    change('<p>First principles, worked calculations, and diagrams you can stop and inspect.</p>', '')
    change('Understanding attention and transformers.', 'Attention, transformers, and beyond.')
    change('Consider “the dog chased the cat” and “the cat chased the dog.” The words are the same. What must a machine represent to preserve the difference?',
           'Essays on the foundations of attention and transformers, their extensions, and the miscellaneous topics surrounding them: hardware, training, inference, and the practice of working with models.')
    change('03 / Engineering', 'Code review')
    change('Tools for looking closer.', 'Tools for code review')
    change('Strata reconstructs a pull request from its history and TypeScript structure. Its component, commit, and file views let a reader inspect what changed and what depends on it.',
           'A pull request can change a function while leaving its callers untouched. I wanted to see those callers beside the edit, rather than search for them in another file. Strata brings the dependency graph into the review and lets me read the same change by component, by commit, or by file.</p><p>I can follow a call to the exact line that uses the function, leave a note, and mark the code as reviewed. If I load a later snapshot, Strata marks the code touched by new commits as unread, so I can pick up where I left off.')
    about = '<template id="case-about">'+(root/'content/about.html').read_text(encoding='utf-8')+'</template>'
    html = re.sub(r'<section class="about-section".*?</section>', '', html, flags=re.S)
    html = html.replace('</main>', (root/'content/notes-section.html').read_text(encoding='utf-8')+(root/'content/personality.html').read_text(encoding='utf-8')+'</main>')
    change('<a href="#essays">Personal projects <span aria-hidden="true">↘</span></a></div>', '<a href="#essays">Personal projects <span aria-hidden="true">↘</span></a></div><a class="hero-about-link" href="#about">A little about me <span aria-hidden="true">↘</span></a>')
    change('<img src="assets/curi-loop-v2.svg" width="760" height="560" alt="CURI\'s research loop: ask a question, admit an experiment, execute it, independently check it, and interpret the result before another experiment." loading="lazy">', (root/'content/curi-process.html').read_text(encoding='utf-8'))
    html = re.sub(r'<template id="case-point-painting">.*?</template>', lambda _: '<template id="case-point-painting">'+(root/'content/difficulty-note.html').read_text(encoding='utf-8')+'</template>', html, flags=re.S)
    change('<h2>From a goal image to a useful prediction.</h2><p>Can a drone use a picture of its destination to decide how to move? This study separates the visual predictor, the goal scorer, and the decision policy so that each can be examined.</p>', '<h2>Navigation conditioned on memory</h2><p>A goal image tells the drone where it should arrive. Its current view says where it is looking now. Neither tells it what it has already seen, which directions it has tried, or where an earlier turn led.</p><p>The research explores how memory of previous observations can condition navigation. The question is how that history can support decisions over longer routes.</p>')
    change('<h3>The construction</h3><p>A frozen visual encoder supplies patch features. An action-conditioned transformer predicts future features from observations and proposed motions. The decision stage compares candidate predictions with the goal and episode history, then acts and receives another actual observation.</p>', '<h3>Earlier prediction experiments</h3><p>The earlier model used a frozen visual encoder and an action-conditioned transformer to predict future features. These experiments preceded the current focus on memory.</p>')
    change('<img src="assets/uav-observation.png" width="640" height="480" alt="A recorded simulator observation from the public RGB navigation project."><p><small>Simulator observation from earlier navigation work; this image is not evidence of a successful policy.</small></p>',
           '<figure class="flight-trace"><img src="assets/uav-reference-flight.svg" width="800" height="750" loading="lazy" alt="A recorded simulator reference flight compared with its waypoints in a top-down plot, with altitude over time below. The route travels 152.2 metres in 102.6 seconds."><figcaption>Recorded positions from an earlier flight in AerialVLN training scene 5, using a privileged waypoint follower. This is a different task from the start/goal pair above; it shows the flight infrastructure, not a result from the current memory model.</figcaption></figure>')
    change('The newer study reproduces released-checkpoint offline UA-NWM evaluation', 'The earlier study reproduced released-checkpoint offline UA-NWM evaluation')
    change('A lower average feature error can coexist with poor decisions. The useful next question is whether predictions distinguish the candidate actions in ways that matter for reaching the goal. That requires a controlled navigation evaluation, rather than another interpretation of the prediction loss.', 'A lower average feature error can coexist with poor decisions. The current focus is what the model retains from earlier observations, and how that memory conditions its next action. Comparing navigation outcomes will matter more than the prediction loss alone.')
    html = html.replace('</body>', about+'</body>')
    change('<a href="https://github.com/iamyanbo">GitHub ↗</a></nav>', '<a href="assets/Yanbo-Cheng-resume.pdf">Résumé ↗</a><a href="mailto:yanbocheng01234@gmail.com">Contact ↗</a><a href="https://github.com/iamyanbo">GitHub ↗</a></nav>')
    html = html.replace('<a href="https://github.com/iamyanbo">Find me on GitHub ↗</a>', '<div class="footer-links"><a href="mailto:yanbocheng01234@gmail.com">Email me ↗</a><a href="https://github.com/iamyanbo">GitHub ↗</a></div>')
    change('<a class="case-link" href="https://iamyanbo.github.io/llm-notes/foundations/">', '<p class="personal-contribution">I started writing these because other explanations often gave me a formula before I understood why it was needed. I want each part to be motivated, then worked through with concrete examples and diagrams.</p><a class="case-link" href="https://iamyanbo.github.io/llm-notes/foundations/">')
    change('<a class="case-link" href="https://github.com/iamyanbo/strata">', '<p class="personal-contribution">I designed and built the whole application, including the analysis engine and the review interface.</p><a class="case-link" href="https://github.com/iamyanbo/strata">')
    # The explanation belongs at the entrance, rather than between the entrance and the work.
    change('<strong>Attractors in motion</strong>Lorenz → Rössler → Thomas → Aizawa. Scroll to move between the shapes.',
           '<strong><span class="attractor-kicker">Dynamical systems</span><span data-attractor-name>Lorenz</span></strong>'+(root/'content/why-hover.html').read_text(encoding='utf-8'))
    change('<h2 id="work-title">Current Research</h2></div></div>', '<h2 id="work-title">Current Research</h2></div></div><p class="research-authorship">I designed and built each of these projects. Reused methods and baselines are credited in the project notes.</p>')
    return html
