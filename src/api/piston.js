const LANGUAGE_VERSIONS = {
  python: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  cpp: { language: "c++", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
  typescript: { language: "typescript", version: "5.0.3" },
  go: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.68.2" },
  c: { language: "c", version: "10.2.0" },
};

export async function executeCode(code, languageId) {
  const config = LANGUAGE_VERSIONS[languageId] || LANGUAGE_VERSIONS.python;
  
  try {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [{ content: code }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Execution environment unavailable (${response.status})`);
    }
    
    const result = await response.json();
    return result.run.output || "Process finished with no output.";
  } catch (error) {
    return "Failed to execute code: " + error.message;
  }
}
