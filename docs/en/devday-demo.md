# The five-minute DevDay demo

[简体中文](../zh-CN/devday-demo.md)

The current English deck has 14 slides and 644 spoken words in its speaker notes. Start at **140 words per minute**: approximately 4 minutes 36 seconds of speech, leaving 24 seconds for actions and pauses. Slide slots total 300 seconds. This is a delivery estimate, not a recorded human rehearsal.

## Open and practise

1. Run `npm run demo`. Expected: `dist/devday-five-minute` contains the self-contained HTML player, editable PPTX, project JSON and English script.
2. Open `deckweft-devday.html`. Select **Present**, then **Full screen**. Arrow keys change slides. Escape leaves full screen. Move over the controls at the bottom to reveal them.
3. Select **Wake the Dots**, or click a character. Expected: Three.js geometry bounces. The bodies, bevels and facial marks use meshes with no character textures. Pointer movement adds a small tilt.
4. Select **Try layouts** on the workbench page. Choose another layout. Expected: a real core scene appears in the comparison dialog. These offline samples use text estimates; the running Studio measures text in the browser.
5. Select **Notes / interaction** to read the script or explore a process step. **Start timer** runs independently of slide navigation. **Reduce motion** preserves the complete content with static characters.

If WebGL is unavailable, the player retains transparent renders generated from the same geometry. The presentation does not fetch a renderer, image or font from the internet. The PPTX uses native editable text and diagram shapes plus individual media; it is a static companion, not a native PowerPoint animation file.

## Use the same tools in Studio

1. Run `node bin/deckweft.mjs studio --home /absolute/path/to/library --port 4210` and open the printed loopback URL with `?mode=pitch`.
2. Open **Interactive feature tour** in the tool rail. Select **Open the 5-minute demo deck**. Expected: a new saved copy opens. Your current project is retained.
3. In **Design**, choose **Presentation style → Cosmic & Dots** to apply the style to another deck. It uses a 16:9 stage; an incompatible ratio is a visible export blocker. Studio layouts remain available.
4. In the feature tour, **3D Dots** previews all five geometric characters and downloads separate transparent renders. **Rehearse** counts speaker notes, lets you adjust the speaking pace, runs a timer and downloads the script.
5. Export PowerPoint, HTML, SVG or JSON. The experimental Figma/AE importers do not support this style's media, so those options are disabled until you return to Studio layouts.

The rail preserves all five primary tools at desktop and narrow sizes. Outline and inspector use drawers where needed; this is the same set of tasks, not a promise that every desktop panel can occupy a phone screen simultaneously.

## Connect a real Dot

1. Select **Generate with Dot → Enable local bridge**.
2. Select **Copy task for Dot**. Send the task to a Dot with permission to operate the computer hosting this library. It contains exact local worker/MCP paths and no API key.
3. In Dot, select the actual host model and connect. The Studio must show the connected name and host-reported model. Requesting GPT-6 Astra does not switch or independently verify that model.
4. Set English, duration and speaking pace. Opt in to share the selected snapshot, then select **Generate draft** once. Expected: queued → running → complete.
5. Review the returned slides, save a new copy, reopen it and export through the actual UI. Inspect the result in your presentation application. Record the job, host model, input/output hashes and observed output. A protocol fixture is not this acceptance test.

The current session could not control ChatGPT itself and had no Dot browser surface. The enabled bridge remained waiting for a real agent. Actual Dot/Astra generation is therefore **pending**, even though the local transport and the visual tools work.

## Content and attribution

The acknowledgements thank MLAI, Callum Holt, Dr Sam Donegan, Advita Velury, Dhruv, all organising staff and volunteers, and the OpenAI community. Credit amounts are intentionally omitted at the builder's request. The organiser names are linked in the project sources to the [event page](https://luma.com/jsqz7a56) and supplied profiles.

The ChatGPT web, Codex with Sol High, multiple-agent and Dots contributions are builder-reported attribution. The Tibo anecdote and weekend reset forecast are a personal joke, not an announcement or plan recommendation.

Visual direction references the [Astra launch page](https://openai.com/zh-Hans-CN/index/gpt-6-astra/) and the participant-supplied Dots artwork. The star background is an original generated composition. The characters are geometric reconstructions, not official 3D assets. Keep `LICENSE`, `NOTICE.md`, `LICENSE.three` and `ASSET-NOTICE.txt` with distributed materials.

Three.js is vendored under MIT and loads only for the optional style. Its two pinned source files total about 2.12 MB before compression; no package installation, CDN or account is required. The linked player is deterministic and contains its complete licence. Local generated artwork adds approximately 3 MB. This cost provides actual geometric bodies, clean silhouettes, shared character renders and interaction; the ordinary Studio layouts do not load the renderer.
