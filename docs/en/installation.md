# Installation: choose the small box or the full box

[中文](../zh-CN/installation.md) · [Home](../../README.md)

A **skill** is a recipe your coding assistant reads. A **native plugin** is a labeled box that can carry skills and their runtime together. You do not need both installations at once.

Node.js 22+ is needed by DeckWeft. Install and authenticate your chosen AI host separately. DeckWeft does not supply a subscription, API allowance, permissions bypass, or a guarantee that a host release will accept a package.

## A. One command for local skills

In the source repository:

```bash
node bin/deckweft.mjs install --target both --scope project --dry-run
node bin/deckweft.mjs install --target both --scope project
```

The first command only prints the plan. The second copies a standalone skill and the complete local runtime into:

```text
.agents/skills/deckweft/       # Codex
.claude/skills/deckweft/       # Claude Code
```

Use `--target codex` or `--target claude` for one host. Use `--scope user` for your personal home directory instead of this project. Use `--project /absolute/path/to/your-project` when installing into another project.

Open or reload that project in the host. Try `$deckweft` in Codex or `/deckweft` in Claude Code. Ask it to create a three-slide example, run the checker, and export HTML and PowerPoint. Observe that it actually executes the bundled CLI. A copied folder alone does not prove host discovery or successful execution.

### Update or remove

```bash
node bin/deckweft.mjs install --target both --scope project --replace
node bin/deckweft.mjs uninstall --target both --scope project --dry-run
node bin/deckweft.mjs uninstall --target both --scope project
```

Updates retain a uniquely named backup. The installer refuses unknown folders and symlinked paths. Uninstall refuses modified installations rather than deleting your work. Back up and move an edited installation yourself when necessary. It does not remove your deck library.

## B. Build the native plugin box

```bash
npm run build
```

The result is `dist/deckweft-plugin/` and a versioned plugin ZIP. This folder is self-contained; its `runtime/` does not reach back into the source repository. The build includes Codex and Claude manifests plus a portable metadata manifest. It does not publish or register anything.

For Claude Code, test the local folder:

```bash
claude plugin validate ./dist/deckweft-plugin
claude --plugin-dir ./dist/deckweft-plugin
```

Inside that session, use:

```text
/deckweft:deck Create a three-slide presentation about a neighbourhood library. Use clearly labeled fictional examples, not invented real-world statistics.
```

For a local marketplace, first build, then run from the source repository:

```bash
claude plugin marketplace add .
claude plugin install deckweft@deckweft-local
```

Check the host's installation scope and approval prompts. Reload plugins when the host requests it. The source marketplace points at the built folder; do not publish the marketplace as ready to consume from Git until that built path exists in the published distribution. A source-only Git clone must run the build first.

For Codex catalog registration, after building:

```bash
codex plugin marketplace add .
```

This registers the local catalog. Use the supported host plugin interface to install/enable the entry, then test the skill. Do not treat catalog registration as proof of activation. Surface and account restrictions may differ. The standalone skill route above is the simpler development path.

## C. Figma and After Effects are separate

The agent plugin is not the Figma development plugin. Figma needs its own assigned plugin id; [the Figma guide](../../integrations/figma/README.md) explains how to use the template without inventing one. AE uses a `.jsx` script through the actual application; see [the AE guide](../../integrations/after-effects/README.md).

## Official contracts checked for this release

Checked on 2026-10-16. Recheck before release because host contracts evolve.

- [OpenAI plugin packaging and local marketplaces](https://developers.openai.com/plugins/build/plugins)
- [Codex local skill discovery](https://developers.openai.com/codex/skills)
- [Claude Code plugin layout and local testing](https://code.claude.com/docs/en/plugins)
- [Claude Code marketplace creation and distribution](https://code.claude.com/docs/en/plugin-marketplaces)

The local tests verify file structure, runtime isolation, and installer behavior. The [2026-10-17 host review](../evidence/dw-020/review.json) verifies the authenticated Codex CLI project-skill route. Claude authentication, Codex desktop native activation and remote CI remain outstanding.

## Verify real loading

Run the [host acceptance procedure](host-acceptance.md). The new runner distinguishes an absent host, validation, a real task and manual visual review. Registration/installation alone never passes DW-020. For alpha.2, rebuild and update the route you already use; each installed skill carries its own runtime. Back up your library and stop the old Studio first.
