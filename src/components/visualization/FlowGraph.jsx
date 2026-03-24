import React, { memo, useMemo } from "react";

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 75;
const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 60;
const CANVAS_PADDING = 32;

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    try {
      const serialized = JSON.stringify(value);
      return serialized.length > 42 ? `${serialized.slice(0, 39)}...` : serialized;
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const getNodeLabel = (node) =>
  node.label ??
  node.title ??
  node.name ??
  node.id ??
  "Node";

const getNodeSubtitle = (node) => {
  if (node.subtitle) return String(node.subtitle);
  if (node.type) return String(node.type);
  if (node.value !== undefined) return formatValue(node.value);
  return "";
};

const buildLevels = (nodes, edges) => {
  const adjacency = new Map();
  const indegree = new Map();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    indegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) return;
    adjacency.get(edge.source).push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  });

  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((n) => n.id);
  const levelMap = new Map(queue.map((id) => [id, 0]));
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor];
    const baseLevel = levelMap.get(current) ?? 0;
    const children = adjacency.get(current) ?? [];

    children.forEach((childId) => {
      const nextLevel = Math.max(levelMap.get(childId) ?? 0, baseLevel + 1);
      levelMap.set(childId, nextLevel);
      indegree.set(childId, (indegree.get(childId) ?? 1) - 1);
      if ((indegree.get(childId) ?? 0) <= 0) {
        queue.push(childId);
      }
    });

    cursor += 1;
  }

  nodes.forEach((node) => {
    if (!levelMap.has(node.id)) {
      levelMap.set(node.id, 0);
    }
  });

  return levelMap;
};

const layoutNodes = (rawNodes, rawEdges) => {
  const nodes = rawNodes.map((node, index) => ({
    ...node,
    id: String(node.id ?? `node-${index}`),
    width: isFiniteNumber(node.width) ? Number(node.width) : DEFAULT_NODE_WIDTH,
    height: isFiniteNumber(node.height) ? Number(node.height) : DEFAULT_NODE_HEIGHT,
  }));

  const edges = rawEdges.map((edge, index) => ({
    ...edge,
    id: edge.id ?? `edge-${index}`,
    source: String(edge.source ?? edge.from ?? ""),
    target: String(edge.target ?? edge.to ?? ""),
  }));

  const hasCustomCoordinates = nodes.some((node) => isFiniteNumber(node.x) && isFiniteNumber(node.y));
  if (hasCustomCoordinates) {
    return nodes.map((node, index) => ({
      ...node,
      x: isFiniteNumber(node.x) ? Number(node.x) : CANVAS_PADDING + index * 24,
      y: isFiniteNumber(node.y) ? Number(node.y) : CANVAS_PADDING + index * 20,
    }));
  }

  const levelMap = buildLevels(nodes, edges);
  const grouped = new Map();
  nodes.forEach((node) => {
    const level = levelMap.get(node.id) ?? 0;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level).push(node);
  });

  const sortedLevels = [...grouped.keys()].sort((a, b) => a - b);
  return sortedLevels.flatMap((level) => {
    const row = grouped.get(level) ?? [];
    return row.map((node, rowIndex) => ({
      ...node,
      x: CANVAS_PADDING + level * (DEFAULT_NODE_WIDTH + HORIZONTAL_GAP),
      y: CANVAS_PADDING + rowIndex * (DEFAULT_NODE_HEIGHT + VERTICAL_GAP),
    }));
  });
};

const getCanvasBounds = (nodes) => {
  if (nodes.length === 0) {
    return { width: 640, height: 220 };
  }
  const rightMost = Math.max(...nodes.map((node) => node.x + node.width));
  const bottomMost = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    width: rightMost + CANVAS_PADDING,
    height: bottomMost + CANVAS_PADDING,
  };
};

