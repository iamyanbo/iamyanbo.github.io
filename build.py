from pathlib import Path
import shutil,json,hashlib,re,subprocess
from portfolio_content import revise_portfolio
root=Path(__file__).resolve().parent
out=root/'dist'
out.mkdir(exist_ok=True)
subprocess.run(['node',str(root/'scripts/bake-attractors.mjs')],check=True)
version=hashlib.sha256(b''.join(p.read_bytes() for p in sorted((root/'site').iterdir()) if p.suffix in ['.js','.css'])+(out/'curves.bin').read_bytes()+(out/'tracer-curves.bin').read_bytes()).hexdigest()[:12]
for p in (root/'site').iterdir():
    if p.suffix=='.js':
        code=p.read_text(encoding='utf-8')
        code=re.sub(r"(from\s+['\"])(\./[^'\"]+\.js)(['\"])",lambda m:m[1]+m[2]+'?v='+version+m[3],code)
        code=code.replace("new Worker('./reaction-worker.js'","new Worker('./reaction-worker.js?v="+version+"'")
        (out/p.name).write_text(code,encoding='utf-8')
    else: shutil.copy2(p,out/p.name)
shutil.copytree(root/'assets',out/'assets',dirs_exist_ok=True)
# Version the filename as well as the content: deployed asset caches may ignore queries.
stylesheet='style-'+version+'.css'
(out/stylesheet).write_bytes((out/'style.css').read_bytes())
concepts=[
 {'id':'combined','name':'Portfolio','file':'index.html','number':'01','system':'Attractors in motion','description':'Lorenz → Rössler → Thomas → Aizawa. Scroll to move between the shapes.'},
 {'id':'attractor','name':'Attractor','file':'attractor.html','number':'02','system':'Lorenz attractor','description':'A trajectory through three-dimensional state space. Scroll to follow and turn it.'},
 {'id':'wave','name':'Wave','file':'wave.html','number':'03','system':'Wave equation','description':'Two wave modes form a moving surface. Scroll to change its phase and viewpoint.'},
 {'id':'field','name':'Field','file':'field.html','number':'04','system':'Reaction–diffusion','description':'A Gray–Scott field evolves in the background. Scroll to move across the pattern.'}
]
template="""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="@@SCHEME@@"><meta name="description" content="Yanbo Cheng — research in language models, visual representations, and world models. Experiments, interactive essays, and engineering."><title>Yanbo Cheng · @@NAME@@</title><link rel="icon" type="image/svg+xml" href="favicon.svg"><link rel="stylesheet" href="style.css"><script type="module" src="main.js"></script></head>
<body data-concept="@@MODE@@">
<a class="skip" href="#research">Skip to selected work</a>
<div class="system-background" aria-hidden="true"><canvas id="system-canvas"></canvas></div><div class="page-grain" aria-hidden="true"></div><div class="top-progress" id="reading-progress" aria-hidden="true"></div>
<header class="site-header"><a class="wordmark" href="#top"><span class="mark" aria-hidden="true">yc</span>Yanbo Cheng</a><button id="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button><nav id="main-nav" aria-label="Main navigation"><a href="#research">Research</a><a href="#essays">Essays</a><a href="#about">About</a><a href="https://github.com/iamyanbo">GitHub ↗</a></nav></header>
<main>
<section class="hero" id="top" aria-labelledby="hero-title">
<div class="hero-kicker">Language · Vision · World models</div>
<h1 id="hero-title">Yanbo<em>Cheng.</em></h1>
<p class="hero-description">I study how models represent language and the visual world. I build experiments and interactive explanations to understand them.</p>
<div class="hero-links"><a href="#research">Explore my work <span aria-hidden="true">↘</span></a><a href="https://iamyanbo.github.io/llm-notes/">Read the essays <span aria-hidden="true">↗</span></a></div>
<div class="hero-system-label"><strong>@@SYSTEM@@</strong>@@DESCRIPTION@@</div>
<a class="hero-scroll" href="#research" aria-label="Scroll to selected work">Selected work below</a>
</section>
<section class="work-section" id="research" aria-labelledby="work-title">
<div class="section-heading" data-reveal><div><span class="overline">01 / Selected research</span><h2 id="work-title">Questions I’m working on.</h2></div><p>Visual prediction, decisions from learned representations, and the experiments that test them.</p></div>
<article class="project" data-reveal>
<div class="project-visual"><figure><img class="uav-image" src="assets/uav-observation.png" width="640" height="480" alt="A simulator camera observation overlooking a city waterfront." loading="lazy"><figcaption><span class="image-caption-number">Fig. 01</span>Simulator observation from the RGB navigation work.</figcaption></figure></div>
<div class="project-copy"><span class="project-number">01</span><span class="status">Ongoing research</span><h3 class="project-title">Can a model predict what a drone will see next?</h3><p>An image-goal navigation study: reproduce a released baseline, learn action-conditioned visual predictions, and examine whether those predictions help with decisions.</p><div class="project-detail"><div><strong>World models</strong>Visual prediction & planning</div><div><strong>Experimental work</strong>Reproduction, training, evaluation</div></div><button class="case-link" type="button" data-case="world-model" aria-haspopup="dialog">Read the research note <span aria-hidden="true">↗</span></button></div>
</article>
<article class="project" data-reveal>
<div class="project-visual"><figure class="image-stack"><img class="scientific-image" src="assets/uncertainty.png" width="1800" height="500" alt="A road image alongside predicted semantic classes and their entropy map." loading="lazy"><img class="scientific-image" src="assets/point-cloud.png" width="1200" height="400" alt="A LiDAR point cloud colored by projected uncertainty, with coordinate axes and a color scale." loading="lazy"><figcaption><span class="image-caption-number">Fig. 02</span>From camera predictions to painted LiDAR points.</figcaption></figure></div>
<div class="project-copy"><span class="project-number">02</span><span class="status">Ablation study</span><h3 class="project-title">Does uncertainty help a model see in 3D?</h3><p>Project semantic predictions from camera images onto LiDAR points, then test what an added entropy feature contributes. The result depends on the detector.</p><div class="project-detail"><div><strong>Camera + LiDAR</strong>Semantic feature fusion</div><div><strong>Mixed result</strong>Compare two detector backbones</div></div><button class="case-link" type="button" data-case="point-painting" aria-haspopup="dialog">Inspect the experiment <span aria-hidden="true">↗</span></button></div>
</article>
</section>
<section class="essays-section" id="essays" aria-labelledby="essays-title">
<div class="section-heading" data-reveal><div><span class="overline">02 / Interactive essays</span><h2 id="essays-title">Follow the construction.</h2></div><p>First principles, worked calculations, and diagrams you can stop and inspect.</p></div>
<div class="essay-feature" data-reveal><div><span class="overline">Yanbo - LLM’s</span><h3>Understanding attention and transformers.</h3><p>Consider “the dog chased the cat” and “the cat chased the dog.” The words are the same. What must a machine represent to preserve the difference?</p><a class="case-link" href="https://iamyanbo.github.io/llm-notes/foundations/">Begin with Foundations <span aria-hidden="true">↗</span></a></div><figure><img src="assets/chasing-roles.png" width="2172" height="724" alt="A golden retriever chases a tabby; in the next scene, the tabby chases the dog." loading="lazy"></figure></div>
<div class="essay-trilogy" data-reveal><a href="https://iamyanbo.github.io/llm-notes/foundations/"><small>01 / Foundations</small>Words → representations → attention ↗</a><a href="https://iamyanbo.github.io/llm-notes/transformers/"><small>02 / Transformers in Practice</small>Architecture, learning, and generation ↗</a><a href="https://iamyanbo.github.io/llm-notes/miscellaneous/"><small>03 / Miscellaneous Topics</small>Hardware, experiments, and systems ↗</a></div>
</section>
<section class="other-work" aria-labelledby="engineering-title" data-reveal>
<div><span class="overline">03 / Engineering</span><h2 id="engineering-title">Tools for looking closer.</h2><p>Strata reconstructs a pull request from its history and TypeScript structure. Its component, commit, and file views let a reader inspect what changed and what depends on it.</p><a class="case-link" href="https://github.com/iamyanbo/strata">Explore Strata <span aria-hidden="true">↗</span></a></div><img src="assets/strata.png" width="1478" height="882" alt="Strata’s code-review interface showing changed components and a dependency graph." loading="lazy">
</section>
<section class="about-section" id="about" aria-labelledby="about-title" data-reveal>
<div><span class="overline">04 / A little about me</span><h2 id="about-title">The part I enjoy<br>is figuring it out.</h2></div><div><p>I’m interested in language models, vision-language models, and world models: how they learn representations, and how those representations become useful for prediction and action.</p><p>These projects and essays are a record of that work. I care about explaining why a method is needed, checking what an experiment actually establishes, and keeping the failures worth learning from.</p><p>You can find the public projects on <a href="https://github.com/iamyanbo">GitHub</a>, or spend some time with the <a href="https://iamyanbo.github.io/llm-notes/">interactive essays</a>.</p><details class="background-note"><summary>About this background</summary>@@BACKGROUND_NOTE@@<p>The background is an illustrative mathematical simulation, independent of the model experiments shown above. Motion can be paused; reduced-motion preferences start it still.</p></details></div>
</section>
</main>
<footer class="site-footer"><span>Yanbo Cheng</span><a href="https://github.com/iamyanbo">Find me on GitHub ↗</a></footer>
<nav class="concept-nav" aria-label="Portfolio design concepts"><span>Design previews</span>@@CONCEPT_LINKS@@</nav>
<div class="system-controls"><span class="scroll-position">scroll / <strong id="scroll-value">00</strong></span><button id="motion-toggle" type="button" aria-pressed="false">Pause motion</button></div>
<dialog class="case-dialog" id="case-dialog" aria-label="Research case study"><button id="close-case" type="button">Close ×</button><div id="case-content"></div></dialog>
<template id="case-world-model"><span class="overline">Research note / Ongoing</span><h2>From a goal image to a useful prediction.</h2><p>Can a drone use a picture of its destination to decide how to move? This study separates the visual predictor, the goal scorer, and the decision policy so that each can be examined.</p><img src="assets/uav-observation.png" width="640" height="480" alt="A recorded simulator observation from the public RGB navigation project."><p><small>Simulator observation from earlier navigation work; this image is not evidence of a successful policy.</small></p><h3>The construction</h3><p>A frozen visual encoder supplies patch features. An action-conditioned transformer predicts future features from observations and proposed motions. The decision stage compares candidate predictions with the goal and episode history, then acts and receives another actual observation.</p><h3>What has been measured</h3><p>The newer study reproduces released-checkpoint offline UA-NWM evaluation on all 1,000 AirGoal test cases, separately from its experimental architecture. An eight-step feature-prediction run reached mean validation MSE 0.0350100, against 0.0409792 for copying the current features, on 688 overlapping validation windows.</p><p>That is a 14.57% lower aggregate feature error in this setting. It is not a navigation success rate. Early horizons and vertical-only predictions still trailed persistence, and the recorded longer-goal PPO arm had zero successes in 24 training flights under its strict arrival criterion.</p><h3>Why this distinction matters</h3><p>A lower average feature error can coexist with poor decisions. The useful next question is whether predictions distinguish the candidate actions in ways that matter for reaching the goal. That requires a controlled navigation evaluation, rather than another interpretation of the prediction loss.</p><p><a href="https://github.com/iamyanbo/uav-image-goal-navigation/blob/main/docs/results/20261009/README.md">Measured results and conditions — research repository, currently private ↗</a></p><p><a href="https://github.com/iamyanbo/UAV">Earlier public navigation work ↗</a></p></template>
<template id="case-point-painting"><span class="overline">Research note / Camera–LiDAR fusion</span><h2>What does an uncertainty feature add?</h2><p>A camera supplies dense semantic predictions; LiDAR supplies sparse three-dimensional measurements. Projecting each point into the image lets us append the corresponding semantic probabilities to its features.</p><img src="assets/uncertainty.png" width="1800" height="500" alt="Road image, semantic predictions, and entropy displayed side by side."><h3>The hypothesis</h3><p>The entropy of the predicted class distribution might tell the detector where those semantic features are unreliable. To test its contribution, compare the same rich semantic features with and without the entropy channel.</p><h3>The reported ablation</h3><table><thead><tr><th scope="col">Detector</th><th scope="col">Without entropy</th><th scope="col">With entropy</th></tr></thead><tbody><tr><th scope="row">PointPillars</th><td>75.78</td><td>76.52</td></tr><tr><th scope="row">SECOND</th><td>80.17</td><td>79.08</td></tr></tbody></table><p>Repository-reported moderate mAP on the KITTI validation set. The changes are +0.74 and −1.09 percentage points respectively. These are individual reported comparisons, without multi-seed uncertainty estimates.</p><img src="assets/point-cloud.png" width="1200" height="400" alt="An uncertainty-painted LiDAR cloud."><h3>What the result suggests</h3><p>Appending entropy did not consistently help both backbones. This ablation tests the additional entropy feature; it does not, by itself, isolate the effect of using 21 semantic classes instead of a smaller class vocabulary. Those are different comparisons.</p><p><a href="https://github.com/iamyanbo/UncertaintyPainting/blob/main/evaluation_results.md">Reported results ↗</a> · <a href="https://github.com/iamyanbo/UncertaintyPainting/blob/main/src/painting.py">Point-painting implementation ↗</a></p></template>
</body></html>"""
notes={
'combined':'<p>Four independently integrated systems form the background. Each trajectory uses fourth-order Runge–Kutta and is normalized for display. The curves are computed when the site is built. As you scroll, the trajectory moves to the opposite side of the next entry. Between systems, points are paired by their spatial positions and move into the next shape before resolving back into curves. This transition is a visual construction, not a solution of interpolated equations.</p><p>Lorenz uses σ = 10, ρ = 28, β = 8/3. Rössler uses a = b = 0.2, c = 5.7. Thomas uses b = 0.208186. Aizawa uses a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1.</p><p>References: <a href="https://journals.ametsoc.org/doi/abs/10.1175/1520-0469%281963%29020%3C0130%3Adnf%3E2.0.CO%3B2">Lorenz</a>, <a href="https://sprott.physics.wisc.edu/fractals/booktext/SABOOK.HTM">Sprott’s Rössler discussion</a>, <a href="https://sprott.physics.wisc.edu/pubs/paper302.pdf">Labyrinth Chaos</a>, and <a href="https://el3ssar.github.io/TSDynamics/systems/ode/oscillatory-systems/Aizawa/">TSDynamics’ Aizawa definition</a>.</p>',
'attractor': '<p>The Lorenz system follows <code>dx/dt = 10(y − x)</code>, <code>dy/dt = x(28 − z) − y</code>, and <code>dz/dt = xy − 8z/3</code>. The trajectory is integrated with fourth-order Runge–Kutta. Scrolling extends the displayed path and turns the view.</p><p><a href="https://journals.ametsoc.org/doi/abs/10.1175/1520-0469%281963%29020%3C0130%3Adnf%3E2.0.CO%3B2">Lorenz, Deterministic Nonperiodic Flow (1963) ↗</a></p>',
'wave':'<p>The surface is a superposition of two sinusoidal modes satisfying <code>u_tt = ∇²u</code>. Each mode oscillates at the magnitude of its spatial wave vector. Scrolling changes the phase and viewpoint; the surface is drawn as a projected wire mesh.</p>',
'field':'<p>The Gray–Scott model combines local reaction with diffusion: <code>u_t = 0.16∇²u − uv² + 0.035(1 − u)</code> and <code>v_t = 0.08∇²v + uv² − (0.035 + 0.062)v</code>. A finite-difference simulation runs in a browser worker. Scrolling moves the view across the resulting field.</p><p><a href="https://groups.csail.mit.edu/mac/projects/amorphous/GrayScott/">MIT’s Gray–Scott model notes ↗</a> · <a href="https://arxiv.org/abs/patt-sol/9304003">Pearson, Complex Patterns in a Simple System ↗</a></p>'
}
for concept in concepts:
    links=''.join('<a href="'+c['file']+'"'+(' aria-current="page"' if c==concept else '')+'>'+c['number']+' '+c['name']+'</a>' for c in concepts)
    html=template
    for key,value in {'NAME':concept['name'],'MODE':concept['id'],'SYSTEM':concept['system'],'DESCRIPTION':concept['description'],'CONCEPT_LINKS':links,'BACKGROUND_NOTE':notes[concept['id']],'SCHEME':'dark' if concept['id']=='wave' else 'light'}.items(): html=html.replace('@@'+key+'@@',value)
    if concept['id']=='combined':
        html=html.replace('</section>\n<section class="essays-section"',(root/'content/project-additions.html').read_text(encoding='utf-8')+'\n</section>\n<section class="essays-section"',1)
        extra_templates=''.join('<template id="case-'+key+'">'+(root/('content/'+key+'-note.html')).read_text(encoding='utf-8')+'</template>' for key in ['sindy','curi'])
        html=html.replace('</body>',extra_templates+'</body>')
        html=revise_portfolio(html,root)
        html=html.replace('</body>','<template id="case-systems"><h2>The systems behind the curves</h2>'+notes['combined'].replace('Four independently','Six independently')+'<p>Also shown: <a href="https://el3ssar.github.io/TSDynamics/systems/ode/chaotic-attractors/Halvorsen/">Halvorsen</a> (a = 1.4), and <a href="https://el3ssar.github.io/TSDynamics/systems/ode/coupled-systems/Chen/">Chen</a> (a = 35, b = 3, c = 28).</p></template></body>')
        for key in ['world-model','point-painting','sindy','curi']:
            note=re.search(r'<template id="case-'+key+r'">(.*?)</template>',html,re.S)[1]
            note=re.sub(r'^<span class="overline">.*?</span><h2>.*?</h2>','',note,count=1,flags=re.S)
            sources={'world-model':'<a class="project-source" href="https://github.com/iamyanbo/UAV">Earlier navigation work ↗</a>','point-painting':'<a class="project-source" href="https://github.com/iamyanbo/DifficultyPainting">Code &amp; reported results ↗</a>'}
            html=re.sub(r'<button class="case-link"[^>]*data-case="'+key+r'"[^>]*>(.*?)<span.*?</button>',lambda m:'<details class="project-notes"><summary>'+m[1].strip()+'</summary><div class="note-body">'+note+'</div></details>'+sources.get(key,''),html,flags=re.S)
        strata_note='<details class="project-notes"><summary>How Strata works</summary><div class="note-body">'+(root/'content/strata-note.html').read_text(encoding='utf-8')+'</div></details>'
        html=re.sub(r'(<a class="case-link" href="https://github.com/iamyanbo/strata">.*?</a>)(</div><img)',lambda m:m[1]+strata_note+m[2],html,flags=re.S)
        # Pair each complete work entry with a full-sized attractor on the other side.
        index=[0]
        def project_panel(match):
            i=index[0];index[0]+=1
            side='right' if i%2==0 else 'left'
            key=['world-model','point-painting','sindy','curi'][i]
            content=match[1]
            heading=re.search(r'<div class="project-copy">(.*?<h3 class="project-title">.*?</h3>)',content,re.S)
            assert heading, key
            content=content.replace(heading[0],'<div class="project-copy">',1)
            content='<header class="project-heading">'+heading[1]+'</header>'+content
            return '<article class="project scene-panel" id="project-'+key+'" data-scene="'+str(i)+'" data-side="'+side+'"><div class="scene-window" aria-hidden="true"></div><div class="project-body" data-reveal>'+content+'</div></article>'
        html=re.sub(r'<article class="project" data-reveal>(.*?)</article>',project_panel,html,flags=re.S)
        start=html.index('<div class="essay-feature"')
        end=html.index('</section>',start)
        html=html[:start]+'<div class="scene-panel" data-scene="4" data-side="right"><div class="scene-window" aria-hidden="true"></div><div class="essay-body">'+html[start:end]+'</div></div>'+html[end:]
        html=re.sub(r'<section class="other-work" aria-labelledby="engineering-title" data-reveal>(.*?)</section>',r'<section class="other-work scene-panel" data-scene="5" data-side="left" aria-labelledby="engineering-title"><div class="scene-window" aria-hidden="true"></div><div class="engineering-body" data-reveal>\1</div></section>',html,flags=re.S)
        start=html.index('<nav class="concept-nav"')
        end=html.index('</nav>',start)+len('</nav>')
        controls='<details class="attractor-console"><summary>Attractors <span data-attractor-name>Lorenz</span><span aria-hidden="true">＋</span></summary><div class="attractor-options">'
        for i,name in enumerate(['Lorenz','Rössler','Thomas','Aizawa','Halvorsen','Chen']):
            controls+='<button type="button" data-attractor="'+str(i)+'" aria-pressed="false">'+name+'</button>'
        controls+='<button class="auto-attractor" type="button" data-attractor="auto" aria-pressed="true">Follow scroll</button></div></details>'
        html=html[:start]+controls+html[end:]
        html=html.replace('</main>','</main><aside class="attractor-rail" aria-hidden="true"><strong data-attractor-name>Lorenz</strong></aside>')
        html=html.replace('<strong>Attractors in motion</strong>','<strong><span class="attractor-kicker">Dynamical systems</span><span data-attractor-name>Lorenz</span></strong>')
        html=html.replace('Scroll to move between the shapes.</div>','Scroll to move between the shapes. <a class="why-link" href="#why-attractors">Why attractors? ↗</a></div>')
        html=html.replace('<span>Yanbo Cheng</span><a href="https://github.com/iamyanbo">','<span>Yanbo Cheng · <a href="attractor.html">Earlier designs</a></span><a href="https://github.com/iamyanbo">')
    html=html.replace('href="style.css"','href="'+stylesheet+'"').replace('src="main.js"','src="main.js?v='+version+'"')
    (out/concept['file']).write_text(html,encoding='utf-8')
