# Cloudfold Club illustrated motion example

[简体中文](README.zh-CN.md)

This three-slide revision uses generated paper illustrations, large editable typography and a staged motion sequence. It preserves the fictional club and invitation from the original example.

This is a separately authored design example. The core DeckWeft project schema, CLI and plugin capabilities are unchanged. Core PPTX export still has no image or native animation support. These illustration assets and optional authoring files live under `docs/` so they do not increase the packaged runtime. No runtime dependencies or font binaries were added.

## Outputs

Build output is under `dist/cloudfold-cinematic-v1/`:

- `output/cloudfold-animated.html`: self-contained offline player. Open in a browser, then choose **Play sequence**. It has staged text reveals, illustration entrances and slide dissolves. Use the arrow keys, Home/End, replay, pause and reduced-motion controls. A system reduced-motion preference disables movement.
- `output/cloudfold-illustrated.pptx`: static PowerPoint companion. Text remains editable and illustrations are separate embedded images. It contains no native PowerPoint animation.
- `output/cloudfold-motion-preview.mp4`: recording of the actual HTML player.
- `preview/slide-1.png` through `slide-3.png`: LibreOffice renders of the actual PPTX.

The HTML needs no network access, server, API key or external fonts. A loopback server can be used for the in-app preview. The original example is preserved.

## Sources and rebuild

`scene.mjs` is the shared composition source for HTML and PPTX. `player.mjs` creates the motion player. [Illustration prompts](assets/prompts.json) record the built-in Image Gen requests. The illustrations are fictional generated artwork, not photographs or factual diagrams.

The optional builder uses the supplied first-party document authoring runtime, not the DeckWeft plugin runtime. Resolve these four paths from the workspace dependency tool and installed Presentations skill:

```bash
node docs/examples/cloudfold-cinematic/build.mjs \
  --runtime-modules /absolute/path/to/runtime/node_modules \
  --python /absolute/path/to/runtime/python3 \
  --presentation-skill /absolute/path/to/presentations/skill \
  --out dist/cloudfold-cinematic-next
```

Choose a new output directory. The builder preserves previous deliverables, validates native text/font/slide geometry and package integrity, and checks first-party PPTX re-import. It does not produce a video automatically; the video is a recording of the browser player.

## Verification scope

All three PPTX slides and HTML slide states were rendered and visually inspected. Browser checks cover controls, actual animation, reduced motion, mobile fit and absence of remote requests. An isolated Chromium for Testing and temporary profile were used; installed browser applications and personal profiles were untouched.

PowerPoint and Keynote were not opened. Animation is verified in the HTML player and recorded video. The core host release gate remains unchanged; this example does not certify Claude or native Codex desktop activation.
