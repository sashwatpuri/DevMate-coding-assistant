import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeEditorPanel from "./components/editor/CodeEditorPanel";
import ExplanationTab from "./components/tabs/ExplanationTab";
import DebugTab from "./components/tabs/DebugTab";
import VisualizeTab from "./components/tabs/VisualizeTab";
import OptimizeTab from "./components/tabs/OptimizeTab";
import InterviewTab from "./components/tabs/InterviewTab";
import VoiceConsole from "./components/voice/VoiceConsole";
import SettingsPanel from "./components/settings/SettingsPanel";
import ModelDownloadProgress from "./components/ui/ModelDownloadProgress";
import ErrorBoundary from "./components/ErrorBoundary";
import { DEFAULT_SNIPPETS, LANGUAGE_OPTIONS } from "./constants/defaultCode";
import { analyzeCode, evaluateInterview, generateInterviewProblem, getRuntimeInfo, initRuntime, ensureLanguageModelLoaded } from "./ai/runAnywhereRuntime";
import { useAuth } from "./components/auth/AuthGate";
import { appendHistory, clearHistory, loadSession, readHistory, saveSession } from "./storage/indexedDb";
import { useSettings } from "./hooks/useSettings";
import { useTheme } from "./hooks/useTheme";
import { executeCode } from "./api/piston";
import { TAB_ITEMS, FILE_NAMES, LANGUAGE_RUNTIME } from "./config/constants";

function ShellIcon({ name }) {
  const commonProps = {
    className: "shell-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (name) {
    case "explain":
      return <svg {...commonProps}><path d="M7 5.5h10" /><path d="M7 10.5h10" /><path d="M7 15.5h6" /><path d="M5 4.5v15h14" /></svg>;
    case "debug":
      return <svg {...commonProps}><path d="M9.5 3.5h5" /><path d="M8 8.5h8" /><path d="M9 8.5v-2l1-1h4l1 1v2" /><path d="M8 12.5c0-2.2 1.8-4 4-4s4 1.8 4 4v3a4 4 0 0 1-8 0z" /><path d="M4.5 9.5 7 11" /><path d="M19.5 9.5 17 11" /><path d="M10 13.5h.01" /><path d="M14 13.5h.01" /></svg>;
    case "visualize":
      return <svg {...commonProps}><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="6.5" r="2.5" /><circle cx="12" cy="17.5" r="2.5" /><path d="M8.7 8.2 10.6 15" /><path d="M15.3 8.2 13.4 15" /><path d="M9 6.5h6" /></svg>;
    case "optimize":
      return <svg {...commonProps}><path d="M13 3 5 14h6l-1 7 9-12h-6z" /></svg>;
    case "interview":
    case "output":
      return <svg {...commonProps}><path d="M4 17l6-6-6-6M12 19h8" /></svg>;
    case "runtime":
      return <svg {...commonProps}><rect x="4" y="5" width="16" height="12" rx="2.5" /><path d="M8 19h8" /><path d="M9 9.5h6" /><path d="M9 12.5h4" /></svg>;
    case "privacy":
      return <svg {...commonProps}><path d="M12 3.5 5 6.5v4.5c0 4.1 2.8 7.8 7 9.5 4.2-1.7 7-5.4 7-9.5V6.5z" /><path d="m9.5 12 1.8 1.8 3.2-3.6" /></svg>;
    case "cpu":
      return <svg {...commonProps}><rect x="8" y="8" width="8" height="8" rx="1.5" /><path d="M9 1.5v3" /><path d="M15 1.5v3" /><path d="M9 19.5v3" /><path d="M15 19.5v3" /><path d="M1.5 9h3" /><path d="M1.5 15h3" /><path d="M19.5 9h3" /><path d="M19.5 15h3" /></svg>;
    case "theme-light":
      return <svg {...commonProps}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2" /><path d="M12 19.3v2.2" /><path d="m4.9 4.9 1.6 1.6" /><path d="m17.5 17.5 1.6 1.6" /><path d="M2.5 12h2.2" /><path d="M19.3 12h2.2" /><path d="m4.9 19.1 1.6-1.6" /><path d="m17.5 6.5 1.6-1.6" /></svg>;
    case "theme-dark":
      return <svg {...commonProps}><path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" /></svg>;
    case "settings":
      return <svg {...commonProps}><circle cx="12" cy="12" r="2.5" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.7a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.7a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.7a1 1 0 0 1 1 1v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.7z" /></svg>;
    case "menu":
      return <svg {...commonProps}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>;
    default:
      return <svg {...commonProps}><circle cx="12" cy="12" r="7" /></svg>;
  }
}

