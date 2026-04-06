import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

const DEFAULT_LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
];

const DEFAULT_EDITOR_OPTIONS = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  tabSize: 2,
  wordWrap: "on",
  fontSize: 14,
  fontFamily: "JetBrains Mono, Consolas, monospace",
  lineHeight: 22,
  padding: { top: 20, bottom: 20 },
};

const BUG_MARKER_OWNER = "code-editor-panel-bug-lines";
const BUG_LINE_CLASS_NAME = "code-editor-panel__bug-line";
const BUG_GUTTER_CLASS_NAME = "code-editor-panel__bug-gutter";
const DECORATION_STYLE_ID = "code-editor-panel-decoration-styles";
const FILE_LANGUAGE_MAP = Object.freeze({
  ".py": "python",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".java": "java",
  ".js": "javascript",
  ".ts": "typescript",
  ".go": "go",
  ".rs": "rust",
  ".c": "c",
});

function normalizeBugLines(bugLineNumbers) {
  const asArray = Array.isArray(bugLineNumbers)
    ? bugLineNumbers
    : bugLineNumbers == null
      ? []
      : [bugLineNumbers];

  return [...new Set(
    asArray
      .map((line) => Number(line))
      .filter((line) => Number.isInteger(line) && line > 0),
  )].sort((a, b) => a - b);
}

function ensureDecorationStyles() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(DECORATION_STYLE_ID)) {
    return;
  }

  const styleElement = document.createElement("style");
  styleElement.id = DECORATION_STYLE_ID;
  styleElement.textContent = `
    .${BUG_LINE_CLASS_NAME} {
      background: linear-gradient(90deg, rgba(255, 77, 79, 0.22), rgba(255, 77, 79, 0.04));
    }

    .${BUG_GUTTER_CLASS_NAME} {
      border-left: 3px solid rgba(255, 77, 79, 0.95);
      margin-left: 2px;
    }
  `;

  document.head.appendChild(styleElement);
}

function detectLanguageFromFileName(fileName = "") {
  const normalizedName = String(fileName).toLowerCase();
  const extension = Object.keys(FILE_LANGUAGE_MAP).find((item) => normalizedName.endsWith(item));
  return extension ? FILE_LANGUAGE_MAP[extension] : null;
}

