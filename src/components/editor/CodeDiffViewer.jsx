import { useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';

const DEFAULT_DIFF_OPTIONS = {
  automaticLayout: true,
  originalEditable: false,
  readOnly: true,
  renderSideBySide: true,
  scrollBeyondLastLine: false,
  minimap: { enabled: false },
  wordWrap: 'on',
};

export default function CodeDiffViewer({
  originalCode = '',
  optimizedCode,
  fixedCode,
  language = 'javascript',
  height = '420px',
  theme = 'vs-dark',
  options = {},
  className,
}) {
  const modifiedCode = optimizedCode ?? fixedCode ?? '';
  const mergedOptions = useMemo(
    () => ({ ...DEFAULT_DIFF_OPTIONS, ...options }),
    [options],
  );

  return (
    <section className={className}>
      <DiffEditor
        original={originalCode}
        modified={modifiedCode}
        language={language}
        height={height}
        theme={theme}
        options={mergedOptions}
      />
    </section>
  );
}
