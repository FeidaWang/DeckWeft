# DW-020: prove the host is real

[中文](../zh-CN/host-acceptance.md) · [Installation](installation.md) · [Evidence](verification.md)

A packed lunch is not proof that someone ate it. Likewise, a valid plugin ZIP is not proof that Codex or Claude Code loaded and used its skill.

## Current result

**2026-10-17: blocked overall, with the Codex CLI route verified.** Codex CLI **0.160.0** used its existing authentication, discovered the installed project skill and executed its bundled runtime. Its three-slide fictional deck passed schema/nonce checks, independent byte comparisons of HTML/PPTX exports, native-text package inspection and visual review of all slides rendered by LibreOffice. Read the [review and remaining gates](../evidence/dw-020/review.json), [real task trace](../evidence/dw-020/2026-10-17-codex-discovery/report.json) and [latest preflight](../evidence/dw-020/2026-10-17-preflight-cli/report.json).

Claude Code **2.1.288** is installed and its plugin validator passed with an author-metadata warning. Authentication returned exit 1; the user explicitly deferred signing in. No Claude model task ran. The runner now selects the ordinary approval mode advertised by the installed CLI (`manual` on this version, `default` on older versions); that compatibility change is unit-tested, not live-Claude certified.

Codex desktop native-plugin activation and remote CI remain untested. This source folder came from a ZIP and has no Git remote; nothing was published to create a CI result. PowerPoint and Keynote are installed but were not opened. The first Codex attempt was refused local-file browser navigation by browser policy. HTML visual review remains unverified; LibreOffice PPTX rendering is separate evidence. No browser app bundle or personal profile was modified.

The [alpha.2 Linux report](../evidence/alpha.2/host/report.json) remains historical evidence of missing executables in that earlier environment. It does not describe this Mac.

## Step 1 — preflight without an AI task

In the source folder, run:

```bash
node bin/deckweft.mjs host-check --target both --out host-evidence-preflight
```

Use an empty output folder. The runner refuses previous task files even when an interrupted run has no report. It builds an isolated copy, hashes its files, checks the bundled CLI, probes actual host `--version` and `--help`, and invokes the real Claude plugin validator when available. Preflight uses a temporary home with known authentication environment variables removed. It never installs a host or registers a marketplace automatically. Exit code **2** means the complete release gate is not passed, not that the report failed to save.

## Step 2 — explicitly allow a small real task

Install and sign in to your chosen host through its official application first. Do not paste keys into this repository. Then run:

```bash
node bin/deckweft.mjs host-check --target both --live --out host-evidence-live
```

`--live` uses the host's existing authentication and may consume your plan or API allowance. It generates one fictional, three-slide paper-airplane-club deck, validates it and exports JSON, HTML and PPTX. It checks the English locale and task nonce, reruns the bundled checker and compares both exports byte for byte with independent bundled exports. The prompt supplies no fallback skill path, so the host must find its installed skill. Browser and unrelated connector access are excluded from the model task; the reviewer inspects the artifacts separately. Commands keep normal permissions: they do not pass bypass flags. Non-interactive approval requirements, an unsupported flag, or the bounded task timeout are reported as failures/blocks; the runner does not silently relax permissions. Use `--timeout-ms 180000` when needed; valid task limits are 1000–600000 milliseconds, with a default of 120000. A larger timeout does not relax permissions. Temporary workspaces are kept for inspection; their location is printed in your terminal. Remove only that exact workspace after review.

Claude uses a session-local `--plugin-dir`. The automated Codex route uses an installed **standalone project skill** with `codex exec`, not certification of the desktop native-plugin interface. Complete native Codex marketplace activation separately using the installation guide. Check both a fresh session and an already-open session where supported.

## Step 3 — look at the evidence, not only the exit code

Open `report.json`, inspect the sanitized command traces and all three output slides. Verify that the installed skill called its bundled runtime rather than substituting its own exporter. Record app/CLI versions, route, approval prompts, output hashes, visual findings and a real CI run URL when available. A successful subprocess or generated file alone leaves `manual-trace-and-visual-review-required`; the runner deliberately cannot auto-certify the full release gate.

Obvious token patterns, email and known paths are redacted from report text, and auth-status output is not stored. Redaction is not a guarantee: review reports and generated fictional files before publishing. No account configuration, tokens or font binaries belong in GitHub.

## Source contracts checked

[OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins), [Claude plugin reference](https://code.claude.com/docs/en/plugins-reference), and [Claude CLI reference](https://code.claude.com/docs/en/cli-reference) were consulted for this work. Documentation conformance is not a tested host-version claim.
