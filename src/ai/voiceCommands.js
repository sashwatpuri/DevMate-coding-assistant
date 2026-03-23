const VOICE_COMMANDS = [
  {
    type: "explain",
    tab: "Explanation",
    patterns: [
      /\bexplain\b/i,
      /\bwalk me through\b/i,
      /\bwhat does this do\b/i,
      /\bsummarize\b/i,
    ],
  },
  {
    type: "debug",
    tab: "Debug",
    patterns: [
      /\bdebug\b/i,
      /\bfind (?:the )?bug\b/i,
      /\bfix(?: this)?\b/i,
      /\bwhat's wrong\b/i,
    ],
  },
  {
    type: "optimize",
    tab: "Optimize",
    patterns: [
      /\boptimize\b/i,
      /\bmake (?:it )?faster\b/i,
      /\bimprove performance\b/i,
      /\breduce complexity\b/i,
    ],
  },
  {
    type: "visualize",
    tab: "Visualize",
    patterns: [
      /\bvisualize\b/i,
      /\bshow flow\b/i,
      /\bstep through\b/i,
      /\btrace\b/i,
    ],
  },
  {
    type: "interview",
    tab: "Interview Mode",
    patterns: [
      /\binterview\b/i,
      /\bmock interview\b/i,
      /\bpractice\b/i,
      /\bwhiteboard\b/i,
    ],
  },
  {
    type: "analyze",
    patterns: [
      /\banalyze\b/i,
      /\brun analysis\b/i,
      /\brefresh\b/i,
      /\breason over\b/i,
    ],
  },
];

export function detectVoiceCommand(transcript = "") {
  const normalized = String(transcript || "").trim();
  if (!normalized) {
    return null;
  }

  for (const command of VOICE_COMMANDS) {
    if (command.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        type: command.type,
        tab: command.tab || null,
        shouldAnalyze: command.type === "analyze",
        transcript: normalized,
      };
    }
  }

  return {
    type: "general",
    tab: null,
    shouldAnalyze: false,
    transcript: normalized,
  };
}

export function commandLabel(command) {
  if (!command) {
    return "";
  }

  switch (command.type) {
    case "explain":
      return "Explain";
    case "debug":
      return "Debug";
    case "optimize":
      return "Optimize";
    case "visualize":
      return "Visualize";
    case "interview":
      return "Interview";
    case "analyze":
      return "Analyze";
    default:
      return "General";
  }
}
