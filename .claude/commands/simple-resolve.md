---
description: Solve a task with lightweight parallel reasoning in a single command—produce a concise plan, implement, then smoke-test and check for hallucinations.
argument-hint: [Problem] | [Constraints] | [Output format]
---

Input:
$ARGUMENTS

Output format (must follow exactly):
- [Summary] one line
- [Immediate Plan] up to 3 short steps
- [Solution] final code/content only (no extra narration)
- [Smoke Test] 1–2 minimal usage/run examples
- [Hallucination Check] confirm no out-of-input assumptions, no “unknown source” facts, and constraints are reflected

Procedure:
1) Parse `$ARGUMENTS` into `Problem | Constraints | Output format` (empty if missing).
2) Brief “micro-parallel” exploration (A/B/C). If helpful, **invoke already-registered subagents by name** for 1–2 line recommendations; otherwise reason internally. Keep only **one** shortest path.
3) Implement the solution (no superfluous commentary).
4) Provide a tiny smoke test (sample input/output or command to run).
5) Hallucination check:
   - Do not invent APIs/versions/numbers not present in the input.
   - Exclude anything with unknown or unverifiable sources.
   - State in one line that constraints are enforced in the solution & test.