function renderTab({ activeTab, result, code, onCodeChange, language, isAnalyzing, interviewEvaluation, isEvaluatingInterview, onEvaluateInterview, theme, codeOutput, isGeneratingInterview, executionStatus }) {
  if (activeTab === "Explanation") {
    return <ExplanationTab result={result} isLoading={isAnalyzing} />;
  }
  if (activeTab === "Debug") {
    return <DebugTab result={result} originalCode={code} language={language} isLoading={isAnalyzing} theme={theme} />;
  }
  if (activeTab === "Visualize") {
    return <VisualizeTab result={result} code={code} isLoading={isAnalyzing} />;
  }
  if (activeTab === "Optimize") {
    return <OptimizeTab result={result} originalCode={code} language={language} isLoading={isAnalyzing} theme={theme} />;
  }
  if (activeTab === "Output") {
    return (
      <div className="tab-content-stack" style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <section className="panel-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="panel-card-title" style={{ margin: 0, paddingBottom: 0, borderBottom: 'none' }}>Execution Console</h3>
            {executionStatus === "live" && <span style={{ fontSize: '0.75rem', color: '#10b981', padding: '0.15rem 0.5rem', border: '1px solid #10b981', borderRadius: '1rem' }}>Live Environment</span>}
            {executionStatus === "fallback" && <span style={{ fontSize: '0.75rem', color: '#3b82f6', padding: '0.15rem 0.5rem', border: '1px solid #3b82f6', borderRadius: '1rem' }}>Fallback Environment</span>}
            {executionStatus === "error" && <span style={{ fontSize: '0.75rem', color: '#ef4444', padding: '0.15rem 0.5rem', border: '1px solid #ef4444', borderRadius: '1rem' }}>Graceful Fallback</span>}
            {executionStatus === "running" && <span style={{ fontSize: '0.75rem', color: '#f59e0b', padding: '0.15rem 0.5rem', border: '1px solid #f59e0b', borderRadius: '1rem' }}>Executing...</span>}
          </div>
          <div className="panel-card-body" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
             <pre className="prose-text code-block-neon" style={{ flexGrow: 1, minHeight: "350px", margin: 0, width: "100%", whiteSpace: "pre-wrap" }}>
              {codeOutput || "Run code to view output."}
            </pre>
          </div>
        </section>
      </div>
    );
  }
  return <InterviewTab interview={result?.interview} language={language} onEvaluate={onEvaluateInterview} evaluation={interviewEvaluation} isEvaluating={isEvaluatingInterview} isLoading={isAnalyzing} code={code} onCodeChange={onCodeChange} prefillCode={code} isGeneratingProblem={isGeneratingInterview} />;
}

function getFileName(language) {
  return FILE_NAMES[language] || `main.${language || "txt"}`;
}

function getProblemHeadline(problem) {
  const firstLine = String(problem || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (!firstLine) {
    return "Interview prompt pending";
  }
  return firstLine.length > 78 ? `${firstLine.slice(0, 75)}...` : firstLine;
}

function formatHistoryTime(value) {
  if (!value) {
    return "Pending";
  }
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "Recent";
  }
}

