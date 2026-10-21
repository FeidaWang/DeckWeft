# Attribution and project identity

DeckWeft is copyright (c) 2026 Feida Wang and is distributed under the MIT license in [LICENSE](LICENSE). The third-party components and trademarks below keep their own owners and licenses.

Codex, Claude Code, Figma, After Effects, PowerPoint, Beautiful.ai, Gamma, Alai, and Canva belong to their respective owners. DeckWeft is not an official product of, endorsed by, or affiliated with those vendors. Design lessons are inspiration, not copied proprietary code or templates.

The name DeckWeft is a proposed publishing identity. A web search is not a trademark clearance or a reservation of a GitHub name, domain, or package registry name. Review naming and licensing before public distribution.

The Studio uses selected Lucide icons (0.468.0), distributed under the ISC license. Their original license is preserved in `public/vendor/lucide/LICENSE`. These small local SVG assets require no runtime package, font, CDN, or network access.

The optional Cosmic & Dots presentation style includes Three.js 0.186.1, copyright the Three.js Authors, under MIT. The complete licence is retained in `public/vendor/three/LICENSE` and in the self-contained player. Three.js loads from the local runtime only for this style. The Dots are reconstructed geometric interpretations of participant-supplied event artwork; they are not official 3D models or an endorsement. The original generated cosmic background and source-capture provenance are recorded in `public/assets/devday/`.

## MB-11–15 demonstration artwork

`docs/evidence/mb-11-15/workbench-generated.png` is original decorative artwork created with the built-in image tool on 2026-10-18. Its exact prompt and execution limits are recorded alongside it in `image-prompt.txt`. It depicts fictional blank story cards and blue thread; it is not research evidence, a proprietary template or a screenshot. No third-party rights clearance is asserted. The artwork stays outside the shipped runtime bundle; reproducible local demos embed their own individual PNG copy.

## Film palette registry (DWI-010)

`themes/palettes/wesanderson.json` transcribes the hex values of 22 discrete palettes and one alias from the wesanderson R package by Karthik Ram (<https://github.com/karthik/wesanderson>, `R/colors.R`, Git blob `ddcf7fb12888a658b8b3f80117ea933dcc0a0f16`, package version 0.3.7), which declares the MIT licence (“MIT + file LICENSE”). The package credits a community palette collection. The values are not official colour standards of any film, no film frame was sampled, and DeckWeft is not affiliated with the films' rights holders. The package's own LICENSE file (year and copyright holder) has not been copied into this repository yet; add it before public distribution. `themes/palettes/wesanderson.screenshot-samples.json` holds colour samples measured from a user-provided screenshot; the screenshot itself is not distributed.
