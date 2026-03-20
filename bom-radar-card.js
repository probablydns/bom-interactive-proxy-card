const BOM_RADAR_CARD_TAG = "bom-radar-card";
const BOM_RADAR_CARD_EDITOR_TAG = "bom-radar-card-editor";
const DEFAULT_CARD_HEIGHT = 420;
const DEFAULT_ADDON_ID = "13fa7b7e_bom_interactive_proxy";
const FALLBACK_ADDON_SLUG = "bom_interactive_proxy";
const DEFAULT_PANEL_PATH = "/app/13fa7b7e_bom_interactive_proxy/";

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

function configuredBaseUrl(config) {
  return normalizeBaseUrl(config.base_url || config.proxy_url);
}

function defaultPanelBaseUrl(config) {
  const configuredIngressPath = normalizeText(config.ingress_path || config.panel_path);
  return normalizeBaseUrl(configuredIngressPath || DEFAULT_PANEL_PATH);
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

function buildRadarUrl(config, reloadToken = "", baseUrlOverride = "") {
  const baseUrl = normalizeBaseUrl(baseUrlOverride || config.base_url || config.proxy_url);
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

function extractAddonIdFromPanelPath(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  try {
    const url = new URL(normalized, window.location.origin);
    const match = url.pathname.match(/^\/app\/([^/]+)/);
    return match && match[1] ? match[1] : "";
  } catch (_error) {
    return "";
  }
}

function addonSlugs(config) {
  const candidates = [
    normalizeText(config.addon_slug),
    extractAddonIdFromPanelPath(config.panel_path || config.ingress_path),
    extractAddonIdFromPanelPath(DEFAULT_PANEL_PATH),
    DEFAULT_ADDON_ID,
    FALLBACK_ADDON_SLUG,
  ];

  const expanded = [];
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (!normalized) {
      continue;
    }

    expanded.push(normalized);

    if (normalized.endsWith(`_${FALLBACK_ADDON_SLUG}`)) {
      expanded.push(FALLBACK_ADDON_SLUG);
    }
  }

  return Array.from(new Set(expanded));
}

function unpackApiPayload(payload) {
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload && typeof payload === "object" ? payload : {};
}

function extractIngressBaseUrl(payload) {
  const info = unpackApiPayload(payload);
  if (!info || (!info.ingress && !info.ingress_panel)) {
    return "";
  }

  return normalizeBaseUrl(info.ingress_url || info.ingress_entry);
}

function isRawIngressBaseUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return /^\/api\/hassio_ingress\/[^/]+\/?$/.test(url.pathname);
  } catch (_error) {
    return false;
  }
}

async function fetchAddonInfo(hass, slugCandidates) {
  if (!hass) {
    return null;
  }

  const candidates = Array.isArray(slugCandidates) ? slugCandidates : [slugCandidates];
  for (const slug of candidates) {
    if (!slug) {
      continue;
    }

    const endpoints = [
      `/addons/${encodeURIComponent(slug)}/info`,
    ];

    for (const endpoint of endpoints) {
      try {
        const payload = await callSupervisorApi(hass, endpoint, "get");
        if (payload) {
          return payload;
        }
      } catch (_error) {
        // Try the next endpoint or candidate slug.
      }
    }
  }

  return null;
}

async function callSupervisorApi(hass, endpoint, method = "get", data = undefined) {
  if (!hass) {
    return null;
  }

  if (hass.connection && typeof hass.connection.sendMessagePromise === "function") {
    const message = {
      type: "supervisor/api",
      endpoint,
      method,
    };

    if (data && typeof data === "object") {
      message.data = data;
    }

    return await hass.connection.sendMessagePromise(message);
  }

  if (typeof hass.callApi === "function") {
    const path = `hassio/${String(endpoint || "").replace(/^\/+/, "")}`;
    return await hass.callApi(method.toUpperCase(), path, data);
  }

  return null;
}

