import React from "react";
import CodeDiffViewer from "../editor/CodeDiffViewer";

export default function OptimizeTab({ result, originalCode, language, isLoading, theme = "vs-dark" }) {
  if (isLoading) {
    return (
      <div className="tab-content-stack">
        {[0, 1].map((index) => (
          <section className="optimize-card" key={index}>
            <h3 className="optimize-card-title">
              {index === 0 ? "Complexity Comparison" : "Original vs Optimized"}
            </h3>
            <div className="optimize-card-body" aria-hidden="true">
              {index === 0 ? (
                <div className="kv-grid">
                  <div className="kv-item">
                    <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                    <span className="skeleton skeleton-line skeleton-line--md" />
                  </div>
                  <div className="kv-item">
                    <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                    <span className="skeleton skeleton-line skeleton-line--md" />
                  </div>
                </div>
              ) : (
                <div className="tab-skeleton-stack">
                  <div className="skeleton skeleton-block skeleton-block--xl" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--md" />
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (!result) {
    return <div className="tab-empty">Analyze code to see results</div>;
  }

  const optimizedCode = result.optimized_code || "";

  return (
    <div className="tab-content-stack">
      <section className="optimize-card">
        <h3 className="optimize-card-title">Complexity Comparison</h3>
        <div className="optimize-card-body">
          <div className="kv-grid">
            <div className="kv-item">
              <span className="kv-label">Current</span>
              <code className="kv-value">{result?.comparison?.current || "N/A"}</code>
            </div>
            <div className="kv-item">
              <span className="kv-label">Optimized</span>
              <code className="kv-value">{result?.comparison?.optimized || "N/A"}</code>
            </div>
          </div>
          {result.optimization_notes ? <p className="prose-text-neon">{result.optimization_notes}</p> : null}
        </div>
      </section>

      <section className="optimize-card">
        <h3 className="optimize-card-title">Original vs Optimized</h3>
        <div className="optimize-card-body">
          {optimizedCode ? (
            <CodeDiffViewer
              originalCode={originalCode}
              optimizedCode={optimizedCode}
              language={language}
              theme={theme}
            />
          ) : (
            <p className="muted-text">No optimized code generated.</p>
          )}
        </div>
      </section>
    </div>
  );
}
