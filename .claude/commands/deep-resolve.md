---
description: Perform parallel deep analysis with available subagents, produce an actionable plan, implement via a TDD cycle while preserving FSD boundaries, then verify with tests and hallucination checks.
argument-hint: [Problem] | [Constraints] | [Agents (optional)] | [Output format]
---

Input:
$ARGUMENTS

High-level steps:
1) Break the problem into logical components.  
2) Assign each component to available subagents for specialized, **parallel** analysis (or reason internally if none are available).  
3) Collect and merge results into a **comprehensive Action Plan**.  
4) Apply the plan **using a Test-Driven Development (TDD) cycle (red → green → refactor)** while **preserving Feature-Sliced Design (FSD) boundaries and public APIs**, to deliver a **complete and robust solution**.  
5) Review the final code/content and **verify whether any hallucinations or fabricated details exist**.  
Ensure all outputs are consistent, accurate, and production-ready.

Output format (must follow exactly):
- [Summary] one line
- [Action Plan] numbered list (3–7 steps, each 1–2 lines, owner noted if a subagent contributed)
- [Solution] final code/content only (no extra narration)
- [Tests] 1–3 minimal smoke tests (command or sample I/O)
- [Hallucination Check]
  - No out-of-input assumptions (APIs/versions/numbers)
  - No “unknown source” claims; sources listed below
  - Constraints reflected in solution & tests (one line verdict)
- [Sources] bullet list of links or identifiers (only if external info was used)

Procedure:
1) Parse `$ARGUMENTS` into four slots: `Problem | Constraints | Agents | Output`.
   - If `Agents` is empty, use any already-registered subagents by description match.
   - If no subagents are available, reason internally.

2) Parallel deep analysis (keep it simple):
   - For each logical component (max 5), obtain a 1–2 line note from a relevant subagent.
   - Summarize conflicts/risks in 1–2 lines.
   - Collapse into a **single** optimal, minimal-change plan.

3) Implementation:
   - Generate only the artifacts required by the plan.
   - If file edits are implied, list target files before changes.
   - Avoid extra commentary.

4) Tests:
   - Provide 1–3 smallest smoke tests (runnable commands or I/O examples).
   - Prefer repo-native runners if present (e.g., `npm test -w <pkg>` or `pytest -q`).

5) Hallucination check:
   - If any external facts were used, include a short [Sources] section (no fabricated URLs).
   - State whether constraints are enforced in both solution and tests.
   - Remove any TODO/FIXME placeholders from final output.

Architecture & Testing Requirements:
- **FSD structure:** Respect the standard layers (e.g., app → processes → pages → widgets → features → entities → shared); import across slices/modules **only via their public APIs**; keep domain-aware logic in **features/entities** and place generic, reusable UI/utility in **shared**. :contentReference[oaicite:2]{index=2}
- **TDD strategy:** For each actionable step, **write a failing test first**, implement the minimum code to pass, then **refactor** while keeping tests green. Prefer **behavior-focused tests** over implementation details and include **1–3 smoke tests** in the output. :contentReference[oaicite:3]{index=3}

Notes:
- Use MCP tools **only when** external docs/data are strictly required; otherwise rely on repository context. :contentReference[oaicite:4]{index=4}
- If a subagent fails or is missing, fall back to internal reasoning and continue. :contentReference[oaicite:5]{index=5}
