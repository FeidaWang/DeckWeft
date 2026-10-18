# Compatibility: a checked box has a specific meaning

[中文](../zh-CN/compatibility.md) · [Verification evidence](verification.md)

| Surface | Implemented | Acceptance boundary |
| --- | --- | --- |
| Node CLI / local server | Yes; Node 22+ | Linux local run tested. macOS/Windows CI jobs are configured, not claimed as executed here. |
| Browser studio | Yes | Chromium interaction and viewport checks are recorded in the verification report. Other browser engines remain unverified. |
| Local skill installation | Yes | Temporary-directory installation, updates, safe removal, and isolated runtime are tested. Real authenticated agent discovery remains separate. |
| Codex native plugin | Manifests and self-contained bundle | Local catalog contract followed. Actual host activation has not been verified here. |
| Claude Code native plugin | Manifests and self-contained bundle | Real `claude plugin validate` / authenticated skill invocation still need a host run. |
| PowerPoint export | Native text, basic shapes, speaker notes | Package/relationship inspection and available-renderer checks are recorded separately. Microsoft PowerPoint is not installed in this environment. |
| HTML / SVG | Offline HTML; single-slide SVG | Escaping and browser output tested. SVG does not embed fonts. |
| Figma handoff | JSON plus local development-plugin source | Editable layer importer and local mock tests; real Figma execution remains unverified. No cloud file was renamed in this release. |
| After Effects handoff | JSON plus strict-parser JSX importer | Parser and cancellation tests; actual AE composition, font, and render checks remain unverified. |

## Important gaps

This alpha supports text and basic geometry, not photos, logos, embedded videos, spreadsheet-backed charts, tables, arbitrary drag positioning, live co-editing, or import of arbitrary PowerPoint files. Exporting a Figma JSON is not exporting a native `.fig`; exporting motion JSON is not rendering a video.

Language preference selects a bounded font list; the Studio probes available local candidates and measures actual browser text. Privacy restrictions and per-glyph fallback still apply. CLI-only output remains estimated. Exact text wrapping can vary across applications. A layout preflight pass is not a factual accuracy, accessibility, legal, security, or performance certification.

No cloud credentials are requested. Using an agent's model or importing into a cloud design product still follows that host's own account, billing, and privacy rules.

Version history is now a read-only browser with restore-as-copy. Retention and archive management remain unimplemented. See [alpha.2 scope](alpha-2.md).
