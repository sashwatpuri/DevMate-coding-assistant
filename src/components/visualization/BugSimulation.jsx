import React from "react";

function getSnippet(code, line) {
  if (!code || !line) return "";
  const lines = code.split(/\r?\n/);
  const start = Math.max(0, line - 3);
  const end = Math.min(lines.length, line + 2);
  return lines.slice(start, end).map((entry, idx) => {
    const lineNumber = start + idx + 1;
    const prefix = lineNumber === line ? ">" : " ";
    return `${prefix} ${String(lineNumber).padStart(3, " ")} | ${entry}`;
  }).join("\n");
}

export default function BugSimulation({ bug, code, isLoading }) {
  if (isLoading) {
    return <div className="visualization-placeholder-glass">Simulating failure path...</div>;
  }

  if (!bug || !bug.line) {
    return <div className="visualization-empty-glass">No deterministic bug location to simulate.</div>;
  }

  return (
    <section className="bug-simulation-glass">
      <div className="bug-meta-glass">
        <span className="bug-chip-neon">Failing line: {bug.line}</span>
        <span className="bug-chip-neon">Input: {bug.failing_input || "N/A"}</span>
      </div>
      <p className="prose-text-neon">{bug.reason}</p>
      <pre className="code-block-neon bug-snippet-neon">{getSnippet(code, bug.line)}</pre>
    </section>
  );
}

