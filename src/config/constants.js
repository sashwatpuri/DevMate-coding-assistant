export const TAB_ITEMS = [
  { key: "Explanation", label: "Explain", icon: "explain" },
  { key: "Debug", label: "Debug", icon: "debug" },
  { key: "Visualize", label: "Visualize", icon: "visualize" },
  { key: "Optimize", label: "Optimize", icon: "optimize" },
  { key: "Output", label: "Output", icon: "output" },
];

export const FILE_NAMES = {
  python: "main.py",
  cpp: "main.cpp",
  java: "Main.java",
  javascript: "index.js",
  typescript: "index.ts",
  c: "main.c",
  go: "main.go",
  rust: "main.rs"
};

export const LANGUAGE_RUNTIME = {
  python: "Python 3.11",
  cpp: "C++17",
  java: "Java 21",
  javascript: "Node 18",
  typescript: "Node 18",
  c: "C",
  go: "Go 1.16",
  rust: "Rust 1.68"
};

export const LANGUAGE_VERSIONS = {
  python: { language: "python", version: import.meta.env.VITE_PYTHON_VERSION || "3.10.0" },
  javascript: { language: "javascript", version: import.meta.env.VITE_JS_VERSION || "18.15.0" },
  cpp: { language: "c++", version: import.meta.env.VITE_CPP_VERSION || "10.2.0" },
  java: { language: "java", version: import.meta.env.VITE_JAVA_VERSION || "15.0.2" },
  typescript: { language: "typescript", version: import.meta.env.VITE_TS_VERSION || "5.0.3" },
  go: { language: "go", version: import.meta.env.VITE_GO_VERSION || "1.16.2" },
  rust: { language: "rust", version: import.meta.env.VITE_RUST_VERSION || "1.68.2" },
  c: { language: "c", version: import.meta.env.VITE_C_VERSION || "10.2.0" },
};

export const SESSION_TTL_MS = Number(import.meta.env.VITE_SESSION_TTL_HOURS || 24) * 60 * 60 * 1000;
export const INTERVIEW_TIMER_SECONDS = Number(import.meta.env.VITE_INTERVIEW_TIMER_MINUTES || 30) * 60;
