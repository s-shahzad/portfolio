const DATA_ROOT = "/public/nids-data";

const els = {
  heroSnapshot: document.getElementById("heroSnapshot"),
  metricsGrid: document.getElementById("metricsGrid"),
  engineChart: document.getElementById("engineChart"),
  alertsTableBody: document.getElementById("alertsTableBody"),
  explanationSummary: document.getElementById("explanationSummary"),
  markdownContent: document.getElementById("markdownContent"),
  metadataGrid: document.getElementById("metadataGrid"),
};

function setLoading() {
  els.heroSnapshot.innerHTML = '<p class="is-loading">Loading exported NIDS bundle...</p>';
  els.metricsGrid.innerHTML = '<p class="is-loading">Loading metrics...</p>';
  els.engineChart.innerHTML = '<p class="is-loading">Loading chart...</p>';
  els.alertsTableBody.innerHTML = '<tr><td class="is-loading" colspan="6">Loading alert sample...</td></tr>';
  els.explanationSummary.innerHTML = '<p class="is-loading">Loading explanation...</p>';
  els.markdownContent.innerHTML = '<p class="is-loading">Loading case study summary...</p>';
  els.metadataGrid.innerHTML = '<p class="is-loading">Loading bundle metadata...</p>';
}

function setError(message) {
  els.heroSnapshot.innerHTML = `<p class="is-error">${message}</p>`;
  els.metricsGrid.innerHTML = `<p class="is-error">${message}</p>`;
  els.engineChart.innerHTML = `<p class="is-error">${message}</p>`;
  els.alertsTableBody.innerHTML = `<tr><td class="is-error" colspan="6">${message}</td></tr>`;
  els.explanationSummary.innerHTML = `<p class="is-error">${message}</p>`;
  els.markdownContent.innerHTML = `<p class="is-error">${message}</p>`;
  els.metadataGrid.innerHTML = `<p class="is-error">${message}</p>`;
}

async function loadJson(filename) {
  const response = await fetch(`${DATA_ROOT}/${filename}`, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}.`);
  }
  return response.json();
}

async function loadMarkdown(filename) {
  const response = await fetch(`${DATA_ROOT}/${filename}`, { headers: { Accept: "text/markdown" } });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}.`);
  }
  return response.text();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatPercent(value, digits = 2) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function buildMetricCard(label, value, note) {
  return `
    <article class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-note">${note}</div>
    </article>
  `;
}

function renderHero(summary) {
  const current = summary.baseline_comparison?.current || {};
  const lines = [
    ["Run", summary.run_name],
    ["Status", summary.status],
    ["Flows", formatNumber(current.flows || summary.flows)],
    ["Alerts", formatNumber(current.alerts || summary.alerts)],
    ["Baseline match", summary.baseline_comparison?.matches_validated_result ? "Yes" : "No"],
    ["Generated", summary.generated_at.replace("T", " ").replace("Z", " UTC")],
  ];

  els.heroSnapshot.innerHTML = lines
    .map(
      ([label, value]) => `
        <div class="snapshot-line">
          <span class="snapshot-label">${label}</span>
          <span class="snapshot-value">${value}</span>
        </div>
      `
    )
    .join("");
}

function renderMetrics(summary) {
  const baseline = summary.baseline_comparison?.validated_baseline || {};
  const current = summary.baseline_comparison?.current || {};
  const alertRatio = Number(current.alert_ratio || 0);
  const reduction = 1 - alertRatio;

  els.metricsGrid.innerHTML = [
    buildMetricCard("Flows", formatNumber(current.flows || summary.flows), "Observed traffic units in the validated replay."),
    buildMetricCard("Alerts", formatNumber(current.alerts || summary.alerts), "Curated review queue after hybrid scoring."),
    buildMetricCard("Alert Ratio", formatPercent(alertRatio), "A small signal rate relative to total flow volume."),
    buildMetricCard(
      "Reduction %",
      formatPercent(reduction),
      `Compared with the full flow set. Fusion confirmation target: ${baseline.fusion_min_agreement_count || 0} agreeing signals.`
    ),
  ].join("");
}

