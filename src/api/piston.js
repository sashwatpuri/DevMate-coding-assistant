import { LANGUAGE_VERSIONS } from "../config/constants";

export async function executeCode(code, languageId) {
  const config = LANGUAGE_VERSIONS[languageId] || LANGUAGE_VERSIONS.python;
  
  const payload = {
    language: config.language,
    version: config.version,
    files: [{ content: code }]
  };

  const primaryUrl = "https://piston.rodbox.co.uk/api/v2/piston/execute";
  const fallbackUrl = "https://emkc.org/api/v2/piston/execute";

  const fetchWithTimeout = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  let usedFallback = false;
  let response = null;

  try {
    try {
      response = await fetchWithTimeout(primaryUrl);
    } catch (e) {
      // Catch network errors or aborts on primary to allow fallback
      response = null;
    }
    
    if (!response || [401, 403, 503].includes(response.status)) {
      usedFallback = true;
      response = await fetchWithTimeout(fallbackUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Execution environment unavailable (${response.status})`);
    }
    
    const result = await response.json();
    const output = (result.run && result.run.output) ? result.run.output : "Process finished with no output.";
    return { output, usedFallback };
  } catch (error) {
    throw new Error("Code execution service is temporarily unavailable. Your code analysis still works locally.");
  }
}
