import { LANGUAGE_VERSIONS, FILE_NAMES } from "../config/constants";

export async function executeCode(code, languageId) {
  const langMap = {
    "c++": "cpp",
    "javascript": "nodejs"
  };
  
  const rawLang = LANGUAGE_VERSIONS[languageId]?.language || languageId;
  const ocLanguage = langMap[rawLang] || rawLang;
  
  const filename = FILE_NAMES[languageId] || `main.${languageId || "txt"}`;

  const payload = {
    language: ocLanguage,
    files: [
      {
        name: filename,
        content: code
      }
    ]
  };

  const url = "/api/onecompiler/run";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "oc_44jkg6jwn_44jkg6jx7_4eca5dc03820712a9f72a5b9b9431581b390d409f8e4226f"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Execution environment unavailable (Status: ${response.status})`);
    }

    const result = await response.json();
    
    if (result.status === "failed") {
        throw new Error(result.error || "Compilation failed");
    }

    let output = "";
    if (result.stdout) output += result.stdout;
    if (result.stderr) output += (output ? "\n[STDERR]:\n" : "") + result.stderr;
    if (result.exception) output += (output ? "\n[EXCEPTION]:\n" : "") + result.exception;
    
    if (!output.trim()) {
        output = "Process finished with no output.";
    }

    // Since we are using an official production API now, there is no "fallback".
    return { output, usedFallback: false };
  } catch (error) {
    throw new Error(error.message || "\n[ERROR] Code execution service is temporarily unavailable.");
  }
}