(out/'favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="9" fill="#275cc4"/><path d="m16 21 7 15 7-15M23 36v9m23-21c-10-8-19 0-19 9s9 17 19 9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',encoding='utf-8')
(out/'curi.html').write_text((root/'content/curi-case-study.html').read_text(encoding='utf-8').replace('@@CURI_FINDINGS@@',(root/'content/curi-findings.html').read_text(encoding='utf-8')).replace('href="style.css"','href="'+stylesheet+'"').replace('<img src="assets/curi-loop-v2.svg" width="760" height="560" alt="CURI’s loop: ask and interpret, design a test, run the study, independently verify, and retain the evidence record.">',(root/'content/curi-process.html').read_text(encoding='utf-8')),encoding='utf-8')
print('Built combined portfolio and 3 earlier design previews.')

for source in (root/'content/notes').glob('*.html'):
    if source.name.endswith('.draft.html'):
        continue
    slug=source.stem
    assert re.fullmatch(r'[a-z0-9-]+',slug), 'Invalid note slug: '+slug
    page=source.read_text(encoding='utf-8').replace('@@STYLESHEET@@','/'+stylesheet).replace('@@VERSION@@',version)
    assert '@@' not in page, 'Unfinished note: '+source.name
    destination=out/'notes'/slug
    destination.mkdir(parents=True,exist_ok=True)
    (destination/'index.html').write_text(page,encoding='utf-8')
shutil.copytree(root/'1',out/'1',dirs_exist_ok=True)
(out/'.nojekyll').touch()
