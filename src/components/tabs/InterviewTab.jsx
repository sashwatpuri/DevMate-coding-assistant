import { useEffect, useMemo, useState } from "react";

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function InterviewTab({
  interview,
  language,
  onEvaluate,
  evaluation,
  isEvaluating,
  isLoading,
}) {
  const [solution, setSolution] = useState("");
  const [remaining, setRemaining] = useState(30 * 60);
  const [hintIndex, setHintIndex] = useState(0);
  const [validationMessage, setValidationMessage] = useState("");

  const normalizedLanguage = (language || "code").toUpperCase();
  const hints = useMemo(() => (Array.isArray(interview?.hints) ? interview.hints : []), [interview]);
  const visibleHints = hints.slice(0, hintIndex);

  useEffect(() => {
    setHintIndex(0);
    setRemaining(30 * 60);
    setSolution("");
    setValidationMessage("");
  }, [interview?.problem]);

  useEffect(() => {
    let timer;
    if (interview?.problem && remaining > 0) {
      timer = window.setInterval(() => {
        setRemaining((current) => (current > 0 ? current - 1 : 0));
      }, 1000);
    }

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [interview?.problem, remaining]);

  if (isLoading) {
    return (
      <div className="interview-workbench-layout">
        {[0, 1].map((column) => (
          <div
            className={column === 0 ? "interview-column interview-column--support" : "interview-column interview-column--main"}
            key={column}
          >
            {column === 0 ? (
              <>
                <section className="panel-card interview-panel-card">
                  <h3 className="panel-card-title">Live Timer</h3>
                  <div className="panel-card-body" aria-hidden="true">
                    <div className="interview-stat-grid">
                      <div className="interview-stat-card">
                        <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                        <span className="skeleton skeleton-line skeleton-line--lg" />
                      </div>
                      <div className="interview-stat-card">
                        <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                        <span className="skeleton skeleton-line skeleton-line--md" />
                      </div>
                    </div>
                    <div className="skeleton skeleton-line skeleton-line--lg" />
                    <div className="skeleton skeleton-line" />
                  </div>
                </section>

                <section className="panel-card interview-panel-card interview-panel-card--signal">
                  <h3 className="panel-card-title">Interview Problem</h3>
                  <div className="panel-card-body" aria-hidden="true">
                    <div className="tab-skeleton-stack">
                      <div className="skeleton skeleton-line skeleton-line--lg" />
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line skeleton-line--md" />
                      <div className="skeleton skeleton-line skeleton-line--sm" />
                    </div>
                  </div>
                </section>

                <section className="panel-card interview-panel-card">
                  <h3 className="panel-card-title">Hints</h3>
                  <div className="panel-card-body" aria-hidden="true">
                    <div className="tab-skeleton-stack">
                      <div className="skeleton skeleton-line skeleton-line--sm" />
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line skeleton-line--md" />
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="panel-card interview-panel-card interview-panel-card--signal">
                  <h3 className="panel-card-title">Expected Approach</h3>
                  <div className="panel-card-body" aria-hidden="true">
                    <div className="tab-skeleton-stack">
                      <div className="skeleton skeleton-line skeleton-line--lg" />
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line skeleton-line--md" />
                    </div>
                  </div>
                </section>

                <section className="panel-card interview-panel-card interview-panel-card--editor">
                  <h3 className="panel-card-title">Your Solution ({normalizedLanguage})</h3>
                  <div className="panel-card-body interview-solution-shell" aria-hidden="true">
                    <div className="skeleton skeleton-block skeleton-block--xl" />
                    <div className="skeleton skeleton-line skeleton-line--sm" />
                  </div>
                </section>

                <section className="panel-card interview-panel-card interview-panel-card--feedback">
                  <h3 className="panel-card-title">Feedback</h3>
                  <div className="panel-card-body" aria-hidden="true">
                    <div className="tab-skeleton-stack">
                      <div className="skeleton skeleton-line skeleton-line--md" />
                      <div className="skeleton skeleton-block skeleton-block--tall" />
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!interview?.problem) {
    return <div className="tab-empty">Analyze code to see results</div>;
  }

  async function evaluateNow() {
    if (!onEvaluate) {
      return;
    }

    if (!solution.trim()) {
      setValidationMessage("Write a solution before requesting evaluation.");
      return;
    }

    setValidationMessage("");
    await onEvaluate(solution);
  }

  return (
    <div className="interview-workbench-layout">
      <div className="interview-column interview-column--support">
        <section className="panel-card interview-panel-card">
          <h3 className="panel-card-title">Live Timer</h3>
          <div className="panel-card-body">
            <div className="interview-stat-grid">
              <div className="interview-stat-card">
                <span className="kv-label">Remaining</span>
                <strong className="timer-value">{formatDuration(remaining)}</strong>
              </div>
              <div className="interview-stat-card">
                <span className="kv-label">Language</span>
                <strong>{normalizedLanguage}</strong>
              </div>
            </div>
            <p className="muted-text">A 30-minute countdown starts when the interview problem is generated. Your code stays local until you request feedback.</p>
          </div>
        </section>

        <section className="panel-card interview-panel-card interview-panel-card--signal">
          <h3 className="panel-card-title">Interview Problem</h3>
          <div className="panel-card-body">
            <p className="prose-text">{interview.problem}</p>
          </div>
        </section>

        <section className="panel-card interview-panel-card">
          <h3 className="panel-card-title">Hints</h3>
          <div className="panel-card-body">
            <div className="interview-hint-meta">
              <span className="muted-text">Revealed {visibleHints.length} of {hints.length}</span>
            </div>
            {visibleHints.length > 0 ? (
              <ol className="ordered-list">
                {visibleHints.map((hint, index) => (
                  <li key={`${hint}-${index}`}>{hint}</li>
                ))}
              </ol>
            ) : (
              <p className="muted-text">No hints revealed yet.</p>
            )}
            <button
              className="secondary-btn"
              type="button"
              disabled={hintIndex >= hints.length}
              onClick={() => setHintIndex((value) => Math.min(value + 1, hints.length))}
            >
              Reveal Hint
            </button>
          </div>
        </section>

        <section className="panel-card interview-panel-card interview-panel-card--signal">
          <h3 className="panel-card-title">Expected Approach</h3>
          <div className="panel-card-body">
            <p className="prose-text">{interview.expected_approach || "Expected approach will populate when the generator provides one."}</p>
          </div>
        </section>
      </div>

      <div className="interview-column interview-column--main">
        <section className="panel-card interview-panel-card interview-panel-card--editor">
          <h3 className="panel-card-title">Your Solution ({normalizedLanguage})</h3>
          <div className="panel-card-body interview-solution-shell">
            <textarea
              className="interview-editor"
              value={solution}
              onChange={(event) => setSolution(event.target.value)}
              placeholder="Write your solution here..."
              spellCheck={false}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  evaluateNow();
                }
              }}
            />
            <div className="interview-action-row">
              <span className="muted-text">Tip: Press Ctrl/Cmd + Enter to evaluate.</span>
              <button className="primary-btn" type="button" onClick={evaluateNow} disabled={isEvaluating}>
                {isEvaluating ? "Evaluating..." : "Evaluate Solution"}
              </button>
            </div>
            {validationMessage ? <p className="muted-text">{validationMessage}</p> : null}
          </div>
        </section>

        <section className="panel-card interview-panel-card interview-panel-card--feedback">
          <h3 className="panel-card-title">Feedback</h3>
          <div className="panel-card-body">
            {evaluation ? (
              <>
                <div className="kv-grid interview-feedback-grid">
                  <div className="kv-item">
                    <span className="kv-label">Score</span>
                    <code className="kv-value">{evaluation.score}/10</code>
                  </div>
                  <div className="kv-item">
                    <span className="kv-label">Verdict</span>
                    <code className="kv-value">{evaluation.verdict}</code>
                  </div>
                </div>
                <p className="prose-text">{evaluation.feedback}</p>
                {evaluation.optimized_answer ? (
                  <>
                    <h4 className="panel-subtitle">Optimized Answer</h4>
                    <pre className="code-block">{evaluation.optimized_answer}</pre>
                  </>
                ) : null}
              </>
            ) : (
              <div className="interview-eval-placeholder">
                <div className="interview-eval-bar">
                  <span className="interview-eval-bar-fill" />
                </div>
                <p className="muted-text">Submit a solution to get automated feedback, quality scoring, and a stronger answer variant.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
