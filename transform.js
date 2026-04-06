import fs from 'fs';

function processCSS() {
    let css = fs.readFileSync('src/styles.css', 'utf-8');

    // 1. Update Fonts
    css = css.replace(
        /@import url\([^)]+\);/,
        '@import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif&family=Syne:wght@400;500;600;700;800&display=swap");'
    );

    // 2. Update CSS Variables (--bg, --primary, etc.) in :root
    const rootReplacement = `:root {
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
  --primary-strong: #FF6600;
  --primary-fixed: #D4580A;
  --secondary: #D4580A;
  --secondary-strong: #FF6600;
  --error: #FF3333;
  --ghost-border: rgba(242, 237, 228, 0.08);
  --shadow-soft: none;
  --shadow-glow: none;
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 2px;
  --radius-xl: 4px;
}`;
    css = css.replace(/:root\s*\{[^}]+\}/, rootReplacement);

    // 3. Update Light theme variables
    const lightReplacement = `html:not(.dark),
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
}`;
    css = css.replace(/html:not\(\.dark\),\s*:root\.light,\s*html\[data-theme="light"\]\s*\{[^}]+\}/, lightReplacement);

    // 4. Typography Rules
    css = css.replace(/font-family:\s*"Inter",[^;]+;/g, 'font-family: "IBM Plex Mono", monospace;');
    css = css.replace(/h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*\}/g, 'h1, h2, h3, h4 {\n  margin: 0;\n  font-family: "Syne", sans-serif;\n  letter-spacing: -0.02em;\n  font-weight: 600;\n}');
    css = css.replace(/code,\s*pre,\s*textarea\s*\{[^}]*\}/g, 'code, pre, textarea {\n  font-family: "IBM Plex Mono", monospace;\n}');

    // 5. Body Background (no glowing orbs)
    css = css.replace(/body\s*\{[^}]*\}/g, 'body {\n  margin: 0;\n  overflow-x: hidden;\n  color: var(--text-main);\n  font-family: "IBM Plex Mono", monospace;\n  background: var(--bg);\n}');
    css = css.replace(/body::before,\s*body::after\s*\{[^}]*\}/g, '');
    css = css.replace(/body::before\s*\{[^}]*\}/g, '');
    css = css.replace(/body::after\s*\{[^}]*\}/g, '');
    css = css.replace(/\.ether-orb\s*\{[^}]*\}/g, '.ether-orb { display: none; }');
    css = css.replace(/\.bg-flare\s*\{[^}]*\}/g, '.bg-flare { display: none; }');

    // 6. Button text transformations
    css = css.replace(/\.primary-btn\s*\{/g, '.primary-btn {\n  border-radius: var(--radius-sm);\n  font-family: "Syne", sans-serif;\n  text-transform: uppercase;\n  font-weight: 700;\n  letter-spacing: 0.05em;\n');
    css = css.replace(/\.secondary-btn\s*\{/g, '.secondary-btn {\n  border-radius: var(--radius-sm);\n  font-family: "Syne", sans-serif;\n  text-transform: uppercase;\n  font-weight: 600;\n  border: 1px solid var(--ghost-border);\n  background: transparent;\n');
    css = css.replace(/\.secondary-btn:hover\s*\{[^}]*\}/g, '.secondary-btn:hover { background: var(--surface-highest); }');

    // Prose sections
    css = css.replace(/\.prose-text\s*\{[^}]*\}/g, '.prose-text {\n  font-family: "Instrument Serif", "DM Serif Display", serif;\n  font-size: 1.25rem;\n  line-height: 1.4;\n  color: var(--text-main);\n}');

    // 7. Skeletons
    css = css.replace(/\.skeleton\s*\{[^}]*\}/g, '.skeleton {\n  background: transparent !important;\n  box-shadow: none !important;\n  animation: none !important;\n}\n.skeleton::after {\n  content: " _";\n  color: var(--primary);\n  animation: blink 1s step-end infinite;\n}\n@keyframes blink { 50% { opacity: 0; } }');

    // 8. Topbar
    css = css.replace(/\.topbar\s*\{([^}]*)\}/g, (match, inner) => {
        return '.topbar {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: var(--topbar-height);\n  background: var(--bg-deep);\n  border-bottom: 1px solid var(--ghost-border);\n  z-index: 100;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 1.5rem;\n}';
    });
    css = css.replace(/\.topbar-brand[^\{]*\{[^}]*\}/g, '.topbar-brand {\n  font-family: "Syne", sans-serif;\n  text-transform: uppercase;\n  font-weight: 800;\n  font-size: 1rem;\n  color: var(--primary);\n  letter-spacing: 0.05em;\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  text-decoration: none;\n}');
    
    css = css.replace(/\.topbar-meta a,\s*\.topbar-meta button\s*\{([^}]*)\}/g, '.topbar-meta a, .topbar-meta button {\n  font-family: "IBM Plex Mono", monospace;\n  text-transform: uppercase;\n  letter-spacing: 0.1em;\n  font-size: 11px;\n}');
    css = css.replace(/\.topbar-meta\s*\{([^}]*)\}/g, (match, inner) => '.topbar-meta {' + inner + '\n  font-family: "IBM Plex Mono", monospace;\n  text-transform: uppercase;\n  letter-spacing: 0.1em;\n  font-size: 11px;\n}');

    // 9. Sidebar
    css = css.replace(/\.shell-sidebar\s*\{([^}]*)\}/g, (match, inner) => '.shell-sidebar {' + inner + ' border-right: 1px solid var(--ghost-border); background: var(--bg); border-radius: 0; }');
    css = css.replace(/\.nav-item\s*\{([^}]*)\}/g, (match, inner) => '.nav-item {' + inner + ' border-radius: 0; background: transparent !important; border-left: 2px solid transparent; }');
    css = css.replace(/\.nav-item\.active\s*\{([^}]*)\}/g, (match, inner) => '.nav-item.active { border-left-color: var(--primary); color: var(--primary); background: transparent !important; }');
    css = css.replace(/\.sidebar-section\s*\{([^}]*)\}/g, (match, inner) => '.sidebar-section {' + inner + ' border-bottom: 1px solid var(--ghost-border); margin-bottom: 1rem; padding-bottom: 1rem; }');

    // 10. Editor (monaco bezel)
    css = css.replace(/\.monaco-wrapper\s*\{([^}]*)\}/g, (match, inner) => '.monaco-wrapper {' + inner + ' border: 1px solid var(--ghost-border); border-radius: var(--radius-sm); }');
    css = css.replace(/\.editor-info-strip\s*\{([^}]*)\}/g, (match, inner) => '.editor-info-strip {' + inner + ' font-family: "IBM Plex Mono", monospace; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--ghost-border); background: var(--surface-low); }');
    
    // 11. Tabs
    css = css.replace(/\.analysis-tabs\s*\{([^}]*)\}/g, (match, inner) => {
        let content = inner;
        if (!content.includes('gap')) content += '\n  gap: 1.5rem;';
        return '.analysis-tabs {' + content + ' border-bottom: 1px solid var(--ghost-border); }';
    });
    css = css.replace(/\.tab-btn\s*\{([^}]*)\}/g, (match, inner) => '.tab-btn {' + inner + ' border-radius: 0 !important; background: transparent !important; color: var(--text-muted); border-bottom: 2px solid transparent; text-transform: uppercase; font-family: "IBM Plex Mono", monospace; font-size: 11px; padding: 0.5rem 0 !important; position: relative; }');
    css = css.replace(/\.tab-btn\.active\s*\{([^}]*)\}/g, (match, inner) => '.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }');
    css = css.replace(/\.pill-visualize\s*\{([^}]*)\}/g, (match, inner) => '.pill-visualize { font-family: "IBM Plex Mono", monospace; text-transform: uppercase; font-size: 10px; border-radius: var(--radius-sm); border: 1px solid var(--primary); background: transparent; color: var(--primary); padding: 0.2rem 0.5rem; }');

    // 12. Dashboard Cards and Panels
    css = css.replace(/\.panel-stitch\s*\{([^}]*)\}/g, (match, inner) => '.panel-stitch {' + inner + ' border: 1px solid var(--ghost-border); background: var(--bg); border-radius: var(--radius-sm); box-shadow: none !important; }');
    css = css.replace(/\.dashboard-card\s*\{([^}]*)\}/g, (match, inner) => '.dashboard-card {' + inner + ' border: 1px solid var(--ghost-border); background: var(--surface-container); border-radius: var(--radius-sm); box-shadow: none !important; }');
    
    // 13. Progress Bars
    css = css.replace(/\.progress-bar\s*\{([^}]*)\}/g, (match, inner) => '.progress-bar {' + inner + ' border-radius: 0; background: var(--primary); height: 3px; box-shadow: none !important; }');
    css = css.replace(/\.progress-track\s*\{([^}]*)\}/g, (match, inner) => '.progress-track {' + inner + ' border-radius: 0; background: var(--surface-highest); height: 3px; }');

    // 14. Forms
    css = css.replace(/\.form-input\s*\{([^}]*)\}/g, (match, inner) => '.form-input {' + inner + ' font-family: "IBM Plex Mono", monospace; border: 1px solid var(--ghost-border) !important; background: var(--surface-low); border-radius: var(--radius-sm); box-shadow: none !important; }');

    // 15. Voice Console
    css = css.replace(/\.voice-console\s*\{([^}]*)\}/g, (match, inner) => '.voice-console {' + inner + ' background: var(--bg-soft); border: 1px solid var(--ghost-border); border-radius: var(--radius-sm); box-shadow: none !important; }');

    // 16. Transitions to 0.1s
    css = css.replace(/transition:\s*all\s*0\.[34]s[^;]+;/g, 'transition: all 0.1s ease;');

    // Clean duplicates / residual glows
    css = css.replace(/box-shadow:\s*var\(--shadow-soft\);/g, "box-shadow: none;");
    css = css.replace(/box-shadow:\s*var\(--shadow-glow\);/g, "box-shadow: none;");
    
    // 17. Auth Card Customization
    css = css.replace(/\.auth-card\s*\{([^}]*)\}/g, (match, inner) => '.auth-card {' + inner + ' background: var(--bg); border: 1px solid var(--ghost-border); border-radius: var(--radius-sm); box-shadow: none !important; padding: 3rem; }');
    
    // Add auth card title styling at the very end
    css += "\n.auth-card h1 { font-family: 'Instrument Serif', serif; font-size: 2.5rem; text-align: center; margin-bottom: 2rem; }\n";
    
    // Auth inputs formatting
    css += "\n.auth-card input { font-family: 'IBM Plex Mono', monospace; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }\n"

    // Fix active tabs slide animation
    css += `\n.tab-btn::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--primary);
  transform: scaleX(0);
  transition: transform 0.15s ease;
  transform-origin: left;
}
.tab-btn.active::after {
  transform: scaleX(1);
}\n`

    fs.writeFileSync('src/styles.css', css, 'utf-8');
    console.log("CSS Transformation Complete");
}

processCSS();
