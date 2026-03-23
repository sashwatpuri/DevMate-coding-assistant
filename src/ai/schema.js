export const REQUIRED_ANALYSIS_FIELDS = Object.freeze([
  "explanation",
  "complexity",
  "flow",
  "edges",
  "variables",
  "bug",
  "optimized_code",
  "comparison",
]);

export const OPTIONAL_ANALYSIS_FIELDS = Object.freeze([
  "fixed_code",
  "debug_reason",
  "failing_test_case",
  "recursion_tree",
  "example_walkthrough",
  "errors",
  "optimization_notes",
  "interview",
]);

export const COMPACT_ANALYSIS_FIELDS = Object.freeze([
  "explanation",
  "bug",
  "complexity",
  "optimized_code",
  "interview",
]);

const EMPTY_RESULT = Object.freeze({
  explanation: "No analysis generated.",
  complexity: {
    time: "Unknown",
    space: "Unknown",
  },
  flow: [
    { id: "start", label: "Start" },
    { id: "end", label: "End" },
  ],
  edges: [{ from: "start", to: "end" }],
  variables: [{ step: 1, values: { note: "No variable updates captured." } }],
  bug: {
    line: null,
    reason: "No deterministic bug pattern detected.",
    failing_input: "N/A",
  },
  optimized_code: "",
  comparison: {
    current: "Unknown",
    optimized: "Unknown",
  },
  fixed_code: "",
  debug_reason: "",
  failing_test_case: "",
  recursion_tree: null,
  example_walkthrough: [],
  errors: [],
  optimization_notes: "",
  interview: {
    problem: "",
    hints: [],
    expected_approach: "",
  },
});

export const ANALYSIS_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: REQUIRED_ANALYSIS_FIELDS,
  properties: {
    explanation: { type: "string" },
    complexity: {
      type: "object",
      required: ["time", "space"],
      properties: {
        time: { type: "string" },
        space: { type: "string" },
      },
    },
    flow: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
        },
      },
    },
    variables: {
      type: "array",
      items: {
        type: "object",
      },
    },
    bug: {
      type: "object",
      properties: {
        line: { type: ["number", "null"] },
        reason: { type: "string" },
        failing_input: { type: "string" },
      },
    },
    optimized_code: { type: "string" },
    comparison: {
      type: "object",
      properties: {
        current: { type: "string" },
        optimized: { type: "string" },
      },
    },
  },
});

export const FULL_ANALYSIS_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: [],
  properties: {
    ...ANALYSIS_JSON_SCHEMA.properties,
    complexity: {
      type: "object",
      required: [],
      properties: {
        time: { type: "string" },
        space: { type: "string" },
      },
    },
    bug: {
      type: "object",
      required: [],
      properties: {
        line: { type: ["number", "null"] },
        reason: { type: "string" },
        description: { type: "string" },
        failing_input: { type: "string" },
      },
    },
    fixed_code: { type: "string" },
    debug_reason: { type: "string" },
    failing_test_case: { type: "string" },
    recursion_tree: { type: ["object", "null"] },
    example_walkthrough: {
      type: "array",
      items: { type: "string" },
    },
    errors: {
      type: "array",
      items: { type: "string" },
    },
    optimization_notes: { type: "string" },
    interview: {
      type: "object",
      properties: {
        problem: { type: "string" },
        hints: {
          type: "array",
          items: { type: "string" },
        },
        expected_approach: { type: "string" },
      },
    },
  },
});

export const COMPACT_ANALYSIS_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: [],
  properties: {
    explanation: { type: "string" },
    bug: {
      type: "object",
      required: [],
      properties: {
        line: { type: ["number", "null"] },
        reason: { type: "string" },
        description: { type: "string" },
      },
    },
    complexity: {
      type: "object",
      required: [],
      properties: {
        time: { type: "string" },
        space: { type: "string" },
      },
    },
    optimized_code: { type: "string" },
    interview: {
      type: "object",
      required: [],
      properties: {
        problem: { type: "string" },
        hints: {
          type: "array",
          items: { type: "string" },
        },
        expected_approach: { type: "string" },
      },
    },
  },
});

export const INTERVIEW_EVALUATION_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: ["score", "verdict", "feedback", "optimized_answer"],
  properties: {
    score: { type: "number" },
    verdict: { type: "string" },
    feedback: { type: "string" },
    optimized_answer: { type: "string" },
  },
});

function asObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value, fallback = "") {
  if (typeof value === "string") {
    return value.trim() ? value : fallback;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function asLine(value) {
  const line = Number(value);
  return Number.isInteger(line) && line > 0 ? line : null;
}

function normalizeFlow(flow) {
  return asArray(flow)
    .map((node, index) => {
      const source = asObject(node, {});
      return {
        id: asString(source.id || `node-${index + 1}`),
        label: asString(source.label || source.title || source.name || `Step ${index + 1}`),
      };
    })
    .filter((node) => node.id && node.label);
}

function normalizeEdges(edges, flow) {
  const normalized = asArray(edges)
    .map((edge, index) => {
      const source = asObject(edge, {});
      const from = asString(source.from || source.source);
      const to = asString(source.to || source.target);
      if (!from || !to) return null;
      return {
        id: asString(source.id || `edge-${index + 1}`),
        from,
        to,
        label: asString(source.label, ""),
      };
    })
    .filter(Boolean);

  if (normalized.length > 0) {
    return normalized;
  }

  if (flow.length >= 2) {
    return flow.slice(0, -1).map((node, index) => ({
      id: `edge-${index + 1}`,
      from: node.id,
      to: flow[index + 1].id,
      label: "",
    }));
  }

  return [];
}

function normalizeVariables(variables) {
  const rows = asArray(variables);
  if (!rows.length) {
    return JSON.parse(JSON.stringify(EMPTY_RESULT.variables));
  }

  const allTimelineRows = rows.every((row) => {
    const source = asObject(row, {});
    return Object.prototype.hasOwnProperty.call(source, "step") && typeof source.values === "object";
  });

  if (allTimelineRows) {
    return rows.map((row, index) => {
      const source = asObject(row, {});
      return {
        step: Number(source.step) || index + 1,
        values: asObject(source.values, {}),
      };
    });
  }

  return rows.map((row, index) => {
    const source = asObject(row, {});
    const name = asString(source.name || source.id || `var_${index + 1}`);
    const value = asString(source.type || source.role || source.value || "tracked");
    return {
      step: index + 1,
      values: {
        [name]: value,
      },
    };
  });
}

function normalizeInterview(interview) {
  const source = asObject(interview, {});
  return {
    problem: asString(source.problem || source.interview_prompt, ""),
    hints: asArray(source.hints).map((hint) => asString(hint)).filter(Boolean),
    expected_approach: asString(source.expected_approach || "", ""),
  };
}

export function createBaseAnalysis({ code = "", language = "unknown", mode = "analyze" } = {}) {
  return {
    ...JSON.parse(JSON.stringify(EMPTY_RESULT)),
    explanation: `Structured ${mode} analysis generated for ${language}.`,
    optimized_code: typeof code === "string" ? code : String(code ?? ""),
  };
}

export function sanitizeStructuredAnalysis(raw, context = {}) {
  const base = createBaseAnalysis(context);
  const source = asObject(raw, {});
  const flow = normalizeFlow(source.flow);

  return {
    explanation: asString(source.explanation, base.explanation),
    complexity: {
      time: asString(asObject(source.complexity).time, base.complexity.time),
      space: asString(asObject(source.complexity).space, base.complexity.space),
    },
    flow: flow.length ? flow : base.flow,
    edges: normalizeEdges(source.edges, flow.length ? flow : base.flow),
    variables: normalizeVariables(source.variables),
    bug: {
      line: asLine(asObject(source.bug).line),
      reason: asString(asObject(source.bug).reason || asObject(source.bug).description, base.bug.reason),
      failing_input: asString(asObject(source.bug).failing_input, base.bug.failing_input),
    },
    optimized_code: asString(source.optimized_code, base.optimized_code),
    comparison: {
      current: asString(asObject(source.comparison).current, base.comparison.current),
      optimized: asString(asObject(source.comparison).optimized, base.comparison.optimized),
    },
    fixed_code: asString(source.fixed_code, ""),
    debug_reason: asString(source.debug_reason, ""),
    failing_test_case:
      typeof source.failing_test_case === "object"
        ? JSON.stringify(source.failing_test_case, null, 2)
        : asString(source.failing_test_case, ""),
    recursion_tree: source.recursion_tree || null,
    example_walkthrough: asArray(source.example_walkthrough).map((entry) => asString(entry)),
    errors: asArray(source.errors).map((entry) => asString(entry)),
    optimization_notes: asString(source.optimization_notes, ""),
    interview: normalizeInterview(source.interview || source.interview_eval || {}),
  };
}

export function hasRequiredAnalysisFields(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return REQUIRED_ANALYSIS_FIELDS.every((field) =>
    Object.prototype.hasOwnProperty.call(value, field),
  );
}

export function getSchemaPromptSnippet() {
  return JSON.stringify(ANALYSIS_JSON_SCHEMA, null, 2);
}

export function createEmptyResult() {
  return createBaseAnalysis({});
}

export function normalizeAnalysisResult(raw) {
  return sanitizeStructuredAnalysis(raw, {});
}
