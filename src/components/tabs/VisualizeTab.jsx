import React from "react";
import FlowGraph from "../visualization/FlowGraph";
import RecursionTree from "../visualization/RecursionTree";
import VariableTimeline from "../visualization/VariableTimeline";
import BugSimulation from "../visualization/BugSimulation";

export default function VisualizeTab({ result, code, isLoading }) {
  const flowNodes = Array.isArray(result?.flow) ? result.flow : [];
  const flowEdges = Array.isArray(result?.edges) ? result.edges : [];
  const variableSteps = Array.isArray(result?.variables) ? result.variables : [];
  const bugLine = result?.bug?.line || null;

  if (isLoading) {
    return (
      <div className="tab-content-stack visualize-layout">
        <section className="panel-card visualize-summary-card">
          <h3 className="panel-card-title">Reasoning Snapshot</h3>
          <div className="panel-card-body">
            <div className="kv-grid" aria-hidden="true">
              <div className="kv-item">
                <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                <span className="skeleton skeleton-line skeleton-line--md" />
              </div>
              <div className="kv-item">
                <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                <span className="skeleton skeleton-line skeleton-line--md" />
              </div>
              <div className="kv-item">
                <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                <span className="skeleton skeleton-line skeleton-line--md" />
              </div>
              <div className="kv-item">
                <span className="kv-label"><span className="skeleton skeleton-line skeleton-line--sm" /></span>
                <span className="skeleton skeleton-line skeleton-line--md" />
              </div>
            </div>
          </div>
        </section>

        {["Execution Flow Graph", "Recursion Tree", "Variable State Timeline", "Bug Simulation"].map((title, index) => (
          <section className="visualize-card panel-card" key={title}>
            <h3 className="visualize-card-title panel-card-title">{title}</h3>
            <div className="visualize-card-body panel-card-body" aria-hidden="true">
              {index === 0 ? (
                <div className="visualize-skeleton-grid">
                  <div className="skeleton skeleton-block skeleton-block--sm" />
                  <div className="skeleton skeleton-block skeleton-block--sm" />
                  <div className="skeleton skeleton-block skeleton-block--sm" />
                </div>
              ) : index === 1 ? (
                <div className="visualize-skeleton-tree">
                  <div className="skeleton skeleton-line skeleton-line--lg" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--md" />
                </div>
              ) : index === 2 ? (
                <div className="visualize-skeleton-table">
                  <div className="skeleton skeleton-line skeleton-line--lg" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line--md" />
                </div>
              ) : (
                <div className="visualize-skeleton-bug">
                  <div className="skeleton skeleton-line skeleton-line--md" />
                  <div className="skeleton skeleton-block skeleton-block--tall" />
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

  return (
    <div className="tab-content-stack visualize-layout">
      <section className="panel-card visualize-summary-card">
        <h3 className="panel-card-title">Reasoning Snapshot</h3>
        <div className="panel-card-body">
          {isLoading ? (
            <div className="interview-eval-placeholder">
              <div className="interview-eval-bar">
                <span className="interview-eval-bar-fill" />
              </div>
            </div>
          ) : (
            <div className="kv-grid">
              <div className="kv-item">
                <span className="kv-label">Flow Nodes</span>
                <code className="kv-value">{flowNodes.length}</code>
              </div>
              <div className="kv-item">
                <span className="kv-label">Flow Edges</span>
                <code className="kv-value">{flowEdges.length}</code>
              </div>
              <div className="kv-item">
                <span className="kv-label">State Steps</span>
                <code className="kv-value">{variableSteps.length}</code>
              </div>
              <div className="kv-item">
                <span className="kv-label">Failing Line</span>
                <code className="kv-value">{bugLine || "None"}</code>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="visualize-card panel-card">
        <h3 className="visualize-card-title panel-card-title">Execution Flow Graph</h3>
        <div className="visualize-card-body panel-card-body" style={{ minHeight: "450px" }}>
          <FlowGraph data={{ nodes: flowNodes, edges: flowEdges }} isLoading={isLoading} />
        </div>
      </section>

      <section className="visualize-card panel-card">
        <h3 className="visualize-card-title panel-card-title">Recursion Tree</h3>
        <div className="visualize-card-body panel-card-body">
          <RecursionTree data={result.recursion_tree} isLoading={isLoading} />
        </div>
      </section>

      <section className="visualize-card panel-card">
        <h3 className="visualize-card-title panel-card-title">Variable State Timeline</h3>
        <div className="visualize-card-body panel-card-body">
          <VariableTimeline variables={variableSteps} isLoading={isLoading} />
        </div>
      </section>

      <section className="visualize-card panel-card">
        <h3 className="visualize-card-title panel-card-title">Bug Simulation</h3>
        <div className="visualize-card-body panel-card-body">
          <BugSimulation bug={result.bug} code={code} isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}
