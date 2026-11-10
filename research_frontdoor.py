"""Research-first presentation; project evidence and earlier design previews stay intact."""
import re

def research_frontdoor(html):
    html = html.replace('A place to showcase the interesting work and projects I’ve built, and to explore models and the mathematics behind them.', 'I study language models, visual representations, and how they support prediction and planning.')
    html = html.replace('<div class="hero-links">', '<p class="research-position">MASc student · Systems Design Engineering · University of Waterloo</p><p class="research-availability">Seeking ML research internships and research engineering opportunities.</p><div class="hero-links">', 1)
    start = html.index('<div class="hero-links">')
    end = html.index('</div>', start) + len('</div>')
    html = html[:start] + '''<div class="hero-links"><a href="#essays">LLM work <span aria-hidden="true">↘</span></a><a href="#research">Research projects <span aria-hidden="true">↘</span></a><a href="assets/Yanbo-Cheng-resume.pdf">CV / résumé <span aria-hidden="true">↗</span></a><a href="mailto:yanbocheng01234@gmail.com">Contact <span aria-hidden="true">↗</span></a></div>''' + html[end:]
    html = html.replace('<a href="#research">Research</a><a href="#essays">Personal projects</a>', '<a href="#essays">LLM work</a><a href="#research">Research</a>')
    html = html.replace('02 / Personal projects', '01 / Language models').replace('<h2 id="essays-title">Personal projects</h2>', '<h2 id="essays-title">Inside language models.</h2>')
    html = html.replace('01 / Selected research', '02 / Selected research').replace('<h2 id="work-title">Current Research</h2>', '<h2 id="work-title">Research, with the evidence.</h2>')
    html = html.replace('<span class="overline">Yanbo - LLM’s</span>', '<span class="overline">Interactive technical essays</span>')
    # Move language-model work ahead of the research archive, not into a secondary bucket.
    essay = re.search(r'<section class="essays-section".*?</section>', html, re.S)
    section = essay[0]
    html = html[:essay.start()] + html[essay.end():]
    html = html.replace('<section class="work-section"', section+'\n<section class="work-section"', 1)
    # CURI leads selected research; retain stable project anchors and every result/caveat.
    projects = re.findall(r'<article class="project scene-panel".*?</article>', html, re.S)
    assert len(projects) == 4
    ordered = [projects[3], projects[0], projects[1], projects[2]]
    for old, new in zip(projects, ordered):
        html = html.replace(old, '@@PROJECT_'+str(projects.index(old))+'@@', 1)
    for i, project in enumerate(ordered):
        project = re.sub(r'<span class="project-number">\d+</span>', '<span class="project-number">'+str(i+1).zfill(2)+'</span>', project, count=1)
        html = html.replace('@@PROJECT_'+str(i)+'@@', project)
    counter = iter(range(6))
    def scene(match):
        i=next(counter)
        return 'data-scene="'+str(i)+'" data-side="'+('right' if i%2==0 else 'left')+'"'
    html = re.sub(r'data-scene="\d+" data-side="(?:right|left)"', scene, html)
    index = '''<section class="work-index" aria-labelledby="start-title"><div><span class="overline">Start here</span><h2 id="start-title">Four ways into the work.</h2><p>Methods, working systems, and results with their limits.</p></div><div class="work-index-grid"><a href="#essays"><small>01 / Learn the architecture</small><strong>LLM notes ↗</strong><span>Attention, transformers, training and inference through worked explanations.</span></a><a href="#project-curi"><small>02 / Build research systems</small><strong>CURI ↗</strong><span>An experiment runtime with independent checks and a record of negative results.</span></a><a href="#project-world-model"><small>03 / Predict and plan</small><strong>Image-goal navigation ↗</strong><span>Visual prediction and memory for UAVs, with honest failure analysis.</span></a><a href="#project-point-painting"><small>04 / See in 3D</small><strong>DifficultyPainting ↗</strong><span>Camera–LiDAR fusion, detector comparisons and measured tradeoffs.</span></a></div></section>'''
    html = html.replace('<section class="essays-section"', index+'\n<section class="essays-section"',1)
    html = html.replace('<a class="skip" href="#research">Skip to selected work</a>', '<a class="skip" href="#start-title">Skip to selected work</a>')
    return html
