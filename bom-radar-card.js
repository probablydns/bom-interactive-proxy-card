const BOM_RADAR_CARD_TAG = "bom-radar-card";
const BOM_RADAR_CARD_EDITOR_TAG = "bom-radar-card-editor";
const DEFAULT_CARD_HEIGHT = 420;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value, window.location.origin);
    if (!url.pathname.endsWith("/")) {
      url.pathname += "/";
    }
    return url.toString();
  } catch (_error) {
    return "";
  }
}

function suggestedBaseUrl() {
  try {
    if (window.location.protocol !== "http:") {
      return "";
    }

    const url = new URL(window.location.href);
    url.port = "8083";
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch (_error) {
    return "";
  }
}

function normalizeText(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : "";
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeBooleanChoice(value) {
  if (value === undefined || value === null || value === "" || value === "default") {
    return null;
  }

  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["on", "true", "yes", "1"].includes(normalized)) {
    return true;
  }
  if (["off", "false", "no", "0"].includes(normalized)) {
    return false;
  }
  return null;
}

function appendTextParam(params, key, value) {
  const normalized = normalizeText(value);
  if (normalized) {
    params.set(key, normalized);
  }
}

function appendNumberParam(params, key, value) {
  const normalized = normalizeNumber(value);
  if (normalized !== null) {
    params.set(key, String(normalized));
  }
}

function appendBooleanChoiceParam(params, key, value) {
  const normalized = normalizeBooleanChoice(value);
  if (normalized === null) {
    return;
  }
  params.set(key, normalized ? "1" : "0");
}

function buildRadarUrl(config, reloadToken = "") {
  const baseUrl = normalizeBaseUrl(config.base_url || config.proxy_url);
  if (!baseUrl) {
    return "";
  }

  const url = new URL(baseUrl, window.location.origin);
  const params = new URLSearchParams(url.search);

  appendTextParam(params, "path", config.path);
  appendTextParam(params, "place", config.place);
  appendTextParam(params, "coords", config.coords);
  appendNumberParam(params, "zoom", config.zoom);
  appendNumberParam(params, "zoomStart", config.zoom_start);
  appendBooleanChoiceParam(params, "showFrameTime", config.show_frame_time);
  appendBooleanChoiceParam(params, "showZoomStatus", config.show_zoom_status);
  appendBooleanChoiceParam(params, "showTownNames", config.show_town_names);
  appendBooleanChoiceParam(params, "interactive", config.interactive);
  appendBooleanChoiceParam(params, "animate", config.animate);
  appendBooleanChoiceParam(params, "lowPower", config.low_power);
  appendNumberParam(params, "animateInterval", config.animate_interval);
  appendNumberParam(params, "frameSkip", config.frame_skip);

  const animateMode = normalizeText(config.animate_mode);
  if (animateMode === "native" || animateMode === "throttle") {
    params.set("animateMode", animateMode);
  }

  const extraQuery = normalizeText(config.extra_query);
  if (extraQuery) {
    const extraParams = new URLSearchParams(extraQuery);
    extraParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  if (reloadToken) {
    params.set("cb", reloadToken);
  }

  url.search = params.toString();
  return url.toString();
}

function buildLocationSummary(config) {
  const path = normalizeText(config.path);
  if (path) {
    return `Path: ${path}`;
  }
  const place = normalizeText(config.place);
  if (place) {
    return `Place: ${place}`;
  }
  const coords = normalizeText(config.coords);
  if (coords) {
    return `Coords: ${coords}`;
  }
  return "Proxy default location";
}

function buildModeChips(config) {
  const chips = [];
  const zoom = normalizeNumber(config.zoom);
  if (zoom !== null) {
    chips.push(`Zoom ${zoom}`);
  }

  const towns = normalizeBooleanChoice(config.show_town_names);
  if (towns !== null) {
    chips.push(towns ? "Town labels on" : "Town labels off");
  }

  const animate = normalizeBooleanChoice(config.animate);
  if (animate !== null) {
    chips.push(animate ? "Animation on" : "Animation off");
  }

  const interactive = normalizeBooleanChoice(config.interactive);
  if (interactive !== null) {
    chips.push(interactive ? "Interactive" : "Locked");
  }

  const lowPower = normalizeBooleanChoice(config.low_power);
  if (lowPower === true) {
    chips.push("Low power");
  }

  return chips;
}

function resolvedCardHeight(config) {
  const configured = normalizeNumber(config.height);
  if (configured === null) {
    return DEFAULT_CARD_HEIGHT;
  }
  return Math.max(240, Math.min(1600, configured));
}

function resolvedRefreshIntervalMs(config) {
  const minutes = normalizeNumber(config.refresh_interval);
  if (minutes === null || minutes <= 0) {
    return 0;
  }
  return Math.max(30_000, Math.round(minutes * 60_000));
}

function booleanChoiceValue(configValue) {
  if (configValue === undefined || configValue === null || configValue === "" || configValue === "default") {
    return "default";
  }
  const normalized = normalizeBooleanChoice(configValue);
  return normalized === null ? "default" : normalized ? "on" : "off";
}

function selectValue(value) {
  return value === undefined || value === null ? "" : String(value);
}

function editorTextField(label, key, value, placeholder, helpText = "") {
  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input data-key="${escapeHtml(key)}" data-kind="text" type="text" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder || "")}">
      ${helpText ? `<span class="field-help">${escapeHtml(helpText)}</span>` : ""}
    </label>
  `;
}

function editorNumberField(label, key, value, placeholder, helpText = "", min = "") {
  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input data-key="${escapeHtml(key)}" data-kind="number" type="number" value="${value ?? ""}" placeholder="${escapeHtml(placeholder || "")}" ${min !== "" ? `min="${min}"` : ""}>
      ${helpText ? `<span class="field-help">${escapeHtml(helpText)}</span>` : ""}
    </label>
  `;
}

