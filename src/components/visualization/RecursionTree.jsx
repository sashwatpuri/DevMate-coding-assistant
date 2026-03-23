import React, { memo, useMemo } from "react";

const toArray = (value) => (Array.isArray(value) ? value : []);

const stringifyValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value);
      return json.length > 46 ? `${json.slice(0, 43)}...` : json;
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const buildCallLabel = (node, fallbackLabel) => {
  if (node.label) return String(node.label);
  if (node.call) return String(node.call);
  const fnName = node.fn ?? node.functionName ?? node.name;
  const args = Array.isArray(node.args) ? node.args.map(stringifyValue).join(", ") : node.args;
  if (fnName && args !== undefined) return `${fnName}(${stringifyValue(args)})`;
  if (fnName) return String(fnName);
  return fallbackLabel;
};

const normalizeNode = (rawNode, fallbackId, fallbackLabel = "call") => {
  const children = toArray(rawNode?.children ?? rawNode?.calls ?? rawNode?.next);
  const id = String(rawNode?.id ?? fallbackId);
  const label = buildCallLabel(rawNode ?? {}, fallbackLabel);

  return {
    id,
    label,
    result: rawNode?.result ?? rawNode?.returnValue ?? rawNode?.output,
    status: rawNode?.status ?? rawNode?.state ?? "",
    children: children.map((child, index) =>
      normalizeNode(child, `${id}.${index}`, `${label} -> ${index + 1}`)
    ),
  };
};

const normalizeTree = (data) => {
  if (!data) return null;
  if (data.root) return normalizeNode(data.root, "root", "root");
  if (Array.isArray(data)) return normalizeNode({ label: "root", children: data }, "root", "root");
  return normalizeNode(data, "root", "root");
};

function TreeNode({ node, depth = 0 }) {
  const resultText = stringifyValue(node.result);

  return (
    <li className="recursion-tree__item">
      <div className="recursion-tree__card">
        <div className="recursion-tree__card-main">
          <span className="recursion-tree__depth">d{depth}</span>
          <span className="recursion-tree__label">{node.label}</span>
        </div>
        {node.status ? <span className="recursion-tree__status">{String(node.status)}</span> : null}
        {resultText ? <div className="recursion-tree__result">returns {resultText}</div> : null}
      </div>
      {node.children.length > 0 ? (
        <ul className="recursion-tree__children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function RecursionTree({
  data,
  loading = false,
  className = "",
  emptyMessage = "No recursion tree available.",
}) {
  const rootNode = useMemo(() => normalizeTree(data), [data]);
  const rootClassName = ["recursion-tree", className, loading ? "recursion-tree--loading" : ""]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={rootClassName}>
        <div className="recursion-tree__state visualization-placeholder">Loading recursion tree...</div>
      </div>
    );
  }

  if (!rootNode) {
    return (
      <div className={rootClassName}>
        <div className="recursion-tree__state visualization-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <ul className="recursion-tree__root">
        <TreeNode node={rootNode} depth={0} />
      </ul>
    </div>
  );
}

export default memo(RecursionTree);
