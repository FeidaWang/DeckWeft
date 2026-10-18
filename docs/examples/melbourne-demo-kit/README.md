# Melbourne builder demo kit

[简体中文](README.zh-CN.md)

An original Australian English pitch and reusable presentation template for the participant's three-minute Melbourne demo. Eight main slides, with three optional DeckWeft Q&A slides. The visual direction borrows MLAI's cream, orange, mint and bold typography. No logos, fonts or proprietary template assets are redistributed.

Read the [presenter guide](presenter-guide.en.md) for timing, ELI5 explanations, the exact demo procedure, fallback and questions. The public event page is a community workshop listing, not a published competition rubric. The participant reports a Dot-themed bottle prize. Its award rules remain unverified.

## Build

Use the bundled authoring runtime paths returned by `load_workspace_dependencies`. This optional example uses `@oai/artifact-tool` for the bespoke presentation. It does not add a DeckWeft runtime dependency, enable a provider or upload project data. The existing bundled authoring tool is used under its supplied terms. No package is added to the runtime or plugin bundle. The outputs run offline without it. Core JSON, HTML and PPTX examples still use the dependency-free DeckWeft engine.

```bash
node docs/examples/melbourne-demo-kit/build.mjs \
  --runtime-modules /absolute/path/to/bundled/node_modules \
  --python /absolute/path/to/bundled/python3 \
  --presentation-skill /absolute/path/to/presentations/skill \
  --out dist/melbourne-demo-kit-final
```

Use a fresh output directory on rebuild. The builder refuses overwrites. Add `--render` for individual authoring previews under `.build`. Final PPTX files pass the supplied package, geometry, font and reimport checks before delivery. Check the slides visually and in the presentation app used on stage.

Outputs under `dist/melbourne-demo-kit-final/output` include the bespoke pitch and template as editable PPTX and offline HTML, three valid Studio JSON projects, an actual core-export demo, an Australian English script and separate English/Chinese guides. Shared scene content drives both bespoke formats. The native Studio uses its existing preset theme and four layout families. Importing the JSON does not add bespoke theme support.

The source screenshot falls back to the repository's actual Studio screenshot. An optional `assets/studio-demo.png` replaces it only after a real local capture. Speaker notes identify it as a screenshot. Text and the technical architecture diagram remain native objects, rather than a flattened slide image.

## Sources and claims

- [Melbourne event](https://luma.com/jsqz7a56), accessed 17 October 2026. Existing projects and beginners welcome. Demos 12:00–12:45 pm. No per-person limit or judging weights published.
- [MLAI website](https://mlai.au/), accessed 17 October 2026. Visual reference, not an endorsement.
- The public MLAI **How to Pitch** article, reached through the website footer, informed the distinction between hypotheses, evidence, demonstrations and next steps. The verified article URL is recorded in `content.mjs`.
- Project claims come from the current README, verification report and implementation. Broader host, accessibility and destination-app checks remain limited as described there.

The slide copy, composition and rehearsal procedure are original. Existing LICENSE and NOTICE.md remain unchanged. No model call, publication, account action or network upload forms part of the build. The event registration token is deliberately absent from stored source links.
