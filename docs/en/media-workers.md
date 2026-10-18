# Local media, workers and spatial scenes

[简体中文](../zh-CN/media-workers.md) · [Evidence](../evidence/mb-11-15/review.md) · [Planning](planning.md)

MB-11 and MB-13 are implemented locally. MB-12 has two real concurrent CLI results; Dot desktop acceptance remains open. MB-14 and MB-15 have updated importer source and local tests, with real application acceptance still open. This build adds no runtime package dependency, API key lookup or automatic provider connection.

## Generate one optional image

1. Review a version 2 storyboard and save it. Open **Design → Local image and rights** on the target slide.
2. Enter license, allowed use, alternative text and an offline fallback. These are author declarations, not rights clearance.
3. Open **Optional image generation**. Write a prompt containing only information you intend to share. Check the explicit host-tool consent and select **Prepare image request**.
4. Select **Copy host task** once. Give that task to your available image-generation host. Expected: only the approved prompt is shared; DeckWeft itself makes no provider request. Host permissions and usage apply separately.
5. Choose **Import generated PNG**, or have the connected local worker run the command below for an original PNG up to 4 MB. Browser import has a 1.3 MB limit.
6. Select **Check result and attach** after worker completion. Review the image and select **Save**. Expected: one independent local image, editable text and a hash/rights record. HTML/PPTX/Figma/motion embed individual media; JSON backup also needs the library's `assets` folder.

```bash
node bin/deckweft-image.mjs status --home /absolute/library --id REQUEST_ID
node bin/deckweft-image.mjs complete --home /absolute/library --id REQUEST_ID --image /absolute/original.png
```

An identical completed prompt/rights request reuses verified local bytes. A matching pending request blocks duplicated work even with a different request id. A cancelled request rejects late results. Cancellation in DeckWeft does not stop a host operation already started: stop that operation in its host too.

If an outcome is unknown, recover the original host result. The local dispatch key is advisory; no remote idempotency or cancellation support is assumed. There is one dispatch per request and no automatic retry. If copying fails after dispatch, use **Check result** and the request id shown in the status to recover the stored prompt with `status`; do not generate again blindly. If the draft changed, prepare a fresh request against the current draft; completed matching assets can be reused without generation. If bytes are missing or changed, restore the hash-matching PNG. Conflicting rights metadata requires review.

PNG files must be static, smaller than 4 MB, at most 8192 per side and 24 million pixels. The registry checks chunks, CRCs, dimensions, symlinks and content hashes. Existing aggregate asset budgets still apply. No SVG script or remote image URL is accepted.

## Use two independently scoped workers

1. Enable the local agent bridge. Connect up to two MCP sessions, or use distinct CLI identities in the same library:

```bash
node bin/deckweft-worker.mjs wait --home /absolute/library --worker-id alpha --name Alpha --model ACTUAL_HOST_MODEL
node bin/deckweft-worker.mjs wait --home /absolute/library --worker-id beta --name Beta --model ACTUAL_HOST_MODEL
```

2. In **Generate with Dot**, choose the authorized worker. Optionally paste one selected conversation snapshot and give it an id. Check the sharing consent. Expected: only that pasted snapshot and selected draft enter this worker's pinned job. This adapter cannot read or send to live chats and does not create desktop chats.
3. Each worker can own one running task; two independent tasks can run concurrently. The worker overview shows connection, status, validated artifacts, elapsed work and next stage. Reopen the dialog on another source deck to submit its independent task. Opaque host turns remain indeterminate; no combined ETA is invented.
4. Review each result and save a separate project. The existing bridge transaction serializes integration. Per-request ids, exact host identity and owned leases reject duplicate claims and foreign/late submissions.

Code proposals require a separate code-change grant. Overlapping active path grants conflict. Because this checkout has no Git metadata, a code job receives a separate copy of only its named source files plus rules and capsule. The host must obey those paths; this copy is not an operating-system sandbox. Source hash changes reject stale proposals. Source integration remains manual review; the deck-save route cannot apply code patches. No other worker's snapshot or workspace enters that copy.

To replace registered worker identities, disable the bridge and enable it again. This revokes pending grants and rejects late outputs; completed local drafts remain inspectable. A crash retains the owned lease until expiry. Resume requires an explicit valid checkpoint and the originally authorized worker.

## Add a spatial illustration

1. On a version 2 slide, choose **Design → Spatial illustration → Orbit of ideas** or **Layers of an idea**. Expected: image + caption layout, one to six geometry objects derived from the number of items, and native editable text.
2. Use **Rotate left**, **Rotate right** or **Reset 3D**. Tab and Enter work. Shared reduced/off preferences stop continuous rotation while preserving manual controls.
3. Export HTML for live local 3D. SVG, PPTX, Figma, AE and the private audience surface use declared native static shape fallbacks. They do not contain editable 3D. Print exposes static shapes instead of a canvas.

WebGL failure/context loss restores the shared scene's static shapes. Switching slides disposes resources. The adapter has at most six meshes, one shared geometry/material, no textures, pixel ratio 1 and at most 630,000 canvas pixels. The existing source linker adds 2,117,387 renderer bytes (418,167 gzip), plus about 5.3 KB for this adapter, only to exports that require it; Studio loads local scripts lazily. These measured source-linker sizes differ from the earlier minified standalone stage example. [Cost record](../evidence/mb-11-15/render-cost.json).

## External application gates

The Figma importer supports editable text/shapes and separate PNG fills, requires explicit acceptance of missing-font substitution and returns a downloadable source-node/font map. Fixed scene coordinates are intentional; reusable components and auto-layout are not inferred. Figma images must be at most 4096 pixels per side. Import through Figma is an explicit downstream action; Figma's own document-save behavior applies. [Local plugin steps](../../integrations/figma/README.md).

AE handoffs carry per-node seconds, easing and rise offsets. The JSX builds native text/shapes and separate PNG footage, asks for a local media folder, records source/font mapping in layer and MASTER comments, and removes its newly created items/files on cancellation or failure. It never renders automatically or claims a tested video. [AE steps](../../integrations/after-effects/README.md).

Figma desktop was opened, but this session could not complete plugin registration/import: its plugin menu remained loading and app screenshots became unavailable. No assigned plugin identity or actual imported-layer review was obtained. After Effects was absent from `/Applications`. Their acceptance tasks remain partial; local mocks, handoffs and browser screenshots do not close those gates.

## Reproduce local checks

```bash
npm run verify
node scripts/serve-media-demo.mjs
```

The demo uses preserved original artwork; rebuilding does not call an image provider. `dist/mb-11-15/demo` contains project, assets, HTML, PPTX and both handoffs. Optional `node scripts/multi-worker-acceptance.mjs --live --out /fresh/output` consumes two short host turns against authored inputs. It refuses an existing directory, performs no automatic repairs and records invalid results. The recorded CLI pair does not verify Dot desktop, API model attestation or monetary cost.
