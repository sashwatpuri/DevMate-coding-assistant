import React from "react";

function Section({ title, children }) {
  return (
    <section className="explanation-card">
      <h3 className="explanation-card-title">{title}</h3>
      <div className="explanation-card-body">{children}</div>
    </section>
  );
}

export default function ExplanationTab({ result, isLoading }) {
  if (isLoading) {
    return (
      <div className="tab-content-stack">
        {["Step-by-step Explanation", "Complexity Analysis", "Example Walkthrough"].map((title) => (
          <Section key={title} title={title}>
            <div className="tab-skeleton-stack" aria-hidden="true">
              <div className="skeleton skeleton-line skeleton-line--lg" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line skeleton-line--md" />
              <div className="skeleton skeleton-line skeleton-line--sm" />
            </div>
          </Section>
        ))}
      </div>
    );
  }

  if (!result) {
    return <div className="tab-empty">Analyze code to see results</div>;
  }

  const walkthrough = Array.isArray(result.example_walkthrough)
    ? result.example_walkthrough
    : [];

  return (
    <div className="tab-content-stack">
      <Section title="Step-by-step Explanation">
        <p className="prose-text-neon">{result.explanation || "No explanation generated."}</p>
      </Section>

      <Section title="Complexity Analysis">
        <div className="kv-grid">
          <div className="kv-item">
            <span className="kv-label">Time</span>
            <code className="kv-value">{result?.complexity?.time || "N/A"}</code>
          </div>
          <div className="kv-item">
            <span className="kv-label">Space</span>
            <code className="kv-value">{result?.complexity?.space || "N/A"}</code>
          </div>
        </div>
      </Section>

      <Section title="Example Walkthrough">
        {walkthrough.length > 0 ? (
          <ol className="ordered-list">
            {walkthrough.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="muted-text">No walkthrough steps available.</p>
        )}
      </Section>
    </div>
  );
}
