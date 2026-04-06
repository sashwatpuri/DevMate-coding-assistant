import { sanitizeStructuredAnalysis } from "./schema.js";

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function emit(onProgress, stage, progress, message) {
  if (typeof onProgress !== "function") return;
  try {
    onProgress({ stage, progress, message });
  } catch {
    // Ignore UI callback errors.
  }
}

function splitLines(code) {
  return (code || "").replace(/\r\n/g, "\n").split("\n");
}

function detectFunctionName(code, language) {
  if (language === "python") {
    const match = code.match(/def\s+([a-zA-Z_]\w*)\s*\(/);
    return match ? match[1] : "";
  }

  if (language === "java") {
    const match = code.match(
      /(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+([a-zA-Z_]\w*)\s*\(/,
    );
    return match ? match[1] : "";
  }

  const match = code.match(/(?:[\w:<>]+\s+)+([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{/);
  return match ? match[1] : "";
}

function detectComplexity(lines) {
  const source = lines.join("\n");
  const loopCount = (source.match(/\bfor\b|\bwhile\b/g) || []).length;
  const nestedPattern = /(for|while)[\s\S]{0,120}(for|while)/;
  const hasNestedLoops = nestedPattern.test(source);
  const hasSort = /\bsort\b|\bsorted\b/.test(source);

  if (hasNestedLoops || loopCount >= 2) {
    return { current: "O(n^2)", optimized: "O(n log n)", time: "O(n^2)", space: "O(1)" };
  }
  if (hasSort) {
    return { current: "O(n log n)", optimized: "O(n log n)", time: "O(n log n)", space: "O(1)" };
  }
  if (loopCount === 1) {
    return { current: "O(n)", optimized: "O(n)", time: "O(n)", space: "O(1)" };
  }
  return { current: "O(1)", optimized: "O(1)", time: "O(1)", space: "O(1)" };
}

function findBug(lines, language) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/for\s*\(.*;.*<=\s*[a-zA-Z_]\w*\.size\(\)/.test(line)) {
      return {
        line: i + 1,
        reason: "Potential out-of-bounds access because loop uses <= with size().",
        failing_input: "[1, 2, 3]",
      };
    }

    if (/range\s*\(\s*len\([^)]*\)\s*\+\s*1\s*\)/.test(line)) {
      return {
        line: i + 1,
        reason: "Off-by-one range may access an invalid index.",
        failing_input: "[1, 2, 3]",
      };
    }

    if (/\/\s*[a-zA-Z_]\w*/.test(line) && !/if|guard|assert/.test(lines.join(" "))) {
      return {
        line: i + 1,
        reason: "Division operation appears without zero-check guard.",
        failing_input: "divisor = 0",
      };
    }

    if (language === "python" && /\(\s*$/.test(line.trim())) {
      return {
        line: i + 1,
        reason: "Possible syntax error due to unmatched parenthesis.",
        failing_input: "Any run attempt",
      };
    }
  }

  return {
    line: null,
    reason: "No deterministic critical bug detected. Validate with edge-case tests.",
    failing_input: "Boundary values and empty input",
  };
}

function buildFlow(lines) {
  const flow = [{ id: "start", label: "Start" }];
  const edges = [];
  let previous = "start";
  let idx = 1;

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) return;

    let label = "";
    if (/for\s*\(|for\s+\w+\s+in\b/.test(line)) label = "Loop";
    else if (/while\s*\(/.test(line)) label = "While";
    else if (/if\s*\(|if\s+/.test(line)) label = "Condition";
    else if (/return\b/.test(line)) label = "Return";
    else if (/def\b|function\b|class\b/.test(line)) label = "Definition";
    else if (/try\b|catch\b|except\b/.test(line)) label = "Error Handling";

    if (!label) return;
    const id = `n${idx}`;
    idx += 1;
    flow.push({ id, label });
    edges.push({ from: previous, to: id });
    previous = id;
  });

  flow.push({ id: "end", label: "End" });
  edges.push({ from: previous, to: "end" });
  return { flow, edges };
}

function buildVariableTimeline(lines) {
  const timeline = [];
  const snapshot = {};
  let step = 1;
  const assignRegex = /^\s*([a-zA-Z_]\w*)\s*=\s*(.+)$/;
  const forIndexRegex = /for\s+([a-zA-Z_]\w*)\s+in/;

  lines.forEach((line) => {
    const assign = line.match(assignRegex);
    if (assign) {
      snapshot[assign[1]] = assign[2].slice(0, 60);
      timeline.push({ step, values: { ...snapshot } });
      step += 1;
      return;
    }

    const loopVar = line.match(forIndexRegex);
    if (loopVar) {
      snapshot[loopVar[1]] = snapshot[loopVar[1]] || "iter";
      timeline.push({ step, values: { ...snapshot } });
      step += 1;
    }
  });

  if (!timeline.length) {
    timeline.push({ step: 1, values: { note: "No variable assignments detected." } });
  }
  return timeline;
}

function buildRecursionTree(code, language) {
  const fn = detectFunctionName(code, language);
  if (!fn) return null;
  const calls = code.match(new RegExp(`\\b${fn}\\s*\\(`, "g")) || [];
  if (calls.length < 2) return null;

  return {
    label: `${fn}(n)`,
    children: [
      {
        label: `${fn}(n-1)`,
        children: [
          { label: `${fn}(n-2)`, result: "..." },
          { label: `${fn}(n-3)`, result: "..." },
        ],
      },
      {
        label: `${fn}(n-2)`,
        children: [{ label: `${fn}(n-4)`, result: "..." }],
      },
    ],
  };
}

function buildWalkthrough(lines) {
  const steps = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!steps.length) {
    return ["No executable statements detected."];
  }
  return steps.map((step, index) => `Step ${index + 1}: ${step}`);
}

function optimizeCode(code, language) {
  const source = (code || "").toLowerCase();
  const loopCount = (source.match(/\bfor\b|\bwhile\b/g) || []).length;
  const hasNestedLoops = /(for|while)[\s\S]{0,120}(for|while)/.test(source);

  if (hasNestedLoops && loopCount >= 2) {
    return {
      code: `// Suggested Optimization:\n// Consider using Hash Maps (O(1) lookup) or Sorting (O(n log n)) to eliminate quadratic O(n^2) time complexity.\n\n${code}`,
      notes: "Detected nested loops (O(n^2)). Consider replacing the inner loop with a Hash Map or Set for O(1) lookups, or sort the data first.",
    };
  }

  if (loopCount === 1) {
    return {
      code: `// Suggested Optimization:\n// Code is already O(n) linear time. See if any redundant operations can be pulled out of the loop.\n\n${code}`,
      notes: "Detected linear scan (O(n)). Ensure loop body operations are O(1).",
    };
  }

  return {
    code,
    notes: "No obvious structural bottlenecks detected block-by-block. Ensure no hidden complexities in library calls or external dependencies.",
  };
}

function applyQuickFix(code, bug, language) {
  if (!bug.line) return code;
  const lines = splitLines(code);
  const target = lines[bug.line - 1] || "";

  if (target.includes("<=") && target.includes(".size()")) {
    lines[bug.line - 1] = target.replace("<=", "<");
    return lines.join("\n");
  }

  if (language === "python" && /\(\s*$/.test(target.trim())) {
    lines[bug.line - 1] = `${target})`;
    return lines.join("\n");
  }

  return code;
}

function generateInterview(language, code) {
  const fnName = detectFunctionName(code, language);
  const subject = fnName ? `the '${fnName}' function` : "the provided code";

  return {
    problem: `Review and optimize ${subject}. Analyze its current time and space complexity, identify potential edge cases, and propose a more efficient solution if possible.`,
    hints: [
      "Consider the time complexity of any loops or built-in methods.",
      "Think about edge cases (empty inputs, negative values, large inputs).",
      "Can we use additional data structures (like HashMaps/Sets) to trade space for time?",
    ],
    expected_approach: `Discuss the current complexities, outline edge cases, and describe the optimal data structure in ${language}.`,
  };
}

export async function evaluateInterviewAnswer({ solution, language, interview }) {
  const source = solution || "";
  const usesMap = /\bhash|map|dict|unordered_map|HashMap|seen|set|Set\b/i.test(source);
  const hasLoop = /\bfor\b|\bwhile\b/.test(source);
  const returns = /\breturn\b/.test(source);

  let score = 4;
  if (hasLoop) score += 2;
  if (returns) score += 1;
  if (usesMap) score += 2;
  if (source.length > 50) score += 1;

  await wait(180);

  return {
    score,
    verdict: score >= 8 ? "Strong" : score >= 6 ? "Good" : "Needs Improvement",
    feedback: "Analysis of your answer based on general programming principles... " + (usesMap ? "Good use of efficient data structures." : "Consider leveraging Sets or Maps for faster lookups if applicable."),
    optimized_answer: "A strong response clearly defines time/space complexity, handles edge cases explicitly, and utilizes optimal data structures for the given problem scenario.",
    expected_approach: interview?.expected_approach || "",
  };
}

export async function analyzeLocally({ code = "", language = "python", mode = "full", onProgress, fallbackReason = "" } = {}) {
  const normalizedCode = typeof code === "string" ? code : String(code ?? "");
  const normalizedLanguage = String(language || "python").toLowerCase();

  emit(onProgress, "local:start", 0.1, "Parsing source code");
  await wait(120);

  const lines = splitLines(normalizedCode);
  const complexity = detectComplexity(lines);
  const bug = findBug(lines, normalizedLanguage);
  const flowPack = buildFlow(lines);
  const timeline = buildVariableTimeline(lines);
  const recursionTree = buildRecursionTree(normalizedCode, normalizedLanguage);
  const optimized = optimizeCode(normalizedCode, normalizedLanguage);
  const fixedCode = applyQuickFix(normalizedCode, bug, normalizedLanguage);

  emit(onProgress, "local:reason", 0.62, "Building flow graph and state timeline");
  await wait(120);

  const structured = sanitizeStructuredAnalysis(
    {
      explanation: fallbackReason
        ? `Browser inference fallback: ${fallbackReason}. Proceeding with deterministic bounds analysis.`
        : "Local deterministic analyzer produced structured reasoning artifacts for explanation, debugging, optimization, and visualization.",
      complexity: {
        time: complexity.time,
        space: complexity.space,
      },
      flow: flowPack.flow,
      edges: flowPack.edges,
      variables: timeline,
      bug,
      optimized_code: optimized.code,
      comparison: {
        current: complexity.current,
        optimized: complexity.optimized,
      },
      fixed_code: fixedCode,
      debug_reason: bug.reason,
      failing_test_case: `Input: ${bug.failing_input}\nExpected: safe behavior without boundary/runtime failure.`,
      recursion_tree: recursionTree,
      example_walkthrough: buildWalkthrough(lines),
      errors: bug.line ? [`Potential failure near line ${bug.line}`] : [],
      optimization_notes: optimized.notes,
      interview: generateInterview(normalizedLanguage, normalizedCode),
      mode,
    },
    { code: normalizedCode, language: normalizedLanguage, mode },
  );

  emit(onProgress, "local:done", 1, "Local structured analysis complete");
  return structured;
}

export default analyzeLocally;

