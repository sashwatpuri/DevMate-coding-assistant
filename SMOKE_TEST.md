# DevMate Smoke Test

Run these checks manually in the browser against the current app state.

1. Login flow: log in with any non-empty email and password, confirm the app opens, refresh the page, and confirm the session persists; then click `Logout` and verify the login page returns.
2. Runtime init: load the app and confirm `statusMessage` updates during startup, the model progress bar fills, and the top progress strip disappears after initialization completes.
3. Model loading: trigger analysis and confirm the RunAnywhere model loads in the browser or the app falls back to the configured local path within 15 seconds.
4. Code analysis: paste a sample Python snippet, click `Run AI`, and verify the Explanation, Debug, Visualize, and Optimize tabs all populate with results.
5. Interview mode: switch to Interview Mode, confirm a problem is generated, verify the timer counts down, and submit a solution to confirm evaluation returns a score and verdict.
6. Theme toggle: switch between dark and light themes from the topbar or settings panel, and confirm the Monaco editor theme changes with the app theme.
7. Settings panel: open and close the settings drawer, change the model selector, and confirm `runtimeInfo` reflects the selected model.
8. History: run an analysis and confirm the new entry appears in the history panel with the latest language, complexity, bug line, and timestamp.
9. Session persistence: refresh the page after editing code and changing tabs, then confirm the last code and active tab are restored from IndexedDB.
10. Auth gate: clear `localStorage`, refresh the page, and confirm the login page is shown again.