function editorTriStateField(label, key, value, helpText = "") {
  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <select data-key="${escapeHtml(key)}" data-kind="tri-state">
        <option value="default" ${value === "default" ? "selected" : ""}>Proxy default</option>
        <option value="on" ${value === "on" ? "selected" : ""}>On</option>
        <option value="off" ${value === "off" ? "selected" : ""}>Off</option>
      </select>
      ${helpText ? `<span class="field-help">${escapeHtml(helpText)}</span>` : ""}
    </label>
  `;
}

function editorSelectField(label, key, value, options, helpText = "") {
  const optionsHtml = options
    .map(
      (option) => `
        <option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>
      `
    )
    .join("");

  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <select data-key="${escapeHtml(key)}" data-kind="select">
        ${optionsHtml}
      </select>
      ${helpText ? `<span class="field-help">${escapeHtml(helpText)}</span>` : ""}
    </label>
  `;
}

class BomRadarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._reloadToken = "";
    this._refreshTimer = null;
    this._boundReload = () => this._forceReload();
    this._boundOpen = () => this._openExternal();
  }

  setConfig(config) {
    this._config = {
      show_toolbar: true,
      ...config,
    };

    if (!this._config.base_url && this._config.proxy_url) {
      this._config.base_url = this._config.proxy_url;
    }

    this._syncRefreshTimer();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) {
      this._render();
    }
  }

  connectedCallback() {
    this._syncRefreshTimer();
    if (!this.shadowRoot.innerHTML) {
      this._render();
    }
  }

  disconnectedCallback() {
    this._clearRefreshTimer();
  }

  getCardSize() {
    return Math.ceil((resolvedCardHeight(this._config) + 60) / 50);
  }

  getGridOptions() {
    const rows = Math.max(6, Math.ceil(resolvedCardHeight(this._config) / 56));
    return {
      columns: 12,
      min_columns: 6,
      rows,
      min_rows: 5,
    };
  }

  static getConfigElement() {
    return document.createElement(BOM_RADAR_CARD_EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      title: "BOM Radar",
      base_url: suggestedBaseUrl(),
      place: "melbourne",
      zoom: 7,
      show_toolbar: true,
    };
  }

  _clearRefreshTimer() {
    if (this._refreshTimer) {
      window.clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  _syncRefreshTimer() {
    this._clearRefreshTimer();
    const intervalMs = resolvedRefreshIntervalMs(this._config);
    if (!intervalMs) {
      return;
    }
    this._refreshTimer = window.setInterval(() => this._forceReload(), intervalMs);
  }

  _forceReload() {
    this._reloadToken = Date.now().toString(36);
    this._render();
  }

  _openExternal() {
    const url = buildRadarUrl(this._config, this._reloadToken);
    if (!url) {
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  _render() {
    const title = normalizeText(this._config.title);
    const url = buildRadarUrl(this._config, this._reloadToken);
    const showToolbar = this._config.show_toolbar !== false;
    const height = resolvedCardHeight(this._config);
    const mixedContent = Boolean(url) && window.location.protocol === "https:" && url.startsWith("http://");
    const chips = [buildLocationSummary(this._config), ...buildModeChips(this._config)];
    const headerAttr = title ? ` header="${escapeHtml(title)}"` : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          overflow: hidden;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 16px 0;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          border-radius: 999px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          font-size: 12px;
          line-height: 1;
          padding: 8px 10px;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .action-button {
          appearance: none;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          font: inherit;
        }

        .action-button:hover {
          background: var(--secondary-background-color);
        }

        .message {
          margin: 0 16px;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.45;
        }

        .message.warning {
          background: rgba(255, 183, 77, 0.16);
          color: var(--primary-text-color);
          border: 1px solid rgba(255, 183, 77, 0.35);
        }

        .message.error {
          background: rgba(244, 67, 54, 0.12);
          color: var(--primary-text-color);
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .frame-shell {
          position: relative;
          height: ${height}px;
          background: #000;
          border-top: 1px solid var(--divider-color);
        }

        iframe {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
          background: #000;
        }

        .overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(12, 15, 21, 0.86), rgba(12, 15, 21, 0.7));
          color: white;
          font-size: 14px;
          letter-spacing: 0.02em;
          z-index: 1;
        }

        .empty-state {
          padding: 16px;
        }

        .empty-state strong {
          display: block;
          margin-bottom: 6px;
        }

        .empty-state code {
          white-space: nowrap;
        }

        @media (max-width: 600px) {
          .toolbar {
            flex-direction: column;
          }

          .actions {
            width: 100%;
          }

          .action-button {
            flex: 1 1 auto;
          }
        }
      </style>
      <ha-card${headerAttr}>
        <div class="card-content">
          ${showToolbar ? `
            <div class="toolbar">
              <div class="chips">
                ${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}
              </div>
              <div class="actions">
                <button class="action-button" id="reload" type="button">Reload</button>
                <button class="action-button" id="open" type="button">Open</button>
              </div>
            </div>
          ` : ""}
          ${mixedContent ? `
            <div class="message warning">
              This dashboard is running over HTTPS but the radar URL is HTTP. Browsers can block mixed-content iframes. Use an HTTPS or same-origin base URL if the card stays blank.
            </div>
          ` : ""}
          ${url ? `
            <div class="frame-shell">
              <div class="overlay" id="overlay">Loading BOM radar…</div>
              <iframe id="radarFrame" src="${escapeHtml(url)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>
          ` : `
            <div class="empty-state">
              <div class="message error">
                <strong>Card setup needed</strong>
                Set <code>base_url</code> to the BOM Interactive Proxy root, for example <code>http://homeassistant.local:8083/</code> or an HTTPS reverse-proxied URL.
              </div>
            </div>
          `}
        </div>
      </ha-card>
    `;

    const reloadButton = this.shadowRoot.getElementById("reload");
    const openButton = this.shadowRoot.getElementById("open");
    const frame = this.shadowRoot.getElementById("radarFrame");
    const overlay = this.shadowRoot.getElementById("overlay");

    if (reloadButton) {
      reloadButton.addEventListener("click", this._boundReload);
    }
    if (openButton) {
      openButton.addEventListener("click", this._boundOpen);
    }
    if (frame && overlay) {
      frame.addEventListener("load", () => {
        overlay.style.display = "none";
      }, { once: true });
      frame.addEventListener("error", () => {
        overlay.textContent = "Unable to load BOM radar";
      }, { once: true });
    }
  }
}

class BomRadarCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._boundInput = (event) => this._handleValueChanged(event);
  }

  setConfig(config) {
    this._config = {
      show_toolbar: true,
      ...config,
    };

    if (!this._config.base_url && this._config.proxy_url) {
      this._config.base_url = this._config.proxy_url;
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) {
      this._render();
    }
  }

  connectedCallback() {
    if (!this.shadowRoot.innerHTML) {
      this._render();
    }
  }

  _render() {
    const config = this._config || {};
    const previewUrl = buildRadarUrl(config);
    const suggestedUrl = suggestedBaseUrl();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--primary-text-color);
        }

        .editor {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        details {
          border: 1px solid var(--divider-color);
          border-radius: 12px;
          background: var(--card-background-color);
          overflow: hidden;
        }

        summary {
          cursor: pointer;
          padding: 14px 16px;
          font-weight: 600;
          list-style: none;
        }

        summary::-webkit-details-marker {
          display: none;
        }

        .section-body {
          padding: 0 16px 16px;
          display: grid;
          gap: 12px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .field-label {
          font-size: 13px;
          font-weight: 600;
        }

        .field-help {
          font-size: 12px;
          color: var(--secondary-text-color);
          line-height: 1.45;
        }

        input,
        select {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--divider-color);
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }

        .checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .checkbox input {
          width: auto;
          margin: 0;
        }

        .note {
          border-radius: 12px;
          padding: 12px 14px;
          background: rgba(3, 169, 244, 0.1);
          border: 1px solid rgba(3, 169, 244, 0.25);
          line-height: 1.5;
          font-size: 13px;
        }

        .preview {
          border-radius: 12px;
          padding: 12px 14px;
          background: var(--secondary-background-color);
          border: 1px solid var(--divider-color);
          font-size: 12px;
          line-height: 1.5;
          word-break: break-all;
        }
      </style>
      <div class="editor">
        <div class="note">
          Use a stable proxy root for <code>base_url</code>, such as <code>http://homeassistant.local:8083/</code> or an HTTPS reverse proxy. Hardcoded Home Assistant ingress session URLs are not ideal for long-lived dashboards.
        </div>

        <details open>
          <summary>Connection</summary>
          <div class="section-body">
            ${editorTextField("Title", "title", config.title, "BOM Radar", "Optional card header.")}
            ${editorTextField("Base URL", "base_url", config.base_url, suggestedUrl || "http://homeassistant.local:8083/", "Root URL of BOM Interactive Proxy, not a /location/... page.")}
            ${editorNumberField("Card height", "height", config.height, String(DEFAULT_CARD_HEIGHT), "Card body height in pixels.", 240)}
            <label class="checkbox">
              <input data-key="show_toolbar" data-kind="checkbox" type="checkbox" ${config.show_toolbar !== false ? "checked" : ""}>
              <span>Show toolbar with reload/open buttons</span>
            </label>
            ${editorNumberField("Auto-refresh interval", "refresh_interval", config.refresh_interval, "0", "Minutes between forced iframe reloads. Leave blank or 0 to disable.", 0)}
          </div>
        </details>

        <details open>
          <summary>Location</summary>
          <div class="section-body">
            ${editorTextField("Place", "place", config.place, "melbourne", "Human-friendly place lookup.")}
            ${editorTextField("Path", "path", config.path, "australia/victoria/central/bvic_pt042-melbourne", "Most specific option. If set, the proxy will use it instead of place/coords.")}
            ${editorTextField("Coords", "coords", config.coords, "-37.8136,144.9631", "Latitude and longitude lookup.")}
          </div>
        </details>

        <details open>
          <summary>View</summary>
          <div class="section-body">
            ${editorNumberField("Zoom", "zoom", config.zoom, "7", "Target zoom level.", 0)}
            ${editorNumberField("Zoom start", "zoom_start", config.zoom_start, "5", "Optional initial zoom stage before final zoom.", 0)}
            ${editorTriStateField("Show frame time", "show_frame_time", booleanChoiceValue(config.show_frame_time))}
            ${editorTriStateField("Show zoom status", "show_zoom_status", booleanChoiceValue(config.show_zoom_status))}
            ${editorTriStateField("Show town names", "show_town_names", booleanChoiceValue(config.show_town_names))}
            ${editorTriStateField("Interactive", "interactive", booleanChoiceValue(config.interactive), "Controls drag/pan behavior.")}
          </div>
        </details>

        <details open>
          <summary>Animation</summary>
          <div class="section-body">
            ${editorTriStateField("Animate", "animate", booleanChoiceValue(config.animate))}
            ${editorSelectField("Animate mode", "animate_mode", selectValue(config.animate_mode), [
              { value: "", label: "Proxy default" },
              { value: "native", label: "Native" },
              { value: "throttle", label: "Throttle" },
            ], "Throttle mode steps frames at a fixed interval.")}
            ${editorNumberField("Animate interval", "animate_interval", config.animate_interval, "2000", "Milliseconds between throttle steps.", 500)}
            ${editorNumberField("Frame skip", "frame_skip", config.frame_skip, "1", "Frames advanced per throttle tick.", 1)}
            ${editorTriStateField("Low power", "low_power", booleanChoiceValue(config.low_power), "Lets the proxy reduce animation and overlay work.")}
          </div>
        </details>

        <details>
          <summary>Advanced</summary>
          <div class="section-body">
            ${editorTextField("Extra query", "extra_query", config.extra_query, "cleanup=1&cb=my-debug-token", "Optional raw query string appended to the generated URL.")}
          </div>
        </details>

        <div class="preview">
          <strong>Preview URL</strong><br>
          ${previewUrl ? escapeHtml(previewUrl) : "Set base_url to generate a preview URL."}
        </div>
      </div>
    `;

    this.shadowRoot.removeEventListener("input", this._boundInput);
    this.shadowRoot.removeEventListener("change", this._boundInput);
    this.shadowRoot.addEventListener("input", this._boundInput);
    this.shadowRoot.addEventListener("change", this._boundInput);
  }

  _handleValueChanged(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.key) {
      return;
    }

    const key = target.dataset.key;
    const kind = target.dataset.kind || "text";
    const nextConfig = { ...this._config };

    if (kind === "checkbox") {
      nextConfig[key] = Boolean(target.checked);
    } else if (kind === "number") {
      const value = normalizeNumber(target.value);
      if (value === null) {
        delete nextConfig[key];
      } else {
        nextConfig[key] = value;
      }
    } else if (kind === "tri-state") {
      const value = String(target.value || "default");
      if (value === "default") {
        delete nextConfig[key];
      } else {
        nextConfig[key] = value;
      }
    } else if (kind === "select") {
      const value = normalizeText(target.value);
      if (value) {
        nextConfig[key] = value;
      } else {
        delete nextConfig[key];
      }
    } else {
      const value = normalizeText(target.value);
      if (value) {
        nextConfig[key] = value;
      } else {
        delete nextConfig[key];
      }
    }

    this._config = nextConfig;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: nextConfig },
      bubbles: true,
      composed: true,
    }));
    this._render();
  }
}

if (!customElements.get(BOM_RADAR_CARD_TAG)) {
  customElements.define(BOM_RADAR_CARD_TAG, BomRadarCard);
}

if (!customElements.get(BOM_RADAR_CARD_EDITOR_TAG)) {
  customElements.define(BOM_RADAR_CARD_EDITOR_TAG, BomRadarCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === BOM_RADAR_CARD_TAG)) {
  window.customCards.push({
    type: BOM_RADAR_CARD_TAG,
    name: "BOM Interactive Proxy Card",
    description: "Dashboard card for BOM Interactive Proxy radar maps with location, zoom, labels, animation, and refresh controls.",
    preview: true,
  });
}