function writeIngressSessionCookie(session) {
  const normalized = normalizeText(session);
  if (!normalized || typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `ingress_session=${encodeURIComponent(normalized)}; path=/; SameSite=Lax${secure}`;
}

async function ensureIngressSession(hass) {
  const payload = await callSupervisorApi(hass, "/ingress/session", "post");
  const info = unpackApiPayload(payload);
  const session = normalizeText(info.session);
  if (session) {
    writeIngressSessionCookie(session);
  }
  return session;
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
    this._resolvedBaseUrl = "";
    this._resolvingIngress = false;
    this._ingressResolved = false;
    this._ingressRequestId = 0;
  }

  setConfig(config) {
    this._config = { ...config };

    if (!this._config.base_url && this._config.proxy_url) {
      this._config.base_url = this._config.proxy_url;
    }

    this._ingressRequestId += 1;
    this._resolvingIngress = false;
    this._resolvedBaseUrl = configuredBaseUrl(this._config);
    this._ingressResolved = Boolean(this._resolvedBaseUrl);
    this._syncRefreshTimer();
    this._ensureResolvedBaseUrl();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._ensureResolvedBaseUrl();
    if (!this.shadowRoot.innerHTML) {
      this._render();
    }
  }

  connectedCallback() {
    this._syncRefreshTimer();
    this._ensureResolvedBaseUrl();
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
      base_url: "",
      place: "melbourne",
      zoom: 7,
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

  async _ensureResolvedBaseUrl() {
    const configured = configuredBaseUrl(this._config);
    if (configured) {
      this._resolvedBaseUrl = configured;
      this._ingressResolved = true;
      this._resolvingIngress = false;
      return;
    }

    if (this._ingressResolved || this._resolvingIngress || !this._hass) {
      return;
    }

    const requestId = ++this._ingressRequestId;
    this._resolvingIngress = true;
    this._render();

    await ensureIngressSession(this._hass);
    const payload = await fetchAddonInfo(this._hass, addonSlugs(this._config));
    if (requestId !== this._ingressRequestId) {
      return;
    }

    this._resolvedBaseUrl = extractIngressBaseUrl(payload) || defaultPanelBaseUrl(this._config);
    this._ingressResolved = true;
    this._resolvingIngress = false;
    this._render();
  }

  _render() {
    const title = normalizeText(this._config.title);
    const url = buildRadarUrl(this._config, this._reloadToken, this._resolvedBaseUrl);
    const height = resolvedCardHeight(this._config);
    const mixedContent = Boolean(url) && window.location.protocol === "https:" && url.startsWith("http://");
    const waitingForIngress = !url && this._resolvingIngress;
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
          padding-top: 16px;
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
      </style>
      <ha-card${headerAttr}>
        <div class="card-content">
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
                ${waitingForIngress
                  ? "Checking BOM Interactive Proxy ingress..."
                  : "Set <code>base_url</code> to the BOM Interactive Proxy root, for example <code>http://homeassistant.local:8083/</code>, or enable add-on ingress and leave <code>base_url</code> blank."}
              </div>
            </div>
          `}
        </div>
      </ha-card>
    `;

    const frame = this.shadowRoot.getElementById("radarFrame");
    const overlay = this.shadowRoot.getElementById("overlay");

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
    this._resolvedBaseUrl = "";
    this._resolvingIngress = false;
    this._ingressResolved = false;
    this._ingressRequestId = 0;
    this._boundChange = (event) => this._handleValueChanged(event);
  }

  setConfig(config) {
    this._config = { ...config };

    if (!this._config.base_url && this._config.proxy_url) {
      this._config.base_url = this._config.proxy_url;
    }

    this._ingressRequestId += 1;
    this._resolvingIngress = false;
    this._resolvedBaseUrl = configuredBaseUrl(this._config);
    this._ingressResolved = Boolean(this._resolvedBaseUrl);
    this._ensureResolvedBaseUrl();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._ensureResolvedBaseUrl();
    if (!this.shadowRoot.innerHTML) {
      this._render();
    }
  }

  connectedCallback() {
    this._ensureResolvedBaseUrl();
    if (!this.shadowRoot.innerHTML) {
      this._render();
    }
  }

  async _ensureResolvedBaseUrl() {
    const configured = configuredBaseUrl(this._config);
    if (configured) {
      this._resolvedBaseUrl = configured;
      this._ingressResolved = true;
      this._resolvingIngress = false;
      return;
    }

    if (this._ingressResolved || this._resolvingIngress || !this._hass) {
      return;
    }

    const requestId = ++this._ingressRequestId;
    this._resolvingIngress = true;
    this._render();

    await ensureIngressSession(this._hass);
    const payload = await fetchAddonInfo(this._hass, addonSlugs(this._config));
    if (requestId !== this._ingressRequestId) {
      return;
    }

    this._resolvedBaseUrl = extractIngressBaseUrl(payload) || defaultPanelBaseUrl(this._config);
    this._ingressResolved = true;
    this._resolvingIngress = false;
    this._render();
  }

  _render() {
    const config = this._config || {};
    const previewUrl = buildRadarUrl(config, "", this._resolvedBaseUrl);
    const baseUrlHelp = this._resolvedBaseUrl && !configuredBaseUrl(config)
      ? isRawIngressBaseUrl(this._resolvedBaseUrl)
        ? `Blank resolves the live add-on ingress endpoint automatically: ${this._resolvedBaseUrl}`
        : `Blank fell back to the Home Assistant panel path: ${this._resolvedBaseUrl}`
      : "Leave blank to use add-on ingress automatically. The card prefers /api/hassio_ingress/... so the iframe stays free of Home Assistant chrome.";

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
          Leave <code>base_url</code> blank to use the BOM Interactive Proxy add-on ingress automatically. The card prefers the raw <code>/api/hassio_ingress/...</code> endpoint so the embedded frame does not show the Home Assistant hamburger/header. If you need direct access instead, use a stable proxy root such as <code>http://homeassistant.local:8083/</code> or an HTTPS reverse proxy.
        </div>

        <details open>
          <summary>Connection</summary>
          <div class="section-body">
            ${editorTextField("Title", "title", config.title, "BOM Radar", "Optional card header.")}
            ${editorTextField("Base URL", "base_url", config.base_url, "http://homeassistant.local:8083/ or https://weather.example.com/", `Root URL of BOM Interactive Proxy, not a /location/... page. ${baseUrlHelp}`)}
            ${editorNumberField("Card height", "height", config.height, String(DEFAULT_CARD_HEIGHT), "Card body height in pixels.", 240)}
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
            ${editorTextField("Add-on ID", "addon_slug", config.addon_slug, DEFAULT_ADDON_ID, "Home Assistant add-on identifier used for Supervisor ingress lookup. Change this only if you installed the add-on from a fork or a local repo with a different prefix.")}
            ${editorTextField("Extra query", "extra_query", config.extra_query, "cleanup=1&cb=my-debug-token", "Optional raw query string appended to the generated URL.")}
          </div>
        </details>

        <div class="preview">
          <strong>Preview URL</strong><br>
          ${previewUrl
            ? escapeHtml(previewUrl)
            : this._resolvingIngress
              ? "Checking BOM Interactive Proxy ingress..."
              : "Set base_url or enable add-on ingress to generate a preview URL."}
        </div>
      </div>
    `;

    this.shadowRoot.removeEventListener("change", this._boundChange);
    this.shadowRoot.addEventListener("change", this._boundChange);
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
    this._ingressRequestId += 1;
    this._resolvingIngress = false;
    this._resolvedBaseUrl = configuredBaseUrl(nextConfig);
    this._ingressResolved = Boolean(this._resolvedBaseUrl);
    if (!this._resolvedBaseUrl) {
      this._ensureResolvedBaseUrl();
    }
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
    description: "Dashboard card for BOM Interactive Proxy radar maps with location, zoom, labels, animation, and ingress support.",
    preview: true,
  });
}
