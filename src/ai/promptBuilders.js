import { RUNANYWHERE_MAX_CODE_CHARS } from "./runAnywhereConfig.js";

function normalizeLanguage(language) {
  return String(language || "python").toLowerCase();
}

function trimCode(code) {
  const source = typeof code === "string" ? code : String(code ?? "");
  if (source.length <= RUNANYWHERE_MAX_CODE_CHARS) {
    return { code: source, truncated: false, originalLength: source.length };
  }

  return {
    code: source.slice(0, RUNANYWHERE_MAX_CODE_CHARS),
    truncated: true,
    originalLength: source.length,
  };
}

function buildEnvelope({ instruction, code, language, extra = "" }) {
  const normalizedLanguage = normalizeLanguage(language);
  const prepared = trimCode(code);
  const truncationNote = prepared.truncated
    ? `Source was truncated from ${prepared.originalLength} to ${prepared.code.length} characters to fit the browser model context budget.`
    : "Source was not truncated.";

  return [
    instruction.trim(),
    "",
    `Language: ${normalizedLanguage}`,
    truncationNote,
    extra.trim(),
    "",
    "Source code:",
    prepared.code,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCodeExcerpt(code, limit = 1400) {
  const source = typeof code === "string" ? code : String(code ?? "");
  if (source.length <= limit) {
    return source.trim();
  }

  return `${source.slice(0, limit).trim()}\n... [truncated]`;
}

export function buildFullAnalysisPrompt(code, language) {
  return buildEnvelope({
    code,
    language,
    instruction: `You are DevMate, a browser-local code analysis engine.
Return one JSON object only.
Required output:
- explanation: concise summary of what the code does
- complexity: { time, space }
- flow: 4-8 major execution nodes with stable ids
- edges: directed edges that reference the flow node ids
- variables: up to 6 timeline snapshots in the form { step, values }
- bug: the single most important likely bug with line, reason, and failing_input
- optimized_code: a stronger implementation in the same language
- comparison: { current, optimized }
- fixed_code: the smallest bug-focused fix
- debug_reason: concise explanation of the bug
- failing_test_case: short failing scenario
- recursion_tree: null when recursion is absent
- example_walkthrough: 3-6 short steps
- errors: likely runtime or logic issues
- optimization_notes: concise optimization rationale
- interview: { problem, hints, expected_approach }
Keep values compact and UI-friendly. Do not add markdown fences or commentary.`,
  });
}

export function buildCompactAnalysisPrompt(code, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const prepared = trimCode(code);

  return [
    "You are DevMate. Return JSON only with keys: explanation, bug, complexity, optimized_code, interview.",
    "bug={line,description}; complexity={time,space}; interview={problem,hints:[]}.",
    `Language: ${normalizedLanguage}`,
    "",
    "Code:",
    prepared.code,
  ].join("\n");
}

export function buildInterviewEvaluationPrompt(problem, solution, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const prepared = trimCode(solution);

  return [
    `You are DevMate, a browser-local mock interview evaluator.
Return valid JSON only with keys: score, verdict, feedback, optimized_answer.
Use a 0-10 integer score.`,
    "",
    `Language: ${normalizedLanguage}`,
    "",
    "Interview problem:",
    problem || "No problem provided.",
    "",
    "Candidate solution:",
    prepared.code,
  ].join("\n");
}

export function buildRepairPrompt(rawOutput, expectedKeys) {
  return `Return valid JSON only. Remove commentary and repair the payload so it contains these keys: ${expectedKeys.join(", ")}\n\nPayload to repair:\n${rawOutput}`;
}

export function buildVoiceAssistantPrompt({
  code = "",
  language = "python",
  activeTab = "Visualize",
  analysis = null,
} = {}) {
  const normalizedLanguage = normalizeLanguage(language);
  const summaryLines = [
    "You are DevMate, a fast on-device voice coding copilot in the browser.",
    "Keep spoken responses concise: 1-2 short sentences unless the user explicitly asks for detail.",
    "Use the current workspace context to answer questions about the code.",
    "If the user issues a command like explain, debug, optimize, visualize, or interview, respond naturally and keep the guidance actionable.",
    "",
    `Current workspace tab: ${activeTab}`,
    `Current language: ${normalizedLanguage}`,
  ];

  const analysisSummary = [];
  if (analysis?.explanation) {
    analysisSummary.push(`Analysis summary: ${analysis.explanation}`);
  }
  if (analysis?.bug?.reason) {
    analysisSummary.push(`Known bug: ${analysis.bug.reason}`);
  }
  if (analysis?.comparison?.current || analysis?.comparison?.optimized) {
    analysisSummary.push(
      `Complexity: current ${analysis?.comparison?.current || "unknown"}, optimized ${analysis?.comparison?.optimized || "unknown"}`,
    );
  }
  if (analysis?.interview?.problem) {
    analysisSummary.push(`Interview prompt focus: ${analysis.interview.problem}`);
  }

  return [
    ...summaryLines,
    "",
    analysisSummary.length ? analysisSummary.join("\n") : "No prior analysis summary is available yet.",
    "",
    "Current code excerpt:",
    buildCodeExcerpt(code),
    "",
    "Speak as if you are guiding the user inside the app. If the transcript looks like a command, prioritize the command intent over general explanation.",
  ].join("\n");
}