const getEdgePoints = (sourceNode, targetNode) => {
  const sourceOnRight = sourceNode.x <= targetNode.x;
  const start = {
    x: sourceOnRight ? sourceNode.x + sourceNode.width : sourceNode.x,
    y: sourceNode.y + sourceNode.height / 2,
  };
  const end = {
    x: sourceOnRight ? targetNode.x : targetNode.x + targetNode.width,
    y: targetNode.y + targetNode.height / 2,
  };
  const curvature = Math.max(Math.abs(end.x - start.x) * 0.4, 30);
  const d = [
    `M ${start.x} ${start.y}`,
    `C ${start.x + (sourceOnRight ? curvature : -curvature)} ${start.y},`,
    `${end.x + (sourceOnRight ? -curvature : curvature)} ${end.y},`,
    `${end.x} ${end.y}`,
  ].join(" ");

  return { start, end, d };
};

function FlowGraph({
  data,
  loading = false,
  className = "",
  emptyMessage = "No flow graph available.",
}) {
  const rawNodes = Array.isArray(data?.nodes)
    ? data.nodes
    : Array.isArray(data?.vertices)
      ? data.vertices
      : Array.isArray(data)
        ? data
        : [];

  const rawEdges = Array.isArray(data?.edges)
    ? data.edges
    : Array.isArray(data?.links)
      ? data.links
      : Array.isArray(data?.connections)
        ? data.connections
        : [];

  const { nodes, edges, nodeById, canvas } = useMemo(() => {
    const normalizedNodes = layoutNodes(rawNodes, rawEdges);
    const normalizedEdges = rawEdges
      .map((edge, index) => ({
        ...edge,
        id: edge.id ?? `edge-${index}`,
        source: String(edge.source ?? edge.from ?? ""),
        target: String(edge.target ?? edge.to ?? ""),
      }))
      .filter((edge) => edge.source && edge.target);

    const map = new Map(normalizedNodes.map((node) => [node.id, node]));
    return {
      nodes: normalizedNodes,
      edges: normalizedEdges,
      nodeById: map,
      canvas: getCanvasBounds(normalizedNodes),
    };
  }, [rawEdges, rawNodes]);

  const rootClassName = ["flow-graph-glass", className, loading ? "flow-graph--loading" : ""]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={rootClassName}>
        <div className="visualization-placeholder-glass">Loading flow graph...</div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className={rootClassName}>
        <div className="visualization-empty-glass">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <svg
        className="flow-graph__canvas-neon"
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label="Flow graph visualization"
      >
        <defs>
          <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="neon-gradient-nodes" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c3f5ff" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
          <marker
            id="flow-graph-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" className="flow-graph__arrow-neon" />
          </marker>
        </defs>

        {edges.map((edge) => {
          const sourceNode = nodeById.get(edge.source);
          const targetNode = nodeById.get(edge.target);
          if (!sourceNode || !targetNode) return null;
          const { d, start, end } = getEdgePoints(sourceNode, targetNode);

          return (
            <g className="flow-graph__edge-group" key={edge.id}>
              <path
                d={d}
                className="flow-graph__edge-glow"
                strokeWidth="3"
                stroke="rgba(0, 229, 255, 0.2)"
                fill="none"
                filter="url(#glow-filter)"
              />
              <path d={d} className="flow-graph__edge-neon" strokeWidth="1.6" />
              <polygon
                className="flow-graph__arrow-neon"
                points={`${end.x},${end.y} ${end.x - 8},${end.y - 5} ${end.x - 8},${end.y + 5}`}
              />
            </g>
          );
        })}

        {nodes.map((node) => {
          const label = getNodeLabel(node);
          const subtitle = getNodeSubtitle(node);
          return (
            <g key={node.id}>
              <rect
                className="flow-graph__node-glow"
                x={node.x - 2}
                y={node.y - 2}
                width={node.width + 4}
                height={node.height + 4}
                rx="6"
              />
              <rect
                className="flow-graph__node-box-neon"
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx="4"
              />
              <text
                className="flow-graph__node-label-neon"
                x={node.x + node.width / 2}
                y={node.y + (node.height - 6) / 2}
                textAnchor="middle"
              >
                {String(label)}
              </text>
              {subtitle ? (
                <text
                  className="flow-graph__node-subtitle-neon"
                  x={node.x + node.width / 2}
                  y={node.y + (node.height + 12) / 2}
                  textAnchor="middle"
                >
                  {subtitle}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default memo(FlowGraph);
