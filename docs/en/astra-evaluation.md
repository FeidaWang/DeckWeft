# Astra medium/high: a bounded local pilot

[简体中文](../zh-CN/astra-evaluation.md) · [Raw results](../evidence/mb-06-10/astra/results.json) · [Corpus](../../tests/evals/astra-corpus.json)

On 2026-10-17, the installed Codex CLI 0.160.0 completed four actual host turns requesting `gpt-6-astra`: two medium and two high. Each turn received the same six short tasks: English pitch, Chinese/mixed text, supplied evidence, an image-dependent plan, interaction, and a pure JavaScript boundary repair. The second repeat reversed the effort order. These are **four batched turns and 24 task results**, not 24 independent timing trials.

| Per six-task batch | Medium | High |
| --- | ---: | ---: |
| Repeats | 2 | 2 |
| Accepted task results under current automatic gates | 12/12 | 12/12 |
| Mean subprocess wall time | 31.271 s | 36.567 s |
| Mean reported input tokens | 16,598 | 16,598 |
| Mean reported cached input tokens | 12,288 | 12,288 |
| Mean reported output tokens | 971 | 1,385 |
| Mean reported reasoning output tokens | 53 | 137.5 |
| Repair turns | 0 | 0 |
| Dollar cost | Unknown | Unknown |

The checks validate the project/interaction contract, offline derived fit, expected family, supplied source reference and limitation, image alternatives, and six executable code-boundary cases. All raw replies were also read during the agent review. Seven representative demo pages and a Chinese page were measured and inspected in the browser; final PowerPoint cover/comparison/image pages and the seven-page sorter were inspected. This was not a blinded human study; human acceptance time is unavailable.

Medium is the version 2 policy's default for this bounded planning workload. High took about 17% longer and emitted about 43% more output tokens without improving these pass/fail results. Some additional output is JSON formatting. This does not establish equal semantic quality, billed cost or a universal best effort. Complex synthesis, repository-scale repair, image generation, tool use and retry-heavy workflows remain unmeasured. The high repair route remains an unevaluated candidate and must stay within the grant ceiling.

The CLI accepted the requested model/effort flags and returned actual token usage. There was no independent server model/effort attestation and no bill/API cost record. Requested settings, runner-reported settings and `apiConfirmed: null` remain separate. A host plan or subscription is never converted into a dollar price. The [official Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra) describes API capabilities; it is not proof of this host's model identity or billing.

A separate actual CLI task exercised the queue, scoped handshake, claimed capsule, generated two-slide draft, validated checkpoint, needs-review state and browser save-as-copy. [Host record](../evidence/mb-06-10/host-review.json). It used 25,619 reported input tokens and 1,124 output tokens in about 30.6 seconds. It is separate from the paired comparison and from Dot desktop acceptance.

Re-run only when host usage is explicitly authorized:

```bash
node scripts/evaluate-astra.mjs --live --out dist/my-astra-eval --repeats 2
```

Use a fresh output directory to retain earlier evidence. The live script uses the signed-in CLI's existing host permissions and a read-only working directory. It adds no API provider, credential storage or runtime dependency. The date and corpus/prompt/output hashes are stored with the results. A later model or policy change needs a new comparison.
