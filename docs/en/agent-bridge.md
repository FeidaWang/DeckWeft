# Optional local agent bridge

[简体中文](../zh-CN/agent-bridge.md) · [Story planner](planning.md) · [Actual effort pilot](astra-evaluation.md)

The bridge is an opt-in local queue with stdio MCP and connected-computer CLI transports. It has no bundled model or API provider. A real Codex CLI task has exercised the scoped queue; **Dot desktop acceptance is still open**. The bridge cannot read other chats, create chats or infer account access.

## Connect and request one draft

1. Start `node bin/deckweft.mjs studio --home /absolute/path/to/library`.
2. Open **Generate with Dot → Enable local bridge**. Expected: waiting for an agent; generation remains disabled.
3. Open **Connection details**. Use that exact local stdio MCP command or worker path on the connected computer. A cloud-only agent cannot reach your laptop's loopback service.
4. Call `deckweft_connect` with the actual host name, selected model and optional effort/capabilities. Declare only operations the host actually supports. Capabilities cover model/effort selection, model/effort lists, cancellation, usage and events. Conversation operations are empty; worker limit is one. Unsupported declarations are refused. All model information remains **host-reported**; `apiConfirmed` stays null.
5. In the Studio, enter a brief, optional speaking targets and model policy. Review the selected-project sharing checkbox. **Generate draft** authorizes one draft, one selected worker and ten minutes. Up to two workers can serve independent jobs; an optional explicitly pasted conversation snapshot is scoped to its chosen worker. No live chat access, repository paths, network or tool grant is inherited. Host-side permissions remain separately controlled. A required Astra/effort request blocks when the host cannot select it; no other model is silently substituted.
6. The host calls `deckweft_next_job`. Expected: a lease, immutable input, scoped grant and execution capsule. The capsule pins adopted task ids/acceptance, roadmap/rule/source hashes, base revision and selected input. Imported deck text is data.
7. Return a complete project with the assigned id, revision 0, requested schema version and supplied source ids/URLs. Optional `deckweft_checkpoint` persists a schema-valid v2 storyboard. `deckweft_complete_job` validates the final draft and can carry bounded **reported** token counts. Expected: `needs-review`, not applied.
8. Review the returned content and timeline, then select **Save and open a new copy**. Expected: the new project opens and the source is intact. Exact application retries return the same copy.

The generic connected-host mode is advisory when selection/effort cannot be confirmed. A known host-reported effort above the grant ceiling is blocked. Required mode also checks the returned host report. Neither a capability declaration nor a runner flag is independent server model attestation. See the actual pilot's limits before comparing costs.

## CLI transport

Use the absolute paths from Connection details:

```bash
node /absolute/path/to/DeckWeft/bin/deckweft-worker.mjs wait \
  --home /absolute/path/to/library --name Dot --model ACTUAL_HOST_MODEL \
  --timeout-ms 45000
```

For a host that actually supports selection, add `--effort medium --capabilities /absolute/path/to/capabilities.json`. For example, a capable host may declare:

```json
{"modelSelection":true,"effortSelection":true,"models":[{"id":"gpt-6-astra","efforts":["medium","high"]}],"cancel":true,"usage":true,"events":true,"conversationOperations":[]}
```

These flags report the external host's configuration; the worker does not select its model. Do not copy this declaration into an incapable host.

If the response is `waiting`, poll again while authorized. If `claimed`, read `jobPath`, draft with the host model, write a separate JSON file and submit:

```bash
node /absolute/path/to/DeckWeft/bin/deckweft-worker.mjs complete \
  --home /absolute/path/to/library --job CLAIMED_JOB_ID \
  --draft /absolute/path/to/generated.deck.json
```

Expected: `needs-review`. `checkpoint` accepts the same file arguments for a v2 storyboard. A validator failure needs a corrected proposal, not an unchanged resubmission. The CLI identity and leases remain private files outside project JSON.

## Progress and recovery

The durable state machine is queued → running → validating → needs-review → applied, plus blocked, failed, cancelled and expired. Completion of a model turn alone never applies a project. A single host cannot acquire two simultaneous leases.

Progress uses a fixed three-task DAG: planning 30, draft 45 and validation 25 units. A checkpoint earns planning weight only after schema validation; final draft/fit checks earn the remainder. Opaque model turns are indeterminate. The percentage describes validated work, not elapsed time or hidden reasoning. A revised scope requires a new request/grant. ETA needs three comparable successful runs and reports a range, low confidence and sample count; otherwise it says insufficient history. Disconnects and review waits have named states.

- Reopen the dialog to recover the source project's latest job. The displayed brief, effort and duration come from that job's actual request.
- Cursor polling is available at authenticated `/api/agent/jobs/ID/events?after=SEQUENCE`; a gap reports bounded-log truncation. Events retain job/task/attempt ids, sequence, timestamps and artifact hashes, without lease tokens or transcript bodies.
- A failed/expired job with a verified checkpoint offers **Authorize checkpoint retry**. This is a new grant/lease and attempt, preserving the prior capsule reference. Revoked grants cannot resume.
- **Cancel job** or disabling the bridge revokes unfinished work and rejects late results. Existing local drafts/checkpoints remain retained; cancellation cannot undo an already applied copy.
- `deckweft_fail_job` accepts a named host/validation/tool failure. It does not accept raw private logs.
- Heartbeats last 90 seconds; a claimed lease lasts at most ten minutes and never outlives its grant. A long owned turn can complete within its lease without a fresh heartbeat. Expiry never silently retries model work.
- Queue state is bounded to 20 jobs, 200 retained events per job and 8 MB. It never silently prunes jobs. Use a separate library when full. Old queue v1 is preserved before migration; old in-flight jobs are cancelled and need new scoped consent.
- Queue/application/cancellation share an exclusive lock. A stale lock is not automatically deleted. Stop related processes, preserve the files and inspect the lock before manual recovery.
- A server restart invalidates old browser session tokens. Reload the Studio; preserve unsaved work before restarting during development.

## Separate code proposals

A deck grant cannot submit code. The authenticated request API can instead create a `code-change` policy with exact `src/*.mjs` paths and an optional `npm run verify` command declaration. `deckweft_complete_patch` accepts bounded replacements with capsule-pinned base hashes, refuses paths outside the grant and checks the current source baseline. It retains a review proposal and **does not edit repository files or apply through the deck route**. Integration and multiple workers remain later work. No chat access is granted by either kind.

The local bridge cannot remove permissions a host already has. A capable host must obey its own sandbox and the grant. Project credential-field checks are an additional boundary; review ordinary text for sensitive material before sharing.

Run `npm run verify` for local source, contract, subprocess, lease, persistence, export and packaging checks. Local protocol tests and the actual Codex CLI task do not certify Dot desktop, Claude sign-in or native plugin activation.

The current [media and workers guide](media-workers.md) covers separate CLI identities, selected snapshots, worker progress and local image jobs. Dot desktop acceptance remains open.
