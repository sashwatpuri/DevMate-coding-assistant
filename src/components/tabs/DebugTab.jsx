import React from "react";
import CodeDiffViewer from "../editor/CodeDiffViewer";

function DebugCard({ title, children }) {
  return (
    <section className="debug-card">
      <h3 className="debug-card-title">{title}</h3>
      <div className="debug-card-body">{children}</div>
    </section>
  );
}

export default function DebugTab({ result, originalCode, language, isLoading, theme = "vs-dark" }) {
  if (isLoading) {
    return (
      <div className="tab-content-stack">
        {[0, 1, 2, 3].map((index) => (
          <DebugCard
            key={index}
            title={index === 0 ? "Failure Point" : index === 1 ? "Error Notes" : index === 2 ? "Failing Test Case" : "Fixed Code"}
          >
            <div className="tab-skeleton-stack" aria-hidden="true">
              {index === 0 ? (
                <>
                  <div className="skeleton skeleton-line skeleton-line--sm" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--lg" />
                </>
              ) : index === 1 ? (
                <>
                  <div className="skeleton skeleton-line skeleton-line--md" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--sm" />
                </>
              ) : index === 2 ? (
                <div className="skeleton skeleton-block skeleton-block--tall" />
              ) : (
                <>
                  <div className="skeleton skeleton-block skeleton-block--xl" />
                  <div className="skeleton skeleton-line skeleton-line--sm" />
                </>
              )}
            </div>
          </DebugCard>
        ))}
      </div>
    );
  }

  if (!result) {
    return <div className="tab-empty">Analyze code to see results</div>;
  }

  const bug = result.bug || {};
  const fixedCode = result.fixed_code || result.optimized_code || "";
  const errorReasons = Array.isArray(result.errors) ? result.errors : [];

  return (
    <div className="tab-content-stack">
      <DebugCard title="Failure Point">
        <div className="kv-grid">
          <div className="kv-item">
            <span className="kv-label">Failing Line</span>
            <code className="kv-value">{bug.line || "Unknown"}</code>
          </div>
          <div className="kv-item">
            <span className="kv-label">Failing Input</span>
            <code className="kv-value">{bug.failing_input || "Not provided"}</code>
          </div>
        </div>
        <p className="prose-text-neon">{bug.reason || result.debug_reason || "No reason available."}</p>
      </DebugCard>

      <DebugCard title="Error Notes">
        {errorReasons.length > 0 ? (
          <ul className="unordered-list">
            {errorReasons.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">No explicit errors detected.</p>
        )}
      </DebugCard>

      <DebugCard title="Failing Test Case">
        <pre className="code-block-neon">{result.failing_test_case || bug.failing_input || "N/A"}</pre>
      </DebugCard>

      <DebugCard title="Fixed Code">
        {fixedCode ? (
          <CodeDiffViewer
            originalCode={originalCode}
            fixedCode={fixedCode}
            language={language}
            theme={theme}
          />
        ) : (
          <p className="muted-text">No automatic fix was generated.</p>
        )}
      </DebugCard>
    </div>
  );
}
