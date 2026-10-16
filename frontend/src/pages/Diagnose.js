import React, { useState, useRef } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function Diagnose() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [temperature, setTemperature] = useState("");
  const [vibration, setVibration] = useState("");
  const [pressure, setPressure] = useState("");
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!image) {
      setError("Please upload an image of the defective part.");
      return;
    }

    const telemetry = {
      temperature: temperature ? Number(temperature) : null,
      vibration: vibration ? Number(vibration) : null,
      pressure: pressure ? Number(pressure) : null,
    };

    const formData = new FormData();
    formData.append("image", image);
    formData.append("telemetry", JSON.stringify(telemetry));
    formData.append("manual_text", manualText);

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Request failed with status ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong while analyzing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="diagnose-page">
      <div className="diagnose-header">
        <p className="eyebrow">Diagnostic console</p>
        <h1>
          Upload a defect. Get a <span className="grad-text">repair action</span>.
        </h1>
        <p className="hero-sub">
          Image, live telemetry, and a manual excerpt go in — a structured root cause and
          specific repair action come out.
        </p>
      </div>

      <main className="dashboard">
        <section className="panel input-panel">
          <h2>Input</h2>
          <form onSubmit={handleSubmit}>
            <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="Defective part preview" className="preview-img" />
              ) : (
                <div className="dropzone-placeholder">
                  <span>📷</span>
                  <p>Upload image of defective part</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden />
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Temperature (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="e.g. 92.5"
                />
              </label>
              <label className="field">
                <span>Vibration (mm/s)</span>
                <input
                  type="number"
                  step="0.1"
                  value={vibration}
                  onChange={(e) => setVibration(e.target.value)}
                  placeholder="e.g. 6.2"
                />
              </label>
              <label className="field">
                <span>Pressure (psi)</span>
                <input
                  type="number"
                  step="0.1"
                  value={pressure}
                  onChange={(e) => setPressure(e.target.value)}
                  placeholder="e.g. 160"
                />
              </label>
            </div>

            <label className="field">
              <span>Machine manual excerpt</span>
              <textarea
                rows={6}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste the relevant section of the machine's repair manual..."
              />
            </label>

            <button type="submit" className="analyze-btn" disabled={loading}>
              {loading ? "Analyzing…" : "Run Diagnostic"}
            </button>
          </form>
        </section>

        <section className="panel output-panel glass">
          <h2>Diagnosis</h2>
          {error && <div className="error-box">{error}</div>}

          {!result && !loading && !error && (
            <div className="empty-state">
              <p>Submit an image and telemetry to generate a diagnosis.</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Running vision + telemetry + manual agent pipeline…</p>
            </div>
          )}

          {result && (
            <div className="result">
              <div className={`confidence-badge confidence-${result.confidence}`}>
                {result.confidence?.toUpperCase()} CONFIDENCE
              </div>

              <div className="result-block">
                <h3>Root Cause</h3>
                <p>{result.root_cause}</p>
              </div>

              <div className="result-block">
                <h3>Repair Action</h3>
                <p>{result.repair_action}</p>
              </div>

              {result.telemetry_flags?.length > 0 && (
                <div className="result-block">
                  <h3>Telemetry Flags</h3>
                  <ul>
                    {result.telemetry_flags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="raw-json">
                <summary>Raw JSON response</summary>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
