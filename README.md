# DevMate

DevMate is a local AI coding assistant built with React 18 and Vite 5. It keeps code, analysis, and session state on the device, using the RunAnywhere SDK for in-browser inference and Ollama on `localhost` as a fallback path. The UI follows the Kinetic Ether design system and supports coding, interview, theme, settings, and persistence flows without a cloud backend.

## Quick Start

### Windows PowerShell

```powershell
$env:OLLAMA_ORIGINS = "*"
ollama serve
```

Open a new terminal:

```powershell
npm install
npm run dev
```

### Mac / Linux

```bash
OLLAMA_ORIGINS=* ollama serve &
npm install && npm run dev
```

## Architecture

```text
Browser UI
  |
  v
RunAnywhere SDK
  |
  +--> LFM2 browser model (WASM / WebGPU)
  |
  +--> Ollama fallback on localhost
           |
           v
       phi3:mini
```

## Features

- Local login gate with device-only session persistence.
- Coding workspace with Monaco editor, sample loading, file upload, and AI analysis.
- Four analysis views: Explain, Debug, Visualize, and Optimize.
- Interview mode with generated prompt, hints, countdown timer, and automated evaluation.
- Theme switching between dark and light variants.
- Runtime settings drawer for model selection, Ollama configuration, and history clearing.
- IndexedDB session/history persistence for recent code and analysis state.
- Voice console hooks for local speech features when available.

## Design System

The UI is based on the Kinetic Ether system defined in [stitch_devmate/neon_synthesis/DESIGN.md](./stitch_devmate/neon_synthesis/DESIGN.md).

## Known Issues / Limitations

- Browser model loading depends on cross-origin isolation and sufficient device memory.
- Some devices may fall back to Ollama or refuse a browser model if the environment is not safe.
- Ollama must be running locally and may require `OLLAMA_ORIGINS="*"` on Windows for browser access.
- Voice features depend on browser support and local model availability.
- The project is intentionally local-first; there is no cloud auth or hosted backend.

## Browser Requirements

### For Optimal Performance:
- Chrome/Edge 113+ or Firefox 115+ (recommended)
- Cross-origin isolation enabled (required for multi-threading)
- Minimum 8GB device RAM (for best experience)

### Serving with Proper Headers:
When deploying, ensure your server sends these headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

For development with Vite, these are already configured in `vite.config.js`.

### Without Cross-Origin Isolation:
The app will still work but run in single-threaded mode (slower inference).

### Troubleshooting Model Loading:
If you see "Array buffer error" or model won't load:
1. Check browser console for specific error messages
2. Verify cross-origin isolation: open DevTools → Console → type `crossOriginIsolated` (should be `true`)
3. Clear browser cache and localStorage: `localStorage.clear()` in console
4. Try in an Incognito/Private window
5. Access the verification page at `/verify-headers.html` to check your environment
