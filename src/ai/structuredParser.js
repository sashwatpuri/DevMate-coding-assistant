import { sanitizeStructuredAnalysis } from "./schema.js";

function stripCodeFences(input) {
  return String(input || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

export function tryParseJson(input) {
  if (input && typeof input === "object") {
    return input;
  }

  if (typeof input !== "string") {
    return null;
  }

  let cleaned = stripCodeFences(input);
  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");
  const firstArray = cleaned.indexOf("[");
  const lastArray = cleaned.lastIndexOf("]");

  const firstJsonIndex = [firstObject, firstArray].filter((index) => index !== -1).sort((a, b) => a - b)[0];
  const lastJsonIndex = Math.max(lastObject, lastArray);

  if (Number.isInteger(firstJsonIndex) && Number.isInteger(lastJsonIndex) && firstJsonIndex !== -1 && lastJsonIndex !== -1 && lastJsonIndex >= firstJsonIndex) {
    cleaned = cleaned.slice(firstJsonIndex, lastJsonIndex + 1);
  } else if (Number.isInteger(firstJsonIndex) && firstJsonIndex > 0) {
    cleaned = cleaned.slice(firstJsonIndex);
  } else if (Number.isInteger(lastJsonIndex) && lastJsonIndex !== -1) {
    cleaned = cleaned.slice(0, lastJsonIndex + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export function parseStructuredFragment(input, key) {
  const parsed = tryParseJson(input);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (key && Object.prototype.hasOwnProperty.call(parsed, key)) {
    return parsed;
  }

  return parsed;
}

export function mergeAnalysisFragments(fragments, context) {
  const combined = fragments.reduce((accumulator, fragment) => {
    if (!fragment || typeof fragment !== "object") {
      return accumulator;
    }

    return {
      ...accumulator,
      ...fragment,
      complexity: {
        ...(accumulator.complexity || {}),
        ...(fragment.complexity || {}),
      },
      comparison: {
        ...(accumulator.comparison || {}),
        ...(fragment.comparison || {}),
      },
      bug: {
        ...(accumulator.bug || {}),
        ...(fragment.bug || {}),
      },
      interview: {
        ...(accumulator.interview || {}),
        ...(fragment.interview || {}),
      },
    };
  }, {});

  return sanitizeStructuredAnalysis(combined, context);
}

export function buildParseError(message, rawOutput) {
  return {
    message,
    rawOutput: String(rawOutput || "").slice(0, 1200),
  };
}