export default function App() {
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_SNIPPETS.python);
  const [activeTab, setActiveTab] = useState("Visualize");
  const [lastAnalysisTab, setLastAnalysisTab] = useState("Visualize");
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Starting runtime...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [runtimeInfo, setRuntimeInfo] = useState(getRuntimeInfo());
  const [history, setHistory] = useState([]);
  const [interviewEvaluation, setInterviewEvaluation] = useState(null);
  const [isEvaluatingInterview, setIsEvaluatingInterview] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ active: false, value: 0, name: "" });
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [codeOutput, setCodeOutput] = useState("");
  const [isVoiceConsoleVisible, setIsVoiceConsoleVisible] = useState(false);
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);
  const [executionStatus, setExecutionStatus] = useState("disconnected");
  const bootstrapRan = useRef(false);
  const lastInterviewCode = useRef("");

  const handleRuntimeProgress = useCallback((progress) => {
    if (progress?.message) {
      setStatusMessage(progress.message);
    }

    const nextProgress = Math.max(0, Math.min(1, Number(progress?.progress) || 0));
    if (Number.isFinite(Number(progress?.progress))) {
      setModelLoadProgress(Math.round(nextProgress * 100));
    }

    const info = getRuntimeInfo();
    setRuntimeInfo(info);

    if (String(progress?.stage || "").startsWith("runtime:download")) {
      setDownloadProgress({
        active: true,
        value: nextProgress,
        name: info?.runAnywhereSelectedModel?.name || info?.selectedModel?.name || "RunAnywhere Model",
      });
      return;
    }

    if (["runtime:model-ready", "runtime:ready", "analysis:done", "analysis:local-fallback"].includes(progress?.stage)) {
      setModelLoadProgress(100);
      setDownloadProgress((current) => ({ ...current, active: false, value: progress?.stage === "runtime:model-ready" ? 1 : current.value }));
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (settings.theme !== theme) {
      updateSettings({ theme });
    }
  }, [settings.theme, theme, updateSettings]);

  useEffect(() => {
    setRuntimeInfo(getRuntimeInfo());
    
    // Trigger model reload on selection change if we've bootstrapped
    if (bootstrapRan.current) {
      ensureLanguageModelLoaded(handleRuntimeProgress)
        .then((info) => setRuntimeInfo(info))
        .catch((e) => console.error("[DevMate] Model reload failed:", e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ollamaBaseUrl, settings.ollamaModel, settings.runAnywhereModelId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (bootstrapRan.current) return;
      bootstrapRan.current = true;
      try {
        const [session, savedHistory] = await Promise.all([loadSession(), readHistory(8)]);
        if (!cancelled && session) {
          const nextLanguage = session.language || "python";
          const nextTab = session.activeTab || "Visualize";
          setLanguage(nextLanguage);
          setCode(session.code || DEFAULT_SNIPPETS[nextLanguage] || DEFAULT_SNIPPETS.python);
          setActiveTab(nextTab);
          setLastAnalysisTab(nextTab === "Interview Mode" ? "Visualize" : nextTab);
          setResult(session.result || null);
        }
        if (!cancelled) {
          setHistory(savedHistory);
        }
      } catch {
        if (!cancelled) {
          setStatusMessage("IndexedDB unavailable. Session persistence disabled.");
        }
      }

      try {
        const info = await initRuntime(handleRuntimeProgress);
        if (!cancelled) {
          setRuntimeInfo(info);
          setStatusMessage(`Ready on ${info.backend.toUpperCase()} with ${info.selectedModel.name}`);
        }
      } catch {
        if (!cancelled) {
          setStatusMessage("Runtime initialization failed.");
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [handleRuntimeProgress]);

  useEffect(() => {
    if (activeTab !== "Interview Mode") {
      setLastAnalysisTab(activeTab);
    }
  }, [activeTab]);

  const languageOptionMap = useMemo(() => LANGUAGE_OPTIONS, []);
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  const activeModelLabel = runtimeInfo?.selectedModel?.name || "Local Model";
  const activeModelQuant = runtimeInfo?.selectedModel?.quantization || "Q4";
  const backendLabel = runtimeInfo?.backend ? runtimeInfo.backend.toUpperCase() : "LOCAL";
  const runtimeHealth = runtimeInfo?.modelReady ? "Model Ready" : runtimeInfo?.initialized ? "Runtime Ready" : "Warming Up";
  const isInterviewMode = activeTab === "Interview Mode";
  const activeTabMeta = TAB_ITEMS.find((item) => item.key === activeTab) || TAB_ITEMS[0];
  const fileName = getFileName(language);
  const languageRuntime = LANGUAGE_RUNTIME[language] || language.toUpperCase();
  const analysisCountLabel = `${history.length} Session${history.length === 1 ? "" : "s"}`;
  const voiceStateLabel = runtimeInfo?.voice?.ready ? "Voice Ready" : runtimeInfo?.voice?.backend === "unavailable" ? "Voice Offline" : "Voice Idle";
  const complexityNow = result?.comparison?.current || result?.complexity?.time || "Pending";
  const optimizedComplexity = result?.comparison?.optimized || result?.complexity?.space || "Pending";
  const interviewHints = Array.isArray(result?.interview?.hints) ? result.interview.hints : [];
  const interviewHeadline = getProblemHeadline(result?.interview?.problem);
  const visibleHistory = history.slice(0, 4);
  const activeContent = renderTab({ activeTab, result, code, onCodeChange: setCode, language, isAnalyzing, interviewEvaluation, isEvaluatingInterview, onEvaluateInterview: handleEvaluateInterview, theme: monacoTheme, codeOutput, isGeneratingInterview, executionStatus });
  const runtimeModels = Array.isArray(runtimeInfo?.availableModels) ? runtimeInfo.availableModels.map((model) => ({
    id: model.id,
    name: model.label || model.name,
    description: `${model.quantization || "Q4"} • ~${Math.round((model.memoryRequirement || 0) / 1_000_000)}MB browser profile`,
    isActive: runtimeInfo?.runAnywhereSelectedModel?.id === model.id,
  })) : [];
  const modelReadinessPercent = Math.max(0, Math.min(100, runtimeInfo?.modelReady ? 100 : downloadProgress.active ? Math.round(downloadProgress.value * 100) : Math.round(Number(modelLoadProgress) || 0)));

  function handleLanguageChange(nextLanguage, options = {}) {
    const currentTemplate = DEFAULT_SNIPPETS[language] || "";
    const nextTemplate = DEFAULT_SNIPPETS[nextLanguage] || "";
    setLanguage(nextLanguage);
    setInterviewEvaluation(null);
    setCode((previous) => (options.preserveCode ? previous : (!previous.trim() || previous === currentTemplate ? nextTemplate : previous)));
  }

  async function handleRunCode() {
    setIsRunningCode(true);
    setExecutionStatus("running");
    setLastAnalysisTab(Date.now());
    setTimeout(() => setActiveTab("Output"), 10);
    setCodeOutput(`Executing ${fileName} locally...\n\n`);
    
    try {
      const { output, usedFallback } = await executeCode(code, language);
      setCodeOutput(prev => prev + output);
      setExecutionStatus(usedFallback ? "fallback" : "live");
      setLastAnalysisTab(Date.now() + 1);
    } catch (e) {
      setCodeOutput(prev => prev + e.message);
      setExecutionStatus("error");
    } finally {
      setIsRunningCode(false);
    }
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setModelLoadProgress(0);
    setInterviewEvaluation(null);
    try {
      const analysis = await analyzeCode({ code, language, mode: "full", onProgress: handleRuntimeProgress });
      setResult(analysis);
      await saveSession({ language, code, result: analysis, activeTab, updatedAt: Date.now() });
      await appendHistory({ language, codePreview: code.slice(0, 120), bugLine: analysis?.bug?.line || 0, complexity: analysis?.comparison?.current || analysis?.complexity?.time || "Unknown", createdAt: Date.now() });
      setHistory(await readHistory(8));
      setStatusMessage("Analysis complete.");
    } catch (error) {
      console.error("[DevMate] Analysis operation failed:", error);
      setStatusMessage(error.message || "Analysis failed. Try again with valid code input.");
    } finally {
      setRuntimeInfo(getRuntimeInfo());
      setIsAnalyzing(false);
      setDownloadProgress((current) => ({ ...current, active: false }));
    }
  }

  async function handleEvaluateInterview(solution) {
    setIsEvaluatingInterview(true);
    try {
      setInterviewEvaluation(await evaluateInterview({ solution, language, interview: result?.interview }));
    } catch (error) {
      console.error("[DevMate] Interview evaluation failed:", error);
      setStatusMessage(error.message || "Interview evaluation failed. Please try again.");
    } finally {
      setRuntimeInfo(getRuntimeInfo());
      setIsEvaluatingInterview(false);
    }
  }

  function handleClearCode() {
    setCode("");
    setResult(null);
    setInterviewEvaluation(null);
    setStatusMessage("Editor cleared. Load a sample or paste code to continue.");
  }

  function handleLoadSample() {
    setCode(DEFAULT_SNIPPETS[language] || "");
    setResult(null);
    setInterviewEvaluation(null);
    setStatusMessage(`Loaded ${language.toUpperCase()} starter snippet.`);
  }

  function handleNewSession() {
    setCode(DEFAULT_SNIPPETS[language] || "");
    setResult(null);
    setInterviewEvaluation(null);
    setActiveTab("Visualize");
    setLastAnalysisTab("Visualize");
    setStatusMessage("Fresh session ready. Run analysis to populate insights.");
  }

  function handleNavSelect(nextTab) {
    setActiveTab(nextTab);
    setIsNavOpen(false);
  }

  async function handleEnterInterviewMode() {
    setActiveTab("Interview Mode");
    setIsNavOpen(false);
    // Only re-generate if code has changed since last generation
    const codeChanged = lastInterviewCode.current !== code;
    const hasInterview = Boolean(result?.interview?.problem);
    if (codeChanged || !hasInterview) {
      lastInterviewCode.current = code;
      setIsGeneratingInterview(true);
      try {
        const interview = await generateInterviewProblem({ code, language, onProgress: handleRuntimeProgress });
        setResult((prev) => ({ ...(prev || {}), interview }));
      } catch (error) {
        console.error("[DevMate] Interview generation failed:", error);
        setStatusMessage("Interview problem generation failed. Try re-entering Interview Mode.");
      } finally {
        setIsGeneratingInterview(false);
      }
    }
  }

  async function handleClearHistory() {
    try {
      await clearHistory();
      setHistory([]);
      setStatusMessage("Analysis history cleared.");
    } catch (e) {
      console.error("[DevMate] Failed to clear history:", e);
      setStatusMessage("Failed to clear history.");
    }
  }

  return (
    <>
      <div className={`app-shell stitch-shell ${isInterviewMode ? "app-shell--interview" : "app-shell--coding"}`}>
        <div className="ether-orb ether-orb--north" aria-hidden="true" />
        <div className="ether-orb ether-orb--south" aria-hidden="true" />

        <header className="topbar">
          <div className="topbar-brand">
            <div className="brand-mark">DM</div>
            <div className="brand-copy">
              <p className="eyebrow">The Kinetic Ether</p>
              <h1>DevMate</h1>
            </div>
          </div>

          <button
            type="button"
            className="topbar-icon-btn topbar-icon-btn--menu"
            aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen((current) => !current)}
          >
            <ShellIcon name="menu" />
          </button>

          <nav className="topbar-nav" aria-label="Primary modes">
            <button type="button" className={`topbar-link ${!isInterviewMode ? "active" : ""}`} onClick={() => setActiveTab(lastAnalysisTab)}>Coding</button>
            <button type="button" className={`topbar-link ${isInterviewMode ? "active" : ""}`} onClick={handleEnterInterviewMode}>
              Interview{isGeneratingInterview ? " ..." : ""}
            </button>
          </nav>

          <div className="topbar-meta">
            <div className="runtime-badges stitch-badges">
              <span className="badge badge-runtime">{runtimeHealth}</span>
            </div>
            <button type="button" className={`topbar-ghost-btn ${isVoiceConsoleVisible ? "active" : ""}`} onClick={() => setIsVoiceConsoleVisible(!isVoiceConsoleVisible)}>
              {isVoiceConsoleVisible ? "Hide Voice" : "Show Voice"}
            </button>
            <button type="button" className="topbar-ghost-btn" onClick={logout}>Logout</button>
            <button type="button" className="topbar-icon-btn" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}><ShellIcon name={theme === "dark" ? "theme-light" : "theme-dark"} /></button>
            <button type="button" className="topbar-icon-btn" aria-label="Open settings" onClick={() => setSettingsOpen(true)}><ShellIcon name="settings" /></button>
          </div>
        </header>

        <div
          style={{
            opacity: modelLoadProgress < 100 ? 1 : 0,
            height: modelLoadProgress < 100 ? 4 : 0,
            overflow: "hidden",
            transition: "opacity 180ms ease, height 180ms ease",
          }}
          aria-hidden={modelLoadProgress >= 100}
        >
          <div className="progress-track">
            <div className="progress-bar is-strong" style={{ width: `${modelLoadProgress}%` }} />
          </div>
        </div>

        <div className="shell-body">
          <button
            type="button"
            className={`shell-sidebar-scrim ${isNavOpen ? "is-open" : ""}`}
            aria-label="Close navigation menu"
            aria-hidden={!isNavOpen}
            tabIndex={isNavOpen ? 0 : -1}
            onClick={() => setIsNavOpen(false)}
          />
          <aside className={`shell-sidebar panel panel-stitch ${isNavOpen ? "is-open" : ""}`} aria-label="Primary navigation">
            <div className="sidebar-section">
              <p className="side-heading">Analysis Lenses</p>
              <nav className="side-tab-list" aria-label="Quick tab switcher">
                {TAB_ITEMS.map((item) => {
                  const selected = item.key === activeTab;
                  return (
                    <button key={item.key} type="button" className={`side-tab-btn ${selected ? "active" : ""}`} aria-pressed={selected} onClick={() => handleNavSelect(item.key)}>
                      <span className="side-tab-icon"><ShellIcon name={item.icon} /></span>
                      <span className="side-tab-copy"><strong>{item.label}</strong><span>{item.key === "Interview Mode" ? "Prompt + feedback" : "Reasoning view"}</span></span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`side-tab-btn ${isInterviewMode ? "active" : ""}`}
                  aria-pressed={isInterviewMode}
                  onClick={() => { handleEnterInterviewMode(); setIsNavOpen(false); }}
                >
                  <span className="side-tab-icon"><ShellIcon name="interview" /></span>
                  <span className="side-tab-copy">
                    <strong>Interview</strong>
                    <span>Prompt + feedback</span>
                  </span>
                </button>
              </nav>
            </div>


          </aside>

          <button
            type="button"
            className={`shell-nav-scrim ${isNavOpen ? "is-open" : ""}`}
            aria-label="Close navigation menu"
            onClick={() => setIsNavOpen(false)}
          />

          <div className="shell-main">
            <div className="runtime-status-strip">
              <span className="runtime-status-item">
                <span className="status-dot" style={{background: runtimeInfo?.modelReady ? 'rgba(74,222,128,0.9)' : 'rgba(255,138,138,0.9)', width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block'}} />
                {runtimeHealth}
              </span>
              <span className="runtime-status-item">
                <strong>{activeModelLabel}</strong> · {backendLabel}
              </span>
              {result && (
                <span className="runtime-status-item">
                  Complexity: <strong>{complexityNow}</strong> → <strong>{optimizedComplexity}</strong>
                </span>
              )}
              {result?.bug?.line && (
                <span className="runtime-status-item" style={{color: 'var(--error)'}}>
                  Bug at line {result.bug.line}
                </span>
              )}
            </div>

            {isVoiceConsoleVisible && (
              <div className="voice-console-overlay">
                <VoiceConsole code={code} language={language} activeTab={activeTab} analysis={result} runtimeInfo={runtimeInfo} onAnalyze={handleAnalyze} onSetActiveTab={handleNavSelect} onRuntimeRefresh={() => setRuntimeInfo(getRuntimeInfo())} />
              </div>
            )}

            {isInterviewMode ? (
              <main className="workspace workspace--interview" aria-label="Interview workspace">
                <section className="panel panel-stitch interview-brief-panel">
                  <div className="panel-topline">
                    <div><h2>Question Panel</h2><p className="muted-text">Generated from the latest analysis result.</p></div>
                    <span className="pill">{interviewHints.length} Hints</span>
                  </div>
                  <div className="interview-brief-body">
                    {result?.interview?.problem ? (
                      <>
                        <div className="interview-brief-meta"><span className="interview-tag">Generated Challenge</span><span className="interview-tag interview-tag--muted">{languageRuntime}</span></div>
                        <h3>{interviewHeadline}</h3>
                        <p className="prose-text">{result.interview.problem}</p>
                        <div className="interview-brief-card"><span className="kv-label">Expected Approach</span><p className="prose-text">{result.interview.expected_approach || "Analyze code to generate an expected approach."}</p></div>
                        <div className="interview-brief-card">
                          <span className="kv-label">Hint Preview</span>
                          {interviewHints.length ? <ul className="unordered-list">{interviewHints.slice(0, 3).map((hint, index) => <li key={`${hint}-${index}`}>{hint}</li>)}</ul> : <p className="muted-text">Run a fresh analysis if you want more interview hints.</p>}
                        </div>
                      </>
                    ) : <div className="tab-empty">Analyze code first to generate an interview prompt.</div>}
                  </div>
                </section>
                <section className="panel panel-stitch interview-workbench-panel">
                  <div className="panel-topline"><div><h2>Interview Workbench</h2><p className="muted-text">Timer, solution drafting, and evaluation stay on-device.</p></div><span className="pill pill-visualize">Evaluation Loop</span></div>
                  <div className="tab-content interview-stage-content">
                    <ErrorBoundary>{activeContent}</ErrorBoundary>
                  </div>
                </section>
              </main>
            ) : (
              <main className="workspace" aria-label="DevMate workspace">
                <section className="panel panel-stitch workspace-panel workspace-panel--editor">
                  <CodeEditorPanel
                    code={code}
                    language={language}
                    onCodeChange={setCode}
                    onLanguageChange={handleLanguageChange}
                    onAnalyze={handleAnalyze}
                    onClear={handleClearCode}
                    onLoadSample={handleLoadSample}
                    onRunCode={handleRunCode}
                    isRunningCode={isRunningCode}
                    statusMessage={statusMessage}
                    fileName={fileName}
                    runtimeLabel={languageRuntime}
                    isAnalyzing={isAnalyzing}
                    bugLineNumbers={result?.bug?.line ? [result.bug.line] : []}
                    languageOptions={languageOptionMap}
                    className="editor-panel-root"
                    height="100%"
                    theme={monacoTheme}
                    analyzeLabel="Run AI"
                    analyzingLabel="Analyzing..."
                  />
                </section>

                <section className="panel panel-stitch workspace-panel workspace-panel--analysis">
                  <nav className="tabs analysis-tabs" role="tablist" aria-label="Analysis tabs" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', marginTop: '0.5rem', padding: '0.75rem 1rem 0.5rem' }}>
                    {TAB_ITEMS.map((item) => {
                      const isActive = item.key === activeTab;
                      const isDisabled = !result && !isAnalyzing && !(item.key === "Output" && (codeOutput || isRunningCode));
                      return (
                        <button 
                          key={item.key} 
                          type="button" 
                          role="tab" 
                          aria-selected={isActive} 
                          disabled={isDisabled}
                          className={`tab-btn ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`} 
                          style={{ flexShrink: 0, padding: '0.5rem 1rem', borderRadius: '6px', opacity: isDisabled ? 0.4 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }} 
                          onClick={() => !isDisabled && setActiveTab(item.key)}
                        >
                          <ShellIcon name={item.icon} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                  <div className="tab-content" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
                    <ErrorBoundary>
                      {!result && activeTab !== "Output" && !isAnalyzing ? (
                        <div className="analysis-placeholder" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem', margin: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--ghost-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '2rem', fontFamily: '"Syne", sans-serif', fontWeight: 600, letterSpacing: '-0.02em' }}>
                            Welcome to DevMate
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '380px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, marginTop: '2px', boxShadow: '0 0 10px rgba(212, 88, 10, 0.3)' }}>1</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>Paste or load sample code</strong>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>Bring your code into the editor or select a sample snippet from the menu.</span>
                              </div>
                            </div>
                            
                            <div style={{ width: '2px', height: '16px', background: 'var(--ghost-border)', marginLeft: '13px' }}></div>
                            
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--ghost-border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>2</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>Click Run AI</strong>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>Initiate local analysis to process your code fully inside your browser.</span>
                              </div>
                            </div>
                            
                            <div style={{ width: '2px', height: '16px', background: 'var(--ghost-border)', marginLeft: '13px' }}></div>
                            
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--ghost-border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>3</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>See explanation, debug, visualize</strong>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>Explore the generated insights, find bugs, and see optimizations.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        activeContent
                      )}
                    </ErrorBoundary>
                  </div>
                </section>
              </main>
            )}
          </div>
        </div>
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        runtimeInfo={runtimeInfo}
        settings={settings}
        theme={theme}
        onClose={() => setSettingsOpen(false)}
        onSettingsChange={updateSettings}
        onThemeChange={(nextTheme) => {
          if (nextTheme !== theme) {
            toggleTheme();
          }
        }}
        onHistoryCleared={handleClearHistory}
        onRuntimeInfoChange={setRuntimeInfo}
      />
      <ModelDownloadProgress isDownloading={downloadProgress.active} progress={downloadProgress.value} modelName={downloadProgress.name} statusMessage={statusMessage} />
    </>
  );
}