export default function CodeEditorPanel({
  code = "",
  language = "javascript",
  onCodeChange,
  onLanguageChange,
  bugLineNumbers = [],
  onAnalyze,
  onClear,
  onLoadSample,
  onRunCode,
  isRunningCode = false,
  statusMessage = "Ready",
  fileName = "main.js",
  runtimeLabel = "UTF-8",
  isAnalyzing = false,
  languageOptions = DEFAULT_LANGUAGES,
  height = "420px",
  theme = "vs-dark",
  editorOptions = {},
  className,
  analyzeLabel = "Analyze",
  analyzingLabel = "Analyzing...",
}) {
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationIdsRef = useRef([]);
  const fileInputRef = useRef(null);
  const hasAnalyzeAction = typeof onAnalyze === "function";
  const hasClearAction = typeof onClear === "function";
  const hasSampleAction = typeof onLoadSample === "function";
  const normalizedBugLines = useMemo(
    () => normalizeBugLines(bugLineNumbers),
    [bugLineNumbers],
  );

  const mergedEditorOptions = useMemo(
    () => ({ ...DEFAULT_EDITOR_OPTIONS, ...editorOptions }),
    [editorOptions],
  );

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  useEffect(() => {
    ensureDecorationStyles();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (overflowRef.current && !overflowRef.current.contains(event.target)) {
        setIsOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applyBugHighlights() {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) {
      return;
    }

    const model = editor.getModel();

    if (!model) {
      return;
    }

    const maxLine = model.getLineCount();
    const safeBugLines = normalizedBugLines.filter((line) => line <= maxLine);
    const decorationPayload = safeBugLines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: BUG_LINE_CLASS_NAME,
        linesDecorationsClassName: BUG_GUTTER_CLASS_NAME,
        minimap: {
          color: "rgba(255, 77, 79, 0.9)",
          position: monaco.editor.MinimapPosition.Inline,
        },
        overviewRuler: {
          color: "rgba(255, 77, 79, 0.9)",
          position: monaco.editor.OverviewRulerLane.Right,
        },
      },
    }));

    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      decorationPayload,
    );

    const markers = safeBugLines.map((line) => ({
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: model.getLineMaxColumn(line),
      message: "Potential bug identified on this line",
      severity: monaco.MarkerSeverity.Warning,
      source: "Analyzer",
    }));

    monaco.editor.setModelMarkers(model, BUG_MARKER_OWNER, markers);
  }

  useEffect(() => {
    applyBugHighlights();
  }, [normalizedBugLines, selectedLanguage, code]);

  useEffect(() => () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel?.();

    if (editor) {
      editor.deltaDecorations(decorationIdsRef.current, []);
      decorationIdsRef.current = [];
    }

    if (monaco && model) {
      monaco.editor.setModelMarkers(model, BUG_MARKER_OWNER, []);
    }
  }, []);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyBugHighlights();
  }

  function handleLanguageSelect(event) {
    const nextLanguage = event.target.value;
    setSelectedLanguage(nextLanguage);
    onLanguageChange?.(nextLanguage);
  }

  function handleEditorChange(value) {
    onCodeChange?.(value ?? "");
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelection(event) {
    const [file] = Array.from(event.target.files || []);
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextCode = typeof reader.result === "string" ? reader.result : "";
      const detectedLanguage = detectLanguageFromFileName(file.name);
      onCodeChange?.(nextCode);

      if (detectedLanguage) {
        setSelectedLanguage(detectedLanguage);
        onLanguageChange?.(detectedLanguage, {
          preserveCode: true,
          fileName: file.name,
        });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const rootClassName = ["editor-panel", className].filter(Boolean).join(" ");

  return (
    <section className={rootClassName}>
      <div className="editor-topbar">
        <div className="editor-file-meta">
          <div className="editor-file-pill">
            <span className="status-dot status-dot--soft" />
            <span>{fileName}</span>
          </div>

          <label className="editor-language-field">
            <span className="editor-language-label">Language</span>
            <select
              className="editor-language-select"
              value={selectedLanguage}
              onChange={handleLanguageSelect}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="editor-encoding-badge">{runtimeLabel}</div>
        </div>
      </div>

      <div className="editor-status-bar" style={{ padding: "0.4rem 1rem", borderBottom: "1px solid var(--ghost-border)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", background: "var(--surface)", color: "var(--text-muted)" }}>
        {isAnalyzing && (
          <span className="thinking-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
        <span className="status-message">{statusMessage}</span>
      </div>

      <div className="editor-canvas" role="region" aria-label="Code editor" style={{ paddingTop: "1rem" }}>
        <Editor
          height={height}
          language={selectedLanguage}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={theme}
          options={mergedEditorOptions}
        />
      </div>

      <div className="editor-actionbar">
        <div className="editor-toolbar-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.cpp,.java,.js,.ts,.go,.rs,.c"
            className="editor-file-input"
            onChange={handleFileSelection}
            hidden
          />
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing || !hasAnalyzeAction}
            className={`editor-analyze-btn ${isAnalyzing ? "analyzing" : ""}`}
          >
            {isAnalyzing ? "Running AI..." : "Run AI"}
          </button>
          <button 
            type="button" 
            className={`secondary-btn ${isRunningCode ? "is-busy" : ""}`} 
            onClick={onRunCode}
            disabled={isRunningCode}
          >
            {isRunningCode ? "Running..." : "Run Code"}
          </button>
        </div>

        <div className="editor-toolbar-actions" ref={overflowRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setIsOverflowOpen(!isOverflowOpen)}
            style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="More options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          {isOverflowOpen && (
            <div style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: "0.5rem", background: "var(--bg-deep)", border: "1px solid var(--ghost-border)", borderRadius: "var(--radius-xl)", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "160px", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => { handleUploadClick(); setIsOverflowOpen(false); }}
                disabled={isAnalyzing}
                style={{ width: "100%", textAlign: "left", justifyContent: "flex-start", border: "none", borderRadius: "var(--radius-md)" }}
              >
                Upload File
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => { onClear(); setIsOverflowOpen(false); }}
                disabled={isAnalyzing || !hasClearAction}
                style={{ width: "100%", textAlign: "left", justifyContent: "flex-start", border: "none", borderRadius: "var(--radius-md)" }}
              >
                Clear
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => { onLoadSample(); setIsOverflowOpen(false); }}
                disabled={isAnalyzing || !hasSampleAction}
                style={{ width: "100%", textAlign: "left", justifyContent: "flex-start", border: "none", borderRadius: "var(--radius-md)" }}
              >
                Sample Code
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
