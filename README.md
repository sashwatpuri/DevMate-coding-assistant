# DevMate

DevMate is a high-precision, AI-enabled local coding assistant built with React 18 and Vite 5. It manages code, dynamic algorithmic analysis, and session state entirely on the device. DevMate leverages the RunAnywhere SDK for in-browser inference alongside a robust localhost Ollama fallback, and relies on the OneCompiler API for secure real-time code execution across ~80 programming languages.

## Quick Start

### Local Hardware Preparation (Ollama)
Ensure the local Ollama daemon allows cross-origin requests for analysis to function smoothly.

**Windows PowerShell:**
```powershell
$env:OLLAMA_ORIGINS = "*"
ollama serve
```

**Mac / Linux:**
```bash
OLLAMA_ORIGINS=* ollama serve &
```

### Starting the Application
Open a new terminal context in the project root:
```bash
npm install
npm run dev
```

## Architecture Map

```text
Browser UI (React)
  |
  +-> Source Code Editor (Monaco @ 0.50.0) -> Output / Diff Viewing 
  +-> Localized State Engine (IndexedDB)
  |
  v
Execution & Analysis Layer
  |
  +-> Code Execution Engine -> Vite Proxy -> OneCompiler API
  |
  +-> Dynamic Heuristic Engine -> Loop Depth Analyzer / Complexity Tracker (O(n), O(n²), etc.)
  |
  +-> AI Inference Bridge
       |-> LFM2 browser model (WASM / WebGPU)
       |-> Localhost Ollama Fallback (e.g., phi3:mini)
```

## Features

- **Local Execution Proxies:** Code execution queries bypass CORS seamlessly by leveraging Vite proxies mapping into the OneCompiler infrastructure. 
- **Dynamic Heuristic Engine:** Calculates authentic structural algorithmic complexities directly from AST-like loop depth detection patterns instead of generic lookup fallbacks.
- **Vertical Flow Graphs:** High-contrast `react-flow` visualizations stack execution depths dynamically from top-to-bottom for large-scale algorithmic tracing.
- **Stable Code Workspace:** Bundled with a pre-configured Monaco Editor mapped to stable `0.50.0` ensuring zero `DiffEditor` unmounting exceptions during long coding sessions.
- **Interview Mode Engine:** Context-aware behavioral prompts are generated autonomously upon inspecting the currently mapped codebase, with a dedicated evaluation timer.
- **Editorial Monochrome Aesthetic:** Locked exclusively into an optimized syntax-dark mode for developers to reduce visual load in long-haul low-light coding sessions.
- **Zero-Cloud Auth:** Local login gate utilizing un-leaked `localStorage`/`IndexedDB` configurations ensuring code persistence strictly on-device.

## Browser Requirements & Limits

### For Optimal Performance:
- **Environment:** Chrome/Edge 113+ or Firefox 115+ with Cross-origin isolation strictly enabled.
- **Hardware:** Minimum 8GB device RAM, dedicated GPU strongly encouraged for WebGPU fallback. 

### Development Notes

During standard development:
```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```
*Note: Vite handles headers automatically. We also ship an intrinsic proxy configuration for `/api/onecompiler/*` right out-of-the-box inside `vite.config.js`*.

### Troubleshooting
1. **Model Array Buffer Exceptions:** Force reload ensuring `crossOriginIsolated === true` via developer tools, or wipe `localStorage.clear()`.
2. **Execution Console Timeout / Errors (`E004`):** Ensure you haven't circumvented the internal Vite proxy mappings for code execution tracking.
3. **RunAnywhere Load Warnings:** Background terminal warnings reading `RunAnywhere could not load LFM2 350M` are fully soft-caught constraints and will not deter foundational application connectivity. Fallbacks will auto-trigger seamlessly.
