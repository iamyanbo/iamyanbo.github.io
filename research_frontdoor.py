"""Research-first presentation; project evidence and earlier design previews stay intact."""
import re

def research_frontdoor(html):
    html = html.replace('A place to showcase the interesting work and projects I’ve built, and to explore models and the mathematics behind them.', 'I study language models, visual representations, and how they support prediction and planning.')
    html = html.replace('<div class="hero-links">', '<p class="research-position">MASc student · Systems Design Engineering · University of Waterloo</p><p class="research-availability">Seeking ML research internships and research engineering opportunities.</p><div class="hero-links">', 1)
    start = html.index('<div class="hero-links">')
    end = html.index('</div>', start) + len('</div>')
    html = html[:start] + '''<div class="hero-links"><a href="#essays">LLM work <span aria-hidden="true">↘</span></a><a href="#research">Research projects <span aria-hidden="true">↘</span></a><a href="assets/Yanbo-Cheng-resume.pdf">CV / résumé <span aria-hidden="true">↗</span></a><a href="mailto:yanbocheng01234@gmail.com">Contact <span aria-hidden="true">↗</span></a></div>''' + html[end:]
    html = html.replace('<a href="#research">Research</a><a href="#essays">Personal projects</a>', '<a href="#essays">LLM work</a><a href="#research">Research</a>')
    html = html.replace('02 / Personal projects', '01 / Language models').replace('<h2 id="essays-title">Personal projects</h2>', '<h2 id="essays-title">Language models</h2>')
    html = html.replace('01 / Selected research', '02 / Selected research').replace('<h2 id="work-title">Current Research</h2>', '<h2 id="work-title">Research projects</h2>')
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
    pjss = """<article class="project scene-panel" id="project-pjss" data-scene="5" data-side="left"><div class="scene-window" aria-hidden="true"></div><div class="project-body" data-reveal><header class="project-heading"><span class="project-number">05</span><span class="status">Equation discovery</span><h3 class="project-title">Profiled Joint Subset Search</h3></header><div class="project-copy"><p>Given one noisy trajectory, which equations could have produced it? PJSS fits the underlying states and a sparse set of differential equations together, rather than treating denoising as a separate step.</p><dl class="project-evidence"><dt>Method</dt><dd>The method screens alternative sets of equation terms with a profiled quadratic approximation, then refits the most promising candidates with nonlinear optimization.</dd><dt>Results</dt><dd>The manuscript reports 89.0% exact support recovery across 6,160 simulated trajectories from 77 in-library chaotic systems. On 49 systems outside the development benchmarks, the reported rate is 85.3%. These results concern uniformly sampled, fully observed simulated dynamics; tests on measured data and misspecified models include negative results.</dd></dl><a class="evidence-source" href="https://github.com/iamyanbo/PJSS/blob/main/RESEARCH_README.md">Benchmark results and audit notes ↗</a><details class="project-notes"><summary>Read the research note</summary><div class="note-body"><h3>What is available</h3><p>The repository contains the code, tests, manuscript sources, saved benchmark results and audit records. This is a research-code release, not a peer-reviewed publication.</p><h3>Reproduction limits</h3><p>Large raw trajectory archives are not included. Four secondary-study original archives are missing locally, and the original benchmark software environment has not been recovered. The download is not a complete data release.</p><h3>AI assistance</h3><p>Generative AI was used extensively in research and experiment design, code development, and manuscript drafting and revision. The manuscript records that the author takes responsibility for the content.</p></div></details><a class="project-source" href="https://github.com/iamyanbo/PJSS">Code, manuscript &amp; reported results ↗</a></div></div></article>"""
    # Keep PJSS with the equation-discovery work and reuse the native scene layout.
    last_project = re.findall(r'<article class="project scene-panel".*?</article>', html, re.S)[-1]
    html = html.replace(last_project, last_project + pjss, 1)
    counter = iter(range(7))
    def scene(match):
        i = next(counter)
        return 'data-scene="'+str(i)+'" data-side="'+('right' if i%2==0 else 'left')+'"'
    html = re.sub(r'data-scene="\d+" data-side="(?:right|left)"', scene, html)
    html = html.replace('<a class="skip" href="#research">Skip to selected work</a>', '<a class="skip" href="#essays">Skip to selected work</a>')
    return html
