export default function ModelDownloadProgress({
  isDownloading = false,
  progress = 0,
  modelName = "RunAnywhere Model",
  statusMessage = "Preparing local model...",
}) {
  if (!isDownloading) {
    return null;
  }

  const normalizedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  const percent = Math.round(normalizedProgress * 100);

  return (
    <aside className="model-download-toast" aria-live="polite" aria-label="Model download progress">
      <div className="model-download-toast__header">
        <div>
          <p className="eyebrow">Model Download</p>
          <h3>{modelName}</h3>
        </div>
        <strong>{percent}%</strong>
      </div>
      <progress className="model-download-toast__progress" value={normalizedProgress} max="1" />
      <p className="model-download-toast__message">{statusMessage}</p>
    </aside>
  );
}
