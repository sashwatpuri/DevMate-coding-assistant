import React from "react";

function collectColumns(rows) {
  const keys = new Set();
  rows.forEach((row) => {
    Object.keys(row.values || {}).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

function formatValue(value) {
  if (value === undefined) return "-";
  if (value === null) return "null";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export default function VariableTimeline({ variables, isLoading }) {
  const rows = Array.isArray(variables) ? variables : [];

  if (isLoading) {
    return <div className="visualization-placeholder">Computing variable timeline...</div>;
  }

  if (!rows.length) {
    return <div className="visualization-empty">No variable state timeline available.</div>;
  }

  const columns = collectColumns(rows);

  return (
    <div className="timeline-wrap">
      <table className="timeline-table">
        <thead>
          <tr>
            <th>Step</th>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`step-${row.step}`}>
              <td>{row.step}</td>
              {columns.map((column) => (
                <td key={`${row.step}-${column}`}>
                  <code>{formatValue(row?.values?.[column])}</code>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

