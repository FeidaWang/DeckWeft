# Charts, diagrams, code and annotations

[简体中文](../zh-CN/components.md) · [Visual Studio](visual-studio.md) · [Evidence](../evidence/vis-008/review.md)

1. Run `npm run studio:components` with Node 22 or newer. Open the printed loopback `/visual` address. The isolated local library contains two 14-page stories with the original four-page material and ten component pages. Choose the English or Chinese story in Library. In another library, choose **Component examples**.
2. Select a component page. Edit its content in **Content**. Chart data uses typed JSON numbers and explicit `null` gaps. Edit chart settings separately: `chartType`, `axis`, and optional scatter `xAxis`. Diagram JSON exposes nodes, directed edges, labels and node notes. Code has an exact text field plus metadata for `language`, `emphasizedLines` (one-based), and `sourceAnchor` (`sourceId` and a literal source location).
3. Wait for the font/image/layout measurement check. The preview, labels, legends and full-data disclosure use the same edited document. Open **View all data** or **Relationships and node notes**, including by keyboard. No information depends on animation or JavaScript. On narrow screens, charts, large diagrams and exact code have local horizontal scroll areas.
4. Choose **Compare compositions** in Design, inspect candidates, and choose a passing candidate or whole-deck rhythm. No feasible candidate means the content needs a different layout or an explicit author edit. Measurements never trim data or code to pass.
5. Save, reload, or export measured HTML and Project JSON. Both retain editable semantic content; HTML uses DOM/SVG and escaped code, with exact accessible tables. Version 3 PPTX/Figma/AE compilers remain unavailable and are refused explicitly. Component capability receipts describe that boundary; they do not certify a native host.

## Data rules

Supported `chartType` values are `line`, `area`, `ranked-bar`, `stacked`, `scatter` and `heatmap`. An older v3 chart without `chartType` remains a zero-inclusive line chart. Existing v1/v2 inputs stay on their existing paths; migration remains explicit.

Every series has one finite number or `null` per category. No string-to-number conversion, interpolation, missing-to-zero conversion, automatic percent normalization, or source-order mutation occurs. Zero is a real observation. Null line/area entries break the path. A stacked category with any missing member has no stack; its exact partial data remains in the table. Positive and negative stacks accumulate separately. Ranked bars sort a derived view of one series, with stable ties and missing entries last. The accessible table keeps original source order.

Scatter series require numeric/null `xValues` and a dataset `xUnit`; a point needs both coordinates. All tables and mark labels retain the original numeric value. Tick labels can be rounded for space and are not replacement data. Very long labels can fail measurement; use another composition or explicitly edit the label, retaining a source citation.

`axis.policy` is `zero` (default), `extent`, or `fixed`. Fixed axes require increasing `min`/`max` and cannot exclude values or signed stacked totals. Area, ranked bars and stacks require zero inside the range unless the chart declares `truncation: {note}`; a declared truncation is validated but refused for HTML output until a renderer draws it ([field list](architecture.md#version-3-handoff-fields-s1-2026-10-19)). Empty data uses a visible 0–1 axis; constant data receives derived padding. Neither changes stored observations. Heatmap color intensity uses the displayed domain; sign colors, literal values and a separate missing-cell outline do not require color interpretation. Series names label matrix rows; its legend describes sign/missing semantics.

For time categories, set `categoryKind: "datetime"`, an IANA `timeZone`, and strictly increasing ISO instants with an explicit `Z` or numeric offset. Original instants remain in the table. Display labels use the declared zone, and line/area spacing uses elapsed time. Invalid calendar dates, ambiguous local timestamps and invalid zones fail validation. The example crosses Melbourne's October daylight-saving transition. Category data has no inferred time zone.

## Stable relationships and original code

Diagram types are `relationship`, `sequence` and `process`. Edges draw exactly their supplied `from`/`to` direction; no adjacency or extra relationship is inferred. Sequence messages follow the supplied edge order. Optional edge `id` values and node `id` values share a unique namespace. Automatic routing is bounded, not an optimal graph-layout engine; inspect complex graphs and use the exact relationship list as the static text representation.

Annotations use `target.blockId` and optionally a diagram `objectId`, chart `objectId` (a stable `categoryIds` entry) with optional `seriesId`, or code `line`. Chart category identities have exactly one entry per category. An annotation and its target must share a scene. Scene movement, ranked sorting and composition selection retain these identities. Deleting a target fails rather than retargeting by array position. Code line references are authored line numbers; when inserting code lines, explicitly update the reference and emphasis as part of that edit.

Code is escaped text, never executable input. Tabs, CRLF/LF, trailing spaces, final newlines and the source anchor survive HTML/JSON. Emphasis wraps original lines without inserting text. The raw editor preserves uniform LF or CRLF; mixed line separators use the escaped JSON editor to avoid textarea normalization. Source URLs remain manually followed links; the app does not fetch them.

If a JSON edit fails, repair the field using the displayed message. Export **Project JSON** before leaving to retain unapplied drafts. Locked blocks and shared datasets stay protected by save-time checks. For a stale revision, retain your backup and reopen the current document; use History to restore an earlier revision as a separate copy. No runtime dependency, remote service or automatic image request is added. VIS-009 interactions remain future work.
