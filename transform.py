import re

def process_css():
    with open('src/styles.css', 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Update Fonts
    css = re.sub(
        r'@import url\([^)]+\);',
        '@import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif&family=Syne:wght@400;500;600;700;800&display=swap");',
        css,
        count=1
    )

    # 2. Update CSS Variables (--bg, --primary, etc.) in :root
    # We will just replace everything inside :root
    def replace_root(m):
        return """:root {
  color-scheme: dark;
  --topbar-height: 4rem;
  --shell-max-width: 100%;
  --sidebar-width: 18rem;
  --bg: #0F0F0F;
  --bg-soft: #151515;
  --bg-deep: #0A0A0A;
  --bg-faint: #1C1C1C;
  --surface: #0F0F0F;
  --surface-low: #151515;
  --surface-lowest: #0A0A0A;
  --surface-mid: #1C1C1C;
  --surface-high: #222222;
  --surface-highest: #2A2A2A;
  --surface-container: #151515;
  --surface-container-high: #1C1C1C;
  --surface-bright: #2A2A2A;
  --text-main: #F2EDE4;
  --text-muted: rgba(242, 237, 228, 0.5);
  --text-strong: #FFFFFF;
  --text-deep: #0F0F0F;
  --primary: #D4580A;
  --primary-strong: #D4580A;
  --primary-fixed: #D4580A;
  --secondary: #D4580A;
  --secondary-strong: #D4580A;
  --error: #FF3333;
  --ghost-border: rgba(242, 237, 228, 0.08);
  --shadow-soft: none;
  --shadow-glow: none;
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 2px;
  --radius-xl: 4px;
}"""
    css = re.sub(r':root\s*\{[^}]+\}', replace_root, css, count=1)

    # 3. Update Light theme variables
    def replace_light(m):
        return """html:not(.dark),
:root.light,
html[data-theme="light"] {
  color-scheme: light;
  --bg: #F7F3EC;
  --bg-soft: #EFEBE4;
  --bg-deep: #FFFFFF;
  --bg-faint: #E8E4DD;
  --surface: #F7F3EC;
  --surface-low: #EFEBE4;
  --surface-lowest: #FFFFFF;
  --surface-mid: #E8E4DD;
  --surface-high: #DDDACF;
  --surface-highest: #D5D1C5;
  --surface-container: #EFEBE4;
  --surface-container-high: #E8E4DD;
  --surface-bright: #FFFFFF;
  --text-main: #0F0F0F;
  --text-muted: rgba(15, 15, 15, 0.6);
  --text-strong: #000000;
  --text-deep: #0F0F0F;
  --primary: #D4580A;
  --ghost-border: rgba(15, 15, 15, 0.1);
  --shadow-soft: none;
  --shadow-glow: none;
}"""
    css = re.sub(r'html:not\(\.dark\),\s*:root\.light,\s*html\[data-theme="light"\]\s*\{[^}]+\}', replace_light, css, count=1)

    # 4. Typography Rules
    css = re.sub(r'font-family:\s*"Inter",[^;]+;', 'font-family: "IBM Plex Mono", monospace;', css)
    css = re.sub(r'h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*\}', 'h1, h2, h3, h4 {\n  margin: 0;\n  font-family: "Syne", sans-serif;\n  letter-spacing: -0.02em;\n  font-weight: 600;\n}', css)
    css = re.sub(r'code,\s*pre,\s*textarea\s*\{[^}]*\}', 'code, pre, textarea {\n  font-family: "IBM Plex Mono", monospace;\n}', css)
    
    # 5. Body Background (no glowing orbs)
    css = re.sub(r'body\s*\{[^}]*\}', 'body {\n  margin: 0;\n  overflow-x: hidden;\n  color: var(--text-main);\n  font-family: "IBM Plex Mono", monospace;\n  background: var(--bg);\n}', css)
    css = re.sub(r'body::before,\s*body::after\s*\{[^}]*\}', '', css)
    css = re.sub(r'body::before\s*\{[^}]*\}', '', css)
    css = re.sub(r'body::after\s*\{[^}]*\}', '', css)
    css = re.sub(r'\.ether-orb\s*\{[^}]*\}', '.ether-orb { display: none; }', css)
    css = re.sub(r'\.bg-flare\s*\{[^}]*\}', '.bg-flare { display: none; }', css)

    # 6. Button text transformations
    css = re.sub(r'\.primary-btn\s*\{', '.primary-btn {\n  border-radius: var(--radius-sm);\n  font-family: "Syne", sans-serif;\n  text-transform: uppercase;\n  font-weight: 700;\n  letter-spacing: 0.05em;\n', css)
    css = re.sub(r'\.secondary-btn\s*\{', '.secondary-btn {\n  border-radius: var(--radius-sm);\n  font-family: "Syne", sans-serif;\n  text-transform: uppercase;\n  font-weight: 600;\n  border: 1px solid var(--ghost-border);\n  background: transparent;\n', css)

    # Prose sections
    css = re.sub(r'\.prose-text\s*\{[^}]*\}', '.prose-text {\n  font-family: "Instrument Serif", "DM Serif Display", serif;\n  font-size: 1.25rem;\n  line-height: 1.4;\n  color: var(--text-main);\n}', css)

    # 7. Skeletons
    css = re.sub(r'\.skeleton\s*\{[^}]*\}', '.skeleton {\n  background: transparent !important;\n  box-shadow: none !important;\n  animation: none !important;\n}\n.skeleton::after {\n  content: " _";\n  color: var(--primary);\n  animation: blink 1s step-end infinite;\n}\n@keyframes blink { 50% { opacity: 0; } }', css)

    # 8. Topbar
    css = re.sub(r'\.topbar\s*\{[^}]*\}', '.topbar {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: var(--topbar-height);\n  background: var(--bg-deep);\n  border-bottom: 1px solid var(--ghost-border);\n  z-index: 100;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 1.5rem;\n}', css)
    css = re.sub(r'\.topbar-brand[^\{]*\{[^}]*\}', '.topbar-brand {\n  font-family: "Syne", sans-serif;\n  text-transform: uppercase;\n  font-weight: 800;\n  font-size: 1rem;\n  color: var(--primary);\n  letter-spacing: 0.05em;\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  text-decoration: none;\n}', css)
    css = re.sub(r'\.topbar-meta\s*\{([^}]*)\}', r'.topbar-meta {\1 font-family: "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; }', css)
    
    # 9. Sidebar
    css = re.sub(r'\.shell-sidebar\s*\{([^}]*)\}', r'.shell-sidebar {\1 border-right: 1px solid var(--ghost-border); background: var(--bg); border-radius: 0; }', css)
    css = re.sub(r'\.nav-item\s*\{([^}]*)\}', r'.nav-item {\1 border-radius: 0; background: transparent; border-left: 2px solid transparent; }', css)
    css = re.sub(r'\.nav-item\.active\s*\{([^}]*)\}', r'.nav-item.active { border-left-color: var(--primary); color: var(--primary); background: transparent; }', css)
    css = re.sub(r'\.nav-item:hover:not\(\.active\)\s*\{([^}]*)\}', r'.nav-item:hover:not(.active) { background: transparent; color: var(--text-strong); }', css)
    css = re.sub(r'\.sidebar-section\s*\{([^}]*)\}', r'.sidebar-section {\1 border-bottom: 1px solid var(--ghost-border); margin-bottom: 1rem; padding-bottom: 1rem; }', css)

    # 10. Editor (monaco bezel)
    css = re.sub(r'\.monaco-wrapper\s*\{([^}]*)\}', r'.monaco-wrapper {\1 border: 1px solid var(--ghost-border); border-radius: var(--radius-sm); }', css)
    css = re.sub(r'\.editor-info-strip\s*\{([^}]*)\}', r'.editor-info-strip {\1 font-family: "IBM Plex Mono", monospace; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--ghost-border); background: var(--surface-low); }', css)
    
    # 11. Tabs
    css = re.sub(r'\.analysis-tabs\s*\{([^}]*)\}', r'.analysis-tabs {\1 border-bottom: 1px solid var(--ghost-border); gap: 1.5rem; }', css)
    css = re.sub(r'\.tab-btn\s*\{([^}]*)\}', r'.tab-btn {\1 border-radius: 0; background: transparent !important; color: var(--text-muted); border-bottom: 2px solid transparent; text-transform: uppercase; font-family: "IBM Plex Mono", monospace; font-size: 11px; padding: 0.5rem 0; position: relative; }', css)
    css = re.sub(r'\.tab-btn\.active\s*\{([^}]*)\}', r'.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }', css)
    css = re.sub(r'\.tab-btn:hover\s*\{([^}]*)\}', r'.tab-btn:hover { color: var(--text-strong); border-bottom-color: var(--ghost-border); }', css)
    css = re.sub(r'\.pill-visualize\s*\{([^}]*)\}', r'.pill-visualize { \1 font-family: "IBM Plex Mono", monospace; text-transform: uppercase; font-size: 10px; border-radius: 2px; border: 1px solid var(--primary); background: transparent; color: var(--primary); }', css)

    # 12. Dashboard Cards and Panels
    css = re.sub(r'\.panel-stitch\s*\{([^}]*)\}', r'.panel-stitch {\1 border: 1px solid var(--ghost-border); background: var(--bg); border-radius: var(--radius-sm); box-shadow: none; }', css)
    css = re.sub(r'\.dashboard-card\s*\{([^}]*)\}', r'.dashboard-card {\1 border: 1px solid var(--ghost-border); background: var(--surface-container); border-radius: var(--radius-sm); box-shadow: none; }', css)
    css = re.sub(r'\.dashboard-card-header p\.eyebrow', '.dashboard-card-header p.eyebrow { font-family: "IBM Plex Mono", monospace; text-transform: uppercase; font-size: 10px; }', css)

    # 13. Progress Bars
    css = re.sub(r'\.progress-bar\s*\{([^}]*)\}', r'.progress-bar {\1 border-radius: 0; background: var(--primary); height: 3px; box-shadow: none; }', css)
    css = re.sub(r'\.progress-track\s*\{([^}]*)\}', r'.progress-track {\1 border-radius: 0; background: var(--surface-highest); height: 3px; }', css)

    # 14. Forms
    css = re.sub(r'\.form-input\s*\{([^}]*)\}', r'.form-input {\1 font-family: "IBM Plex Mono", monospace; border: 1px solid var(--ghost-border); background: var(--surface-low); border-radius: var(--radius-sm); }', css)

    # 15. Voice Console
    css = re.sub(r'\.voice-console\s*\{([^}]*)\}', r'.voice-console {\1 background: var(--bg-soft); border: 1px solid var(--ghost-border); border-radius: var(--radius-sm); box-shadow: none; }', css)

    # 16. Transitions to 0.1s
    css = re.sub(r'transition:\s*all\s*0\.[34]s', 'transition: all 0.1s', css)

    # Clean duplicates / residual glows
    css = css.replace("box-shadow: var(--shadow-soft);", "box-shadow: none;")
    css = css.replace("box-shadow: var(--shadow-glow);", "box-shadow: none;")
    
    # 17. Auth Card Customization
    css = re.sub(r'\.auth-card\s*\{([^}]*)\}', r'.auth-card {\1 background: var(--bg); border: 1px solid var(--ghost-border); border-radius: var(--radius-sm); box-shadow: none; padding: 3rem; }', css)
    css += "\n.auth-card h1 { font-family: 'Instrument Serif', serif; font-size: 2.5rem; text-align: center; margin-bottom: 2rem; }\n"

    with open('src/styles.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("CSS Transformation Complete")

process_css()
