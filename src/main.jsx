import React from "react";
import ReactDOM from "react-dom/client";
import { loader } from "@monaco-editor/react";
import App from "./App";
import AuthGate from "./components/auth/AuthGate";
import "./styles.css";

loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs" } });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);