function renderChart(metrics) {
  const entries = Object.entries(metrics.engine_distribution || {});
  const maxValue = Math.max(...entries.map(([, value]) => Number(value)), 1);

  els.engineChart.innerHTML = entries
    .map(
      ([label, value]) => `
        <div class="bar-row">
          <div class="bar-label">${label}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${(Number(value) / maxValue) * 100}%"></div>
          </div>
          <div class="bar-value">${formatNumber(value)}</div>
        </div>
      `
    )
    .join("");
}

function severityClass(value) {
  const token = String(value || "").toLowerCase();
  if (token === "critical") return "severity-critical";
  if (token === "high") return "severity-high";
  if (token === "medium") return "severity-medium";
  return "severity-low";
}

function renderAlerts(alertsPayload) {
  els.alertsTableBody.innerHTML = (alertsPayload.alerts || [])
    .map(
      (alert) => `
        <tr>
          <td>${alert.timestamp || ""}</td>
          <td><span class="severity-badge ${severityClass(alert.severity)}">${alert.severity || "unknown"}</span></td>
          <td>${alert.engine || ""}</td>
          <td>${alert.rule_name || ""}</td>
          <td>${alert.summary || ""}</td>
          <td>${alert.evidence_reference || "Sanitized"}</td>
        </tr>
      `
    )
    .join("");
}

function renderExplanation(summary, metrics, markdown) {
  const matched = summary.baseline_comparison?.matches_validated_result ? "matched" : "did not match";
  const topEngine = Object.entries(metrics.engine_distribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "fusion";
  const topSeverity = Object.entries(metrics.severity_distribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "high";

  els.explanationSummary.innerHTML = `
    <h3>Plain-Language Readout</h3>
    <p>
      This exported run ${matched} the validated baseline and concentrated review into ${formatNumber(summary.alerts)} alerts across ${formatNumber(summary.flows)} flows.
      The strongest signal source in this bundle was <strong>${topEngine}</strong>, while the dominant severity tier was <strong>${topSeverity}</strong>.
    </p>
    <p>
      In recruiter terms: this project is about reducing noise, preserving analyst context, and showing that model-assisted security work can stay bounded and explainable.
    </p>
  `;

  els.markdownContent.innerHTML = markdownToHtml(markdown);
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const parts = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      parts.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      parts.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      parts.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    parts.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return parts.join("");
}

function inlineMarkdown(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMetadata(summary, metrics, alertsPayload) {
  const items = [
    ["Bundle Generated", summary.generated_at.replace("T", " ").replace("Z", " UTC")],
    ["Run Name", summary.run_name],
    ["Sample Alerts", formatNumber(alertsPayload.count || 0)],
    ["Report Included", summary.report_available ? "Yes" : "No"],
    ["Visuals Included", summary.visuals_available ? "Yes" : "No"],
    ["Baseline Match", summary.baseline_comparison?.matches_validated_result ? "Validated" : "Changed"],
    ["ML Confirmation Hits", formatNumber(metrics.baseline_comparison?.validated_baseline?.ml_unsupervised_confirmation_hits || 0)],
    ["Fusion Agreement", formatNumber(metrics.baseline_comparison?.validated_baseline?.fusion_min_agreement_count || 0)],
  ];

  els.metadataGrid.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="meta-card">
          <h3>${label}</h3>
          <div class="metadata-value">${value}</div>
        </article>
      `
    )
    .join("");
}

async function main() {
  setLoading();
  try {
    const [summary, metrics, alertsPayload, markdown] = await Promise.all([
      loadJson("nids-summary.json"),
      loadJson("nids-metrics.json"),
      loadJson("nids-alerts-sample.json"),
      loadMarkdown("nids-case-study-summary.md"),
    ]);

    renderHero(summary);
    renderMetrics(summary);
    renderChart(metrics);
    renderAlerts(alertsPayload);
    renderExplanation(summary, metrics, markdown);
    renderMetadata(summary, metrics, alertsPayload);
  } catch (error) {
    setError(error.message || "Failed to load static NIDS bundle.");
  }
}

main();
