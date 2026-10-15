# Yanbo Cheng's portfolio

Published at **https://iamyanbo.github.io/**.

GitHub Actions builds and publishes the portfolio after a push to `main`.
The site is static HTML, CSS, and JavaScript, with a Python build script.
No package installation is needed to build it.

## Make changes

| Content | Source |
| --- | --- |
| Main page structure | `build.py`, `portfolio_content.py` |
| Project contributions, results, and sources | `content/project-evidence.json` |
| Detailed project notes | `content/*-note.html` |
| DifficultyPainting chart | `content/difficulty-results.html` |
| CURI case study | `content/curi-case-study.html`, `content/curi-findings.html` |
| About me, gym schedule, and playlists | `content/personality.html` |
| Styles and attractor animation | `site/` |
| Images and resume | `assets/` |

The research and personal-project sections can be extended as new work is ready.
Keep reported metrics, comparison conditions, and source links together when
adding results.

## Build and check locally

Requires Node.js 22 and Python 3.13.

```sh
npm run build
npm run check
npm test
python -m http.server 8765 --directory dist
```

Open http://localhost:8765/ to preview the site. The generated `dist/` directory
is ignored by Git and rebuilt during deployment.

The existing `/1/` assignment redirect is preserved in the published output.
The interactive essays remain at https://iamyanbo.github.io/llm-notes/ in their
own repository.
