const state = {
  commanderRows: [],
  partnerCommanderRows: [],
  deckPayload: null,
  optimizedPayload: null,
  cardLookup: {},
  comboIndex: {},
  cardSize: 150,
  sparkleHandle: null,
  sparkleResizeHandle: null,
  confettiLastBurstAt: 0,
  radarMeta: null,
  radarDragRole: null,
  radarEventsBound: false,
  generateOverlayTimer: null,
  generateOverlayFrame: 0,
  auth: null,
  coinPackages: [],
};

const UI_STORAGE_KEY = "mtgdeck_ui_settings_v1";
const AUTH_STORAGE_KEY = "mtgdeck_auth_v1";
const TOAST_LIFETIME_MS = 2600;
const ROLE_SCHEMAS = [
  { key: "land", label: "Lands", min: 12, defaults: { historicbrawl: 37, brawl: 23 } },
  { key: "ramp", label: "Ramp", min: 0, defaults: { historicbrawl: 11, brawl: 7 } },
  { key: "draw", label: "Draw", min: 0, defaults: { historicbrawl: 9, brawl: 5 } },
  { key: "removal", label: "Removal", min: 0, defaults: { historicbrawl: 10, brawl: 7 } },
  { key: "sweeper", label: "Sweepers", min: 0, defaults: { historicbrawl: 4, brawl: 2 } },
  { key: "finisher", label: "Finishers", min: 0, defaults: { historicbrawl: 6, brawl: 4 } },
  { key: "combo_piece", label: "Combo Pieces", min: 0, defaults: { historicbrawl: 4, brawl: 2 } },
  { key: "creature", label: "Creatures", min: 0, defaults: { historicbrawl: 8, brawl: 5 } },
  { key: "tutor", label: "Tutors", min: 0, defaults: { historicbrawl: 3, brawl: 2 } },
  { key: "countermagic", label: "Counters", min: 0, defaults: { historicbrawl: 4, brawl: 2 } },
  { key: "recursion", label: "Recursion", min: 0, defaults: { historicbrawl: 3, brawl: 1 } },
  { key: "protection", label: "Protection", min: 0, defaults: { historicbrawl: 2, brawl: 1 } },
  { key: "token_engine", label: "Token Engine", min: 0, defaults: { historicbrawl: 3, brawl: 2 } },
  { key: "graveyard_hate", label: "GY Hate", min: 0, defaults: { historicbrawl: 2, brawl: 1 } },
];
const ROLE_KEYS = ROLE_SCHEMAS.map((role) => role.key);
const ROLE_LABELS = Object.fromEntries(ROLE_SCHEMAS.map((role) => [role.key, role.label]));
const ROLE_ABBREVIATIONS = {
  land: "L",
  ramp: "R",
  draw: "D",
  removal: "X",
  sweeper: "SW",
  finisher: "F",
  combo_piece: "C",
  creature: "CR",
  tutor: "TU",
  countermagic: "CT",
  recursion: "RE",
  protection: "PR",
  token_engine: "TK",
  graveyard_hate: "GY",
};
const ROLE_PRESETS = {
  historicbrawl: {
    balanced: { land: 37, ramp: 11, draw: 9, removal: 10, sweeper: 4, finisher: 6, combo_piece: 4, creature: 8, tutor: 3, countermagic: 4, recursion: 3, protection: 2, token_engine: 3, graveyard_hate: 2 },
    control: { land: 39, ramp: 9, draw: 12, removal: 14, sweeper: 7, finisher: 4, combo_piece: 3, creature: 4, tutor: 4, countermagic: 10, recursion: 4, protection: 3, token_engine: 2, graveyard_hate: 4 },
    combo: { land: 35, ramp: 11, draw: 12, removal: 7, sweeper: 3, finisher: 7, combo_piece: 14, creature: 8, tutor: 8, countermagic: 4, recursion: 7, protection: 4, token_engine: 3, graveyard_hate: 2 },
    midrange: { land: 37, ramp: 10, draw: 8, removal: 10, sweeper: 4, finisher: 10, combo_piece: 5, creature: 15, tutor: 3, countermagic: 3, recursion: 4, protection: 3, token_engine: 4, graveyard_hate: 2 },
    aggro: { land: 34, ramp: 8, draw: 6, removal: 9, sweeper: 1, finisher: 15, combo_piece: 3, creature: 24, tutor: 2, countermagic: 1, recursion: 2, protection: 5, token_engine: 8, graveyard_hate: 1 },
  },
  brawl: {
    balanced: { land: 23, ramp: 7, draw: 5, removal: 7, sweeper: 2, finisher: 4, combo_piece: 2, creature: 5, tutor: 2, countermagic: 2, recursion: 1, protection: 1, token_engine: 2, graveyard_hate: 1 },
    control: { land: 24, ramp: 6, draw: 8, removal: 10, sweeper: 4, finisher: 3, combo_piece: 1, creature: 3, tutor: 2, countermagic: 7, recursion: 2, protection: 2, token_engine: 1, graveyard_hate: 2 },
    combo: { land: 22, ramp: 7, draw: 8, removal: 5, sweeper: 2, finisher: 5, combo_piece: 9, creature: 4, tutor: 5, countermagic: 3, recursion: 4, protection: 2, token_engine: 2, graveyard_hate: 1 },
    midrange: { land: 23, ramp: 7, draw: 5, removal: 7, sweeper: 2, finisher: 7, combo_piece: 3, creature: 9, tutor: 2, countermagic: 2, recursion: 2, protection: 2, token_engine: 3, graveyard_hate: 1 },
    aggro: { land: 21, ramp: 6, draw: 4, removal: 6, sweeper: 1, finisher: 10, combo_piece: 2, creature: 14, tutor: 1, countermagic: 1, recursion: 1, protection: 4, token_engine: 5, graveyard_hate: 1 },
  },
};

function byId(id) {
  return document.getElementById(id);
}

function text(value) {
  return value == null ? "" : String(value);
}

function normalizeName(value) {
  return text(value).trim().toLowerCase();
}

function readJsonStorage(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readUiSettings() {
  return readJsonStorage(UI_STORAGE_KEY, {
    theme: "neon",
    motion: 86,
    api_base: "",
    ui_scale: 100,
    card_size: 150,
    confetti: "subtle",
    density: "normal",
    role_scale: "full",
  });
}

function writeUiSettings(next) {
  writeJsonStorage(UI_STORAGE_KEY, next);
}

function readAuthState() {
  return readJsonStorage(AUTH_STORAGE_KEY, {});
}

function writeAuthState(value) {
  writeJsonStorage(AUTH_STORAGE_KEY, value || {});
}

function authToken() {
  return state.auth?.token || "";
}

function currentApiBaseUrl() {
  const ui = readUiSettings();
  const liveField = byId("apiBaseUrl");
  const raw = (liveField?.value || ui.api_base || "").trim();
  return raw.replace(/\/$/, "");
}

function resolveApiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = currentApiBaseUrl();
  if (!base) {
    return path;
  }
  return `${base}${path}`;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken()) {
    headers.set("Authorization", `Bearer ${authToken()}`);
  }
  const response = await fetch(resolveApiUrl(path), { ...options, headers });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || data.hint || `Request failed (${response.status})`);
  }
  return data;
}

function fallbackImage(name) {
  const label = encodeURIComponent(name || "Card");
  return (
    "data:image/svg+xml;utf8," +
    `<svg xmlns='http://www.w3.org/2000/svg' width='630' height='880'>` +
    `<rect width='100%' height='100%' fill='%23e9e3d8'/>` +
    `<rect x='14' y='14' width='602' height='852' fill='none' stroke='%236a7a88' stroke-opacity='0.45'/>` +
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%233f5163' font-size='30' font-family='Arial'>${label}</text>` +
    `</svg>`
  );
}

function imageUrl(card) {
  const raw = card?.image_uri;
  if (!raw) {
    return fallbackImage(card?.name);
  }
  if (raw.includes("/small/")) {
    return raw.replace("/small/", "/normal/");
  }
  return raw;
}

function score(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(1);
}

function formatRank(rank) {
  if (!rank || rank <= 0) {
    return "-";
  }
  return `#${rank.toLocaleString()}`;
}

function roleDefaultsForFormat(format) {
  const key = format === "brawl" ? "brawl" : "historicbrawl";
  return Object.fromEntries(
    ROLE_SCHEMAS.map((role) => [role.key, role.defaults[key] ?? 0])
  );
}

function currentMainboardSize() {
  const totalDeckSize = byId("format").value === "brawl" ? 60 : 100;
  return Math.max(totalDeckSize - selectedCommanderCount(), 1);
}

function roleInputId(key) {
  return `targetRole_${key}`;
}

function roleOutputId(key) {
  return `targetRole_${key}_value`;
}

function roleKeys() {
  return ROLE_KEYS;
}

function roleMin(key) {
  return ROLE_SCHEMAS.find((role) => role.key === key)?.min ?? 0;
}

function roleScaleMode() {
  return byId("roleScaleMode")?.value || "full";
}

function radarDisplayCap(format, budget) {
  if (roleScaleMode() !== "zoom") {
    return budget;
  }
  const factor = format === "brawl" ? 0.44 : 0.36;
  return Math.max(18, Math.min(budget, Math.round(budget * factor)));
}

function roleSliderMax(key, format, budget) {
  return budget;
}

function roleLabel(key) {
  return ROLE_LABELS[key] || key.replace(/_/g, " ");
}

function roleAbbreviation(key) {
  return ROLE_ABBREVIATIONS[key] || key.slice(0, 2).toUpperCase();
}

function confettiMode() {
  return byId("confettiMode")?.value || "subtle";
}

function selectedCommanderData() {
  const selected = byId("commanderSelect").value;
  return state.commanderRows.find((row) => row.name === selected) || null;
}

function hasPartnerSelection() {
  return Boolean(byId("partnerCommanderSelect")?.value);
}

function selectedPartnerCommanderData() {
  const selected = byId("partnerCommanderSelect")?.value;
  if (!selected) {
    return null;
  }
  return (
    state.partnerCommanderRows.find((row) => row.name === selected) ||
    state.commanderRows.find((row) => row.name === selected) ||
    null
  );
}

function selectedCommanderPair() {
  const commanders = [];
  const primary = selectedCommanderData();
  if (primary) {
    commanders.push(primary);
  }
  const partner = selectedPartnerCommanderData();
  if (partner) {
    commanders.push(partner);
  }
  return commanders;
}

function selectedCommanderCount() {
  return selectedCommanderPair().length || 1;
}

function cardKeywords(card) {
  return new Set((card?.keywords || []).map((keyword) => text(keyword).trim().toLowerCase()).filter(Boolean));
}

function cardText(card) {
  return `${text(card?.oracle_text)} ${text(card?.type_line)}`.toLowerCase();
}

function hasKeyword(card, keyword) {
  return cardKeywords(card).has(keyword.toLowerCase());
}

function partnerWithTarget(card) {
  const match = cardText(card).match(/partner with ([^.(\n]+)/i);
  return match?.[1]?.trim()?.toLowerCase() || "";
}

function hasPartnerAbility(card) {
  const textBlob = cardText(card);
  return hasKeyword(card, "partner") || textBlob.includes("partner (") || textBlob.includes("partner with ");
}

function hasFriendsForever(card) {
  const textBlob = cardText(card);
  return hasKeyword(card, "friends forever") || hasKeyword(card, "friends") || textBlob.includes("friends forever");
}

function hasChooseBackground(card) {
  const textBlob = cardText(card);
  return hasKeyword(card, "choose a background") || textBlob.includes("choose a background");
}

function hasDoctorsCompanion(card) {
  const textBlob = cardText(card);
  return hasKeyword(card, "doctor's companion") || textBlob.includes("doctor's companion");
}

function isBackgroundCard(card) {
  return cardText(card).includes("background");
}

function isDoctorCard(card) {
  return cardText(card).includes("doctor");
}

function legalPartnerPair(primary, partner) {
  if (!primary || !partner) {
    return false;
  }
  if (normalizeName(primary.name) === normalizeName(partner.name)) {
    return false;
  }
  const primaryName = normalizeName(primary.name);
  const partnerName = normalizeName(partner.name);
  const primaryPartnerWith = partnerWithTarget(primary);
  const partnerPartnerWith = partnerWithTarget(partner);

  if (primaryPartnerWith || partnerPartnerWith) {
    return primaryPartnerWith === partnerName || partnerPartnerWith === primaryName;
  }
  if (hasPartnerAbility(primary) && hasPartnerAbility(partner)) {
    return true;
  }
  if (hasFriendsForever(primary) && hasFriendsForever(partner)) {
    return true;
  }
  if ((hasChooseBackground(primary) && isBackgroundCard(partner)) || (hasChooseBackground(partner) && isBackgroundCard(primary))) {
    return true;
  }
  if ((hasDoctorsCompanion(primary) && isDoctorCard(partner)) || (hasDoctorsCompanion(partner) && isDoctorCard(primary))) {
    return true;
  }
  return false;
}

function showToast(message, kind = "success") {
  const stack = byId("toastStack");
  if (!stack || !message) {
    return;
  }
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  stack.appendChild(node);
  window.setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(6px)";
    window.setTimeout(() => node.remove(), 220);
  }, TOAST_LIFETIME_MS);
}

function setStatus(id, message, isError = false, toast = false) {
  const node = byId(id);
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.classList.toggle("error", !!isError);
  if (toast && message) {
    showToast(message, isError ? "error" : "success");
  }
}

function animateNumber(node, targetValue) {
  if (!node) {
    return;
  }
  const target = Number(targetValue);
  if (!Number.isFinite(target)) {
    node.textContent = text(targetValue);
    return;
  }
  const start = Number(node.textContent.replace(/[^\d.-]/g, "")) || 0;
  const delta = target - start;
  const duration = 620;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(start + delta * eased);
    node.textContent = value.toLocaleString();
    if (t < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function updateScrollProgress() {
  const bar = byId("scrollProgress");
  if (!bar) {
    return;
  }
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) {
    bar.style.width = "0%";
    return;
  }
  const pct = (window.scrollY / scrollable) * 100;
  bar.style.width = `${pct}%`;
}

function setupScrollProgress() {
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  updateScrollProgress();
}

function setupRevealObserver() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) {
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08 }
  );

  for (const item of items) {
    observer.observe(item);
  }
}

function getMotionFactor() {
  const raw = Number(byId("motionLevel")?.value || 78);
  return Math.max(0, Math.min(raw / 100, 1));
}

function startSparkleCanvas() {
  const canvas = byId("sparkleCanvas");
  if (!canvas) {
    return;
  }
  if (!canvas.offsetParent) {
    return;
  }

  if (state.sparkleHandle) {
    cancelAnimationFrame(state.sparkleHandle);
    state.sparkleHandle = null;
  }

  const factor = getMotionFactor();
  if (factor <= 0.05) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const stars = [];
  const count = Math.round(36 + factor * 90);

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  if (state.sparkleResizeHandle) {
    window.removeEventListener("resize", state.sparkleResizeHandle);
  }
  state.sparkleResizeHandle = resize;
  window.addEventListener("resize", resize);

  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.5 + Math.random() * 1.6,
      a: 0.12 + Math.random() * 0.35,
      v: 0.1 + Math.random() * 0.45,
      p: Math.random() * Math.PI * 2,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const s of stars) {
      s.p += 0.01 + factor * 0.01;
      const alpha = s.a + Math.sin(s.p) * 0.08;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.04, alpha)})`;
      ctx.fill();
      s.y -= s.v * factor;
      if (s.y < -8) {
        s.y = window.innerHeight + 8;
        s.x = Math.random() * window.innerWidth;
      }
    }
    state.sparkleHandle = requestAnimationFrame(frame);
  }

  frame();
}

function confettiBurst(reason = "manual") {
  const mode = confettiMode();
  if (mode === "off") {
    return;
  }
  const factor = getMotionFactor();
  if (factor < 0.25) {
    return;
  }
  const now = Date.now();
  const cooldownMs = mode === "full" ? 2600 : 7200;
  if (reason !== "force" && now - state.confettiLastBurstAt < cooldownMs) {
    return;
  }
  if (mode === "subtle" && reason === "auto") {
    return;
  }
  state.confettiLastBurstAt = now;

  const pieces = mode === "full" ? Math.round(28 + factor * 36) : Math.round(10 + factor * 8);
  const colors = ["#11cbd7", "#f5b14e", "#f26e5b", "#87d95f", "#9f84ff"];
  const layer = byId("confettiLayer") || document.body;
  for (let i = 0; i < pieces; i += 1) {
    const node = document.createElement("span");
    node.className = "confetti";
    node.style.left = `${8 + Math.random() * 84}%`;
    node.style.background = colors[i % colors.length];
    node.style.animationDuration = `${mode === "full" ? 1.9 : 1.6 + Math.random() * 1.3}s`;
    node.style.setProperty("--x-drift", `${-55 + Math.random() * 110}px`);
    node.style.setProperty("--rot", `${120 + Math.random() * 520}deg`);
    node.style.transform = `rotate(${Math.random() * 180}deg)`;
    layer.appendChild(node);
    window.setTimeout(() => node.remove(), 4200);
  }
}

function attachTilt(card) {
  if (!card || card.dataset.tiltReady === "1") {
    return;
  }
  card.dataset.tiltReady = "1";

  card.addEventListener("mousemove", (event) => {
    const factor = getMotionFactor();
    if (factor < 0.35) {
      return;
    }
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (event.clientX - cx) / rect.width;
    const dy = (event.clientY - cy) / rect.height;
    card.style.transform = `translateY(-4px) rotateX(${(-dy * 10 * factor).toFixed(2)}deg) rotateY(${(
      dx *
      10 *
      factor
    ).toFixed(2)}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });
}

function enhanceCardTilts() {
  document.querySelectorAll(".card-visual").forEach((card) => attachTilt(card));
}

async function copyText(value, statusId, okMessage = "Copied.", failMessage = "Copy failed.") {
  try {
    await navigator.clipboard.writeText(value);
    setStatus(statusId, okMessage, false, true);
  } catch {
    setStatus(statusId, failMessage, true, true);
  }
}

function buildCardLookup(cards) {
  const lookup = {};
  for (const card of cards || []) {
    lookup[normalizeName(card.name)] = card;
  }
  return lookup;
}

function buildComboIndex(combos) {
  const index = {};
  for (const combo of combos || []) {
    const matched = combo.matched_cards || [];
    for (const name of matched) {
      const key = normalizeName(name);
      index[key] = index[key] || [];
      index[key].push({
        id: combo.id || "Combo",
        requires: matched.filter((entry) => normalizeName(entry) !== key),
        missing: combo.missing_cards || [],
        produces: combo.produces || [],
        description: combo.description || "",
      });
    }
  }
  return index;
}

function combosForCardName(name) {
  return state.comboIndex[normalizeName(name)] || [];
}

function renderComboList(container, rows) {
  container.innerHTML = "";
  if (!rows.length) {
    container.innerHTML = '<p class="preview-subtle">No direct combo line identified for this deck.</p>';
    return;
  }
  for (const row of rows) {
    const node = document.createElement("article");
    node.className = "combo-article";
    const requires = row.requires.length ? row.requires.join(", ") : "None";
    const outputs = row.produces.length ? row.produces.join(" | ") : "N/A";
    const missing = row.missing.length ? row.missing.join(", ") : "None";
    node.innerHTML = `
      <strong>${text(row.id)}</strong>
      <div class="preview-subtle"><span>Requires:</span> ${text(requires)}</div>
      <div class="preview-subtle"><span>Missing:</span> ${text(missing)}</div>
      <div class="preview-subtle"><span>Output:</span> ${text(outputs)}</div>
    `;
    container.appendChild(node);
  }
}

function openCardPreview(cardNameOrCard) {
  const card =
    typeof cardNameOrCard === "string"
      ? state.cardLookup[normalizeName(cardNameOrCard)]
      : cardNameOrCard;
  if (!card) {
    return;
  }

  const modal = byId("cardPreviewModal");
  const image = byId("previewCardImage");
  const name = byId("previewCardName");
  const type = byId("previewCardType");
  const stats = byId("previewCardStats");
  const roles = byId("previewCardRoles");
  const oracle = byId("previewCardOracle");
  const combos = byId("previewCardCombos");

  image.src = imageUrl(card);
  image.alt = text(card.name);
  name.textContent = text(card.name);
  type.textContent = `${text(card.type_line)} | CMC ${text(card.cmc ?? "-")} | ${text(card.rarity || "").toUpperCase()}`;
  stats.textContent = `EDHREC ${formatRank(card.edhrec_rank)} | Power ${score(card.power_proxy_score)} | Synergy ${score(card.synergy_score)}`;
  oracle.textContent = text(card.oracle_text || "No oracle text loaded.");
  roles.innerHTML = (card.role_tags || [])
    .map((role) => `<span><strong>${text(roleAbbreviation(role))}</strong> ${text(roleLabel(role))}</span>`)
    .join("");
  renderComboList(combos, combosForCardName(card.name));

  if (modal?.showModal) {
    modal.showModal();
  } else {
    modal.removeAttribute("hidden");
  }
}

function closeCardPreview() {
  const modal = byId("cardPreviewModal");
  if (!modal) {
    return;
  }
  if (modal.open) {
    modal.close();
  } else {
    modal.setAttribute("hidden", "hidden");
  }
}

function renderSelectedCommander(cardsOrCard) {
  const target = byId("commanderPreview");
  target.innerHTML = "";
  const cards = Array.isArray(cardsOrCard) ? cardsOrCard.filter(Boolean) : [cardsOrCard].filter(Boolean);
  if (!cards.length) {
    return;
  }
  for (const card of cards) {
    const ci = (card.color_identity || []).join("") || "C";
    const row = document.createElement("article");
    row.className = "commander-inline";
    row.innerHTML = `
      <button type="button" class="card-preview-trigger thumb" aria-label="Preview ${text(card.name)}">
        <img src="${imageUrl(card)}" alt="${text(card.name)}" loading="lazy" />
      </button>
      <div>
        <button type="button" class="card-preview-trigger title">${text(card.name)}</button>
        <div class="meta">${text(card.type_line)} | CI ${ci} | EDHREC ${formatRank(card.edhrec_rank)}</div>
      </div>
    `;
    row.querySelector(".card-preview-trigger.thumb")?.addEventListener("click", () => openCardPreview(card));
    row.querySelector(".card-preview-trigger.title")?.addEventListener("click", () => openCardPreview(card));
    target.appendChild(row);
  }
}

function renderCollectionStatus(summary) {
  if (!summary || !summary.available) {
    setStatus(
      "collectionStatus",
      "No imported collection yet. Use Import MTGA Collection to make suggestions collection-aware."
    );
    return;
  }
  setStatus(
    "collectionStatus",
    `Collection loaded: ${summary.unique_cards_owned} unique / ${summary.total_cards_owned} copies${
      summary.corpus_coverage_ratio != null ? ` | corpus coverage ${(summary.corpus_coverage_ratio * 100).toFixed(1)}%` : ""
    }${summary.warning_count ? ` | warnings ${summary.warning_count}` : ""}.`
  );
}

function deckToText(payload) {
  const lines = [];
  const commanders = (payload.commanders && payload.commanders.length ? payload.commanders : [payload.commander]).filter(Boolean);
  lines.push("Commander");
  for (const commander of commanders) {
    lines.push(`1 ${commander.name}`);
  }
  lines.push("");
  lines.push(`Mainboard (${payload.cards.length})`);
  for (const card of payload.cards) {
    lines.push(`1 ${card.name}`);
  }
  lines.push("");
  const roleCounts = payload.stats?.role_counts || {};
  const roleLine = roleKeys().map((key) => `${roleAbbreviation(key)} ${roleCounts[key] ?? 0}`).join(" | ");
  lines.push(
    `Stats: ${payload.stats.deck_size}/${payload.stats.target_size} cards | ${roleLine}`
  );
  return lines.join("\n");
}

function applyRoleFilter(cards) {
  const roleFilter = byId("deckRoleFilter").value;
  if (roleFilter === "all") {
    return [...cards];
  }
  return cards.filter((card) => (card.role_tags || []).includes(roleFilter));
}

function applySort(cards) {
  const sortBy = byId("deckSortBy").value;
  const sorted = [...cards];
  sorted.sort((a, b) => {
    if (sortBy === "alpha_asc") {
      return text(a.name).localeCompare(text(b.name));
    }
    if (sortBy === "cmc_asc") {
      return (a.cmc || 0) - (b.cmc || 0);
    }
    if (sortBy === "synergy_desc") {
      return (b.synergy_score || 0) - (a.synergy_score || 0);
    }
    if (sortBy === "edhrec_asc") {
      return (a.edhrec_rank || 999999) - (b.edhrec_rank || 999999);
    }
    return (b.power_proxy_score || 0) - (a.power_proxy_score || 0);
  });
  return sorted;
}

function scoreChips(card) {
  const chips = [];
  chips.push({ kind: "", label: `Power ${score(card.power_proxy_score)}` });
  chips.push({ kind: "", label: `Syn ${score(card.synergy_score)}` });
  chips.push({ kind: "", label: `Pop ${score(card.popularity_score)}` });
  for (const role of card.role_tags || []) {
    chips.push({ kind: "role", label: roleLabel(role) });
  }
  chips.push(card.needs_wildcard ? { kind: "missing", label: "Needs WC" } : { kind: "owned", label: "Owned" });
  return chips;
}

function createVisualCard(card, subtitle = "", chips = []) {
  const node = document.createElement("article");
  node.className = "card-visual previewable";
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.setAttribute("aria-label", `Preview ${text(card.name)}`);
  node.dataset.cardName = text(card.name);

  const img = document.createElement("img");
  img.src = imageUrl(card);
  img.alt = text(card.name);
  img.loading = "lazy";
  node.appendChild(img);

  const info = document.createElement("div");
  info.className = "card-info";

  const name = document.createElement("p");
  name.className = "name";
  name.textContent = text(card.name);
  info.appendChild(name);

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = subtitle;
  info.appendChild(meta);

  if (chips.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "card-chip-row";
    for (const chip of chips) {
      const tag = document.createElement("span");
      tag.className = `chip ${chip.kind || ""}`.trim();
      tag.textContent = chip.label;
      chipRow.appendChild(tag);
    }
    info.appendChild(chipRow);
  }

  node.appendChild(info);
  attachTilt(node);
  node.addEventListener("click", () => openCardPreview(card));
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCardPreview(card);
    }
  });
  return node;
}

function renderDeckGrid(cards) {
  const container = byId("deckGallery");
  container.innerHTML = "";
  for (const card of cards) {
    const subtitle = `${text(card.type_line)} | CMC ${card.cmc ?? "?"} | EDHREC ${formatRank(card.edhrec_rank)}`;
    container.appendChild(createVisualCard(card, subtitle, scoreChips(card)));
  }
}

function renderDeckTable(cards) {
  const tbody = byId("deckTable").querySelector("tbody");
  tbody.innerHTML = "";

  for (const card of cards) {
    const tr = document.createElement("tr");
    const roles = (card.role_tags || []).map((role) => roleLabel(role)).join(", ") || "-";
    const combos = combosForCardName(card.name);

    const cardCell = document.createElement("td");
    const rowCard = document.createElement("div");
    rowCard.className = "deck-row-card";

    const imgButton = document.createElement("button");
    imgButton.type = "button";
    imgButton.className = "card-preview-trigger thumb";
    imgButton.setAttribute("aria-label", `Preview ${text(card.name)}`);
    const thumb = document.createElement("img");
    thumb.src = imageUrl(card);
    thumb.alt = text(card.name);
    thumb.loading = "lazy";
    imgButton.appendChild(thumb);
    imgButton.addEventListener("click", () => openCardPreview(card));
    rowCard.appendChild(imgButton);

    const titleBlock = document.createElement("div");
    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.className = "card-preview-trigger title";
    titleButton.textContent = text(card.name);
    titleButton.addEventListener("click", () => openCardPreview(card));
    const rarity = document.createElement("div");
    rarity.className = "meta";
    rarity.textContent = text(card.rarity || "").toUpperCase();
    titleBlock.appendChild(titleButton);
    titleBlock.appendChild(rarity);
    rowCard.appendChild(titleBlock);
    cardCell.appendChild(rowCard);
    tr.appendChild(cardCell);

    const typeCell = document.createElement("td");
    typeCell.textContent = text(card.type_line);
    tr.appendChild(typeCell);

    const cmcCell = document.createElement("td");
    cmcCell.className = "metric";
    cmcCell.textContent = text(card.cmc ?? "-");
    tr.appendChild(cmcCell);

    const rolesCell = document.createElement("td");
    rolesCell.textContent = roles;
    tr.appendChild(rolesCell);

    const comboCell = document.createElement("td");
    if (combos.length) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "combo-link";
      btn.textContent = `${combos.length} line${combos.length > 1 ? "s" : ""}`;
      const preview = combos[0]?.requires?.slice(0, 3).join(", ") || "Open card preview to inspect combo links";
      btn.title = `Combos with: ${preview}`;
      btn.addEventListener("click", () => openCardPreview(card));
      comboCell.appendChild(btn);
    } else {
      comboCell.textContent = "-";
    }
    tr.appendChild(comboCell);

    const edhrecCell = document.createElement("td");
    edhrecCell.className = "metric";
    edhrecCell.textContent = formatRank(card.edhrec_rank);
    tr.appendChild(edhrecCell);

    const popCell = document.createElement("td");
    popCell.className = "metric";
    popCell.textContent = score(card.popularity_score);
    tr.appendChild(popCell);

    const powerCell = document.createElement("td");
    powerCell.className = "metric good";
    powerCell.textContent = score(card.power_proxy_score);
    tr.appendChild(powerCell);

    const synCell = document.createElement("td");
    synCell.className = "metric";
    synCell.textContent = score(card.synergy_score);
    tr.appendChild(synCell);

    const ownedCell = document.createElement("td");
    ownedCell.className = `metric ${card.needs_wildcard ? "warn" : "good"}`;
    ownedCell.textContent = String(card.owned_count || 0);
    tr.appendChild(ownedCell);

    tbody.appendChild(tr);
  }
}

function renderMethodology(method, payload) {
  const node = byId("methodContent");
  if (!method) {
    node.textContent = "No method metadata available.";
    return;
  }

  const roles = method.roles || {};
  const weights = method.weights || {};
  const missing = payload.craft_estimate?.missing_by_rarity || { common: 0, uncommon: 0, rare: 0, mythic: 0 };
  const roleTiles = Object.entries(roles)
    .filter(([key]) => key !== "deck_size")
    .map(
      ([key, value]) =>
        `<div class="mini"><span class="label">${text(roleLabel(key))} Target</span><strong>${text(value ?? "-")}</strong></div>`
    )
    ;
  const coreRoleTiles = roleTiles.slice(0, 8).join("");
  const extraRoleTiles = roleTiles.slice(8).join("");
  const extraRoleBlock = extraRoleTiles
    ? `<details class="mini-details tight"><summary>More role targets</summary><div class="method-grid">${extraRoleTiles}</div></details>`
    : "";

  node.innerHTML = `
    <p>${text(method.description || "Weighted scoring across popularity, synergy, curve, and collection costs.")}</p>
    <div class="method-grid">
      <div class="mini"><span class="label">Engine</span><strong>Heuristic scorer v1 (deterministic)</strong></div>
      <div class="mini"><span class="label">Mode</span><strong>${text(method.mode || "-")}</strong></div>
      <div class="mini"><span class="label">Target Deck Size</span><strong>${text(roles.deck_size || "-")}</strong></div>
      ${coreRoleTiles}
      <div class="mini"><span class="label">Weight EDHREC</span><strong>${score((weights.edhrec || 0) * 100)}</strong></div>
      <div class="mini"><span class="label">Weight Synergy</span><strong>${score((weights.synergy || 0) * 100)}</strong></div>
      <div class="mini"><span class="label">Weight Curve</span><strong>${score((weights.curve || 0) * 100)}</strong></div>
      <div class="mini"><span class="label">Weight Owned</span><strong>${score((weights.owned || 0) * 100)}</strong></div>
      <div class="mini"><span class="label">Weight WC Penalty</span><strong>${score((weights.wildcard_penalty || 0) * 100)}</strong></div>
      <div class="mini"><span class="label">Missing WC</span><strong>C${missing.common} U${missing.uncommon} R${missing.rare} M${missing.mythic}</strong></div>
    </div>
    ${extraRoleBlock}
  `;
}

function renderCombos(rows) {
  const panel = byId("comboPanel");
  const container = byId("comboResults");
  if (!rows || rows.length === 0) {
    panel.hidden = true;
    container.innerHTML = "";
    return;
  }

  panel.hidden = false;
  container.innerHTML = "";
  for (const combo of rows) {
    const node = document.createElement("article");
    node.className = "card";
    node.innerHTML = `
      <h4>${text(combo.id)}</h4>
      <div class="meta">Matched: ${text((combo.matched_cards || []).join(", ") || "None")}</div>
      <div class="meta">Missing: ${text((combo.missing_cards || []).join(", ") || "None")}</div>
      <div class="meta">Produces: ${text((combo.produces || []).join(" | ") || "N/A")}</div>
      <div class="oracle">${text(combo.description || "")}</div>
    `;
    container.appendChild(node);
  }
}

function renderCards(rows) {
  const container = byId("cardResults");
  container.innerHTML = "";
  for (const card of rows) {
    const ci = (card.color_identity || []).join("") || "C";
    const subtitle = `${text(card.type_line)} | CMC ${card.cmc ?? "?"} | CI ${ci} | EDHREC ${formatRank(card.edhrec_rank)}`;
    const chips = [];
    if (card.edhrec_rank) {
      chips.push({ kind: "", label: formatRank(card.edhrec_rank) });
    }
    chips.push({ kind: "", label: text(card.set || "").toUpperCase() });
    container.appendChild(createVisualCard(card, subtitle, chips));
  }
}

function renderDeck(payload) {
  state.deckPayload = payload;
  const commanders = (payload.commanders && payload.commanders.length
    ? payload.commanders
    : [payload.commander, payload.partner_commander].filter(Boolean));
  state.cardLookup = buildCardLookup([...(payload.cards || []), ...commanders]);
  state.comboIndex = buildComboIndex(payload.combo_suggestions || []);
  renderSelectedCommander(commanders.length ? commanders : selectedCommanderPair());

  const filtered = applyRoleFilter(payload.cards || []);
  const cards = applySort(filtered);

  const deckText = deckToText(payload);
  byId("deckList").value = deckText;
  if (!byId("importDeckText").value.trim()) {
    byId("importDeckText").value = deckText;
  }

  renderDeckTable(cards);
  renderDeckGrid(cards);
  renderMethodology(payload.method, payload);
  renderCombos(payload.combo_suggestions || []);

  const miss = payload.craft_estimate?.missing_by_rarity || { common: 0, uncommon: 0, rare: 0, mythic: 0 };
  const counts = payload.stats?.role_counts || {};
  const statsNode = byId("deckStats");
  const roleSummary = roleKeys()
    .slice(0, 8)
    .map((key) => `<span class="stat-pill"><strong>${text(roleAbbreviation(key))}</strong> ${text(counts[key] ?? 0)}</span>`)
    .join("");
  statsNode.innerHTML = `
    <span class="stat-pill bold">${payload.stats.deck_size}/${payload.stats.target_size} cards</span>
    <span class="stat-pill">Owned ${payload.stats.owned_mainboard_count}</span>
    <span class="stat-pill">Missing ${payload.stats.missing_mainboard_count}</span>
    <span class="stat-pill">WC C${miss.common} U${miss.uncommon} R${miss.rare} M${miss.mythic}</span>
    ${roleSummary}
  `;

  byId("deckPanel").dataset.view = byId("deckViewMode").value;
  byId("deckPanel").dataset.density = byId("infoDensity")?.value || "normal";
  enhanceCardTilts();
}

function renderPriorityReplacements(rows) {
  const tbody = byId("replacementTableBody");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">No replacement suggestions found for this import.</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const row of rows) {
    const from = row.replace_card || {};
    const add = row.add_card || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="metric good">${score(row.priority_score)}</td>
      <td>
        <div class="deck-row-card">
          <button type="button" class="card-preview-trigger thumb" aria-label="Preview ${text(from.name)}">
            <img src="${imageUrl(from)}" alt="${text(from.name)}" loading="lazy" />
          </button>
          <div><button type="button" class="card-preview-trigger title">${text(from.name)}</button><div class="meta">Owned ${from.owned_count || 0}</div></div>
        </div>
      </td>
      <td>
        <div class="deck-row-card">
          <button type="button" class="card-preview-trigger thumb" aria-label="Preview ${text(add.name)}">
            <img src="${imageUrl(add)}" alt="${text(add.name)}" loading="lazy" />
          </button>
          <div><button type="button" class="card-preview-trigger title">${text(add.name)}</button><div class="meta">Owned ${add.owned_count || 0}</div></div>
        </div>
      </td>
      <td class="metric good">${score(row.score_gain)}</td>
      <td>${text((row.reasons || []).join(", "))}</td>
    `;
    tr.querySelectorAll("td:nth-child(2) .card-preview-trigger").forEach((node) => {
      node.addEventListener("click", () => openCardPreview(from));
    });
    tr.querySelectorAll("td:nth-child(3) .card-preview-trigger").forEach((node) => {
      node.addEventListener("click", () => openCardPreview(add));
    });
    tbody.appendChild(tr);
  }
}

function renderMissingAlternatives(rows) {
  const container = byId("missingAltResults");
  container.innerHTML = "";

  if (!rows || rows.length === 0) {
    container.innerHTML = '<article class="card"><div class="meta">No missing-card alternatives found.</div></article>';
    return;
  }

  for (const row of rows) {
    const missing = row.missing_card || {};
    const options = row.owned_alternatives || [];
    const node = document.createElement("article");
    node.className = "card";
    const optionsMarkup = options.length
      ? `<ul class="preview-list">
          ${options
            .map(
              (opt, idx) =>
                `<li>
                  <button type="button" class="card-preview-trigger title" data-alt-index="${idx}">${text(opt.name)}</button>
                  <span class="meta">(Power ${score(opt.power_proxy_score)}, Owned ${opt.owned_count || 0})</span>
                </li>`
            )
            .join("")}
        </ul>`
      : '<div class="oracle">No owned alternative found.</div>';
    node.innerHTML = `
      <h4><button type="button" class="card-preview-trigger title missing-trigger">${text(missing.name)}</button> <span class="meta">(missing)</span></h4>
      ${optionsMarkup}
    `;
    node.querySelector(".missing-trigger")?.addEventListener("click", () => openCardPreview(missing));
    node.querySelectorAll("button[data-alt-index]").forEach((button) => {
      const idx = Number(button.getAttribute("data-alt-index"));
      button.addEventListener("click", () => openCardPreview(options[idx]));
    });
    container.appendChild(node);
  }
}

function renderImportAnalysis(payload) {
  state.optimizedPayload = payload;
  renderPriorityReplacements(payload.priority_replacements || []);
  renderMissingAlternatives(payload.missing_card_alternatives || []);

  const parsed = payload.parsed || {};
  const comparison = payload.comparison || {};
  const unknownCount = (parsed.unknown_cards || []).length;
  setStatus(
    "importStatus",
    `Parsed ${parsed.recognized_unique_cards || 0} cards. Keep ${comparison.keep_count || 0}, swap ${comparison.swap_out_count || 0} -> ${comparison.swap_in_count || 0}. Unknown: ${unknownCount}.`,
    false,
    true
  );
}

function renderRoleSliders() {
  const stack = byId("roleSliderStack");
  if (!stack) {
    return;
  }
  stack.innerHTML = "";
  for (const role of ROLE_SCHEMAS) {
    const inputId = roleInputId(role.key);
    const outputId = roleOutputId(role.key);
    const row = document.createElement("div");
    row.className = "slider-row role-slider-row";
    row.innerHTML = `
      <label for="${inputId}" class="slider-title">${text(role.label)}</label>
      <input id="${inputId}" type="range" min="${role.min}" max="99" value="0" />
      <output id="${outputId}">0</output>
    `;
    stack.appendChild(row);
  }
}

function renderRoleFilterOptions() {
  const select = byId("deckRoleFilter");
  if (!select) {
    return;
  }
  const previous = select.value || "all";
  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Cards";
  select.appendChild(allOption);
  for (const key of roleKeys()) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = roleLabel(key);
    select.appendChild(option);
  }
  if ([...select.options].some((opt) => opt.value === previous)) {
    select.value = previous;
  }
}

function roleValues() {
  const out = {};
  for (const key of roleKeys()) {
    out[key] = Number(byId(roleInputId(key))?.value || 0);
  }
  return out;
}

function applyRoleValues(values) {
  for (const key of roleKeys()) {
    const input = byId(roleInputId(key));
    if (!input) {
      continue;
    }
    input.value = String(values[key] ?? 0);
  }
}

function rebalanceRoleTargets(changedKey = null) {
  const budget = currentMainboardSize();
  const keys = roleKeys();
  const values = roleValues();
  const mins = Object.fromEntries(keys.map((key) => [key, roleMin(key)]));

  for (const key of keys) {
    const slider = byId(roleInputId(key));
    if (!slider) {
      continue;
    }
    const max = Number(slider.max || budget);
    values[key] = Math.max(mins[key], Math.min(values[key], max));
  }

  let total = keys.reduce((acc, key) => acc + values[key], 0);
  if (total > budget) {
    let overflow = total - budget;
    const ordered = keys
      .filter((key) => key !== changedKey)
      .sort((a, b) => (values[b] - mins[b]) - (values[a] - mins[a]))
      .concat(changedKey ? [changedKey] : []);
    let safety = 0;
    while (overflow > 0 && safety < 12000) {
      safety += 1;
      let reduced = false;
      for (const key of ordered) {
        if (!key || values[key] <= mins[key]) {
          continue;
        }
        values[key] -= 1;
        overflow -= 1;
        reduced = true;
        if (overflow <= 0) {
          break;
        }
      }
      if (!reduced) {
        break;
      }
    }

    total = keys.reduce((acc, key) => acc + values[key], 0);
    if (total > budget) {
      const ratio = budget / Math.max(total, 1);
      for (const key of keys) {
        values[key] = Math.max(mins[key], Math.floor(values[key] * ratio));
      }
      let remain = budget - keys.reduce((acc, key) => acc + values[key], 0);
      const byHeadroom = [...keys].sort((a, b) => (values[b] - mins[b]) - (values[a] - mins[a]));
      while (remain > 0) {
        let advanced = false;
        for (const key of byHeadroom) {
          const max = Number(byId(roleInputId(key))?.max || budget);
          if (values[key] < max) {
            values[key] += 1;
            remain -= 1;
            advanced = true;
            if (remain <= 0) {
              break;
            }
          }
        }
        if (!advanced) {
          break;
        }
      }
    }
  }

  applyRoleValues(values);
}

function roleRadarPoint(cx, cy, radius, ratio, angleDeg) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + Math.cos(angle) * radius * ratio,
    y: cy + Math.sin(angle) * radius * ratio,
  };
}

function ensureRoleRadarEvents() {
  if (state.radarEventsBound) {
    return;
  }
  const host = byId("roleRadar");
  if (!host) {
    return;
  }

  const dragToValue = (event, roleKey) => {
    const meta = state.radarMeta;
    if (!meta || !roleKey || !(roleKey in meta.axisIndex) || !meta.svg) {
      return;
    }
    const idx = meta.axisIndex[roleKey];
    const rect = meta.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const sx = (event.clientX - rect.left) * (meta.width / rect.width);
    const sy = (event.clientY - rect.top) * (meta.height / rect.height);
    const angleDeg = idx * (360 / meta.axes.length);
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const dx = sx - meta.cx;
    const dy = sy - meta.cy;
    const projection = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
    const ratio = Math.max(0, Math.min(projection / meta.radius, 1));
    const axisMax = meta.axisMax[roleKey] || meta.budget;
    const value = Math.round(ratio * axisMax);

    const node = byId(roleInputId(roleKey));
    if (!node) {
      return;
    }
    node.value = String(value);
    rebalanceRoleTargets(roleKey);
    updateRoleOutputs();
  };

  host.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target.closest("circle[data-role]") : null;
    const roleKey = target?.getAttribute("data-role");
    if (!roleKey || roleKey === "flex") {
      return;
    }
    state.radarDragRole = roleKey;
    event.preventDefault();
    dragToValue(event, roleKey);
  });

  window.addEventListener("pointermove", (event) => {
    if (!state.radarDragRole) {
      return;
    }
    dragToValue(event, state.radarDragRole);
  });

  window.addEventListener("pointerup", () => {
    state.radarDragRole = null;
  });

  state.radarEventsBound = true;
}

function renderRoleRadar() {
  const target = byId("roleRadar");
  if (!target) {
    return;
  }
  const budget = currentMainboardSize();
  const format = byId("format").value;
  const radarCap = radarDisplayCap(format, budget);
  const values = roleValues();
  const assigned = roleKeys().reduce((acc, key) => acc + values[key], 0);
  const flex = Math.max(0, budget - assigned);
  const axes = roleKeys()
    .map((key) => {
      const max = radarCap;
      return { key, label: roleAbbreviation(key), value: values[key], max };
    })
    .concat([{ key: "flex", label: "FX", value: flex, max: budget }]);

  const width = 320;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 98;

  const ringRatios = [0.2, 0.4, 0.6, 0.8, 1];
  const axisPoints = axes.map((_, idx) => roleRadarPoint(cx, cy, radius, 1, idx * (360 / axes.length)));
  const polygonPoints = axes.map((axis, idx) =>
    roleRadarPoint(
      cx,
      cy,
      radius,
      Math.max(0, Math.min(axis.value / Math.max(axis.max || budget, 1), 1)),
      idx * (360 / axes.length)
    )
  );

  const ringPolygons = ringRatios
    .map((ratio) => {
      const pts = axes
        .map((_, idx) => {
          const p = roleRadarPoint(cx, cy, radius, ratio, idx * (360 / axes.length));
          return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        })
        .join(" ");
      return `<polygon class=\"ring\" points=\"${pts}\" />`;
    })
    .join("");

  const axisLines = axisPoints
    .map((p) => `<line class=\"axis\" x1=\"${cx}\" y1=\"${cy}\" x2=\"${p.x.toFixed(2)}\" y2=\"${p.y.toFixed(2)}\" />`)
    .join("");

  const poly = polygonPoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const dots = polygonPoints
    .map((p, idx) => {
      const axis = axes[idx];
      const dragClass = axis.key === "flex" ? "" : "draggable";
      return `<circle class=\"dot ${dragClass}\" data-role=\"${axis.key}\" cx=\"${p.x.toFixed(2)}\" cy=\"${p.y.toFixed(2)}\" r=\"4.2\" />`;
    })
    .join("");

  const labels = axes
    .map((axis, idx) => {
      const p = roleRadarPoint(cx, cy, radius + 18, 1, idx * (360 / axes.length));
      const cap = axis.max || budget;
      return `<text class=\"label\" x=\"${p.x.toFixed(2)}\" y=\"${p.y.toFixed(2)}\" text-anchor=\"middle\">${axis.label} ${axis.value}/${cap}</text>`;
    })
    .join("");

  target.innerHTML = `
    <svg viewBox=\"0 0 ${width} ${height}\" role=\"img\" aria-label=\"Role mix web\">
      ${ringPolygons}
      ${axisLines}
      <polygon class=\"fill\" points=\"${poly}\" />
      ${dots}
      ${labels}
    </svg>
  `;
  state.radarMeta = {
    axes,
    width,
    height,
    cx,
    cy,
    radius,
    budget,
    svg: target.querySelector("svg"),
    axisIndex: Object.fromEntries(axes.map((axis, idx) => [axis.key, idx])),
    axisMax: Object.fromEntries(axes.map((axis) => [axis.key, axis.max || budget])),
  };
  ensureRoleRadarEvents();
}

function setRoleSliderValuesForFormat(format, resetToDefaults = true) {
  const budget = currentMainboardSize();
  const defaults = roleDefaultsForFormat(format);
  const previous = roleValues();
  if (resetToDefaults) {
    setActiveRolePreset("balanced");
  }
  for (const key of roleKeys()) {
    const node = byId(roleInputId(key));
    if (!node) {
      continue;
    }
    node.max = String(roleSliderMax(key, format, budget));
    node.min = String(roleMin(key));
    const next = resetToDefaults ? defaults[key] ?? 0 : previous[key] ?? defaults[key] ?? 0;
    const clamped = Math.max(roleMin(key), Math.min(next, Number(node.max)));
    node.value = String(clamped);
  }

  rebalanceRoleTargets(null);
  updateRoleOutputs();
}

function renderRoleLegend() {
  const budget = currentMainboardSize();
  const values = roleValues();
  const assigned = roleKeys().reduce((acc, key) => acc + values[key], 0);
  const flex = Math.max(0, budget - assigned);
  const container = byId("roleLegend");
  if (!container) {
    return;
  }
  const rows = roleKeys()
    .map((key) => {
      const value = values[key];
      const pct = Math.round((value / budget) * 100);
      return `<span><strong>${text(roleAbbreviation(key))}</strong> ${value} (${pct}%)</span>`;
    })
    .concat([`<span><strong>FX</strong> ${flex} (${Math.round((flex / budget) * 100)}%)</span>`]);
  container.innerHTML = rows.join("");
}

function updateRoleOutputs() {
  const budget = currentMainboardSize();
  const format = byId("format").value;
  const radarCap = radarDisplayCap(format, budget);
  const values = roleValues();
  const totalAssigned = roleKeys().reduce((acc, key) => acc + values[key], 0);
  const flex = Math.max(0, budget - totalAssigned);

  for (const key of roleKeys()) {
    const node = byId(roleOutputId(key));
    if (!node) {
      continue;
    }
    const deckPct = Math.round((values[key] / Math.max(budget, 1)) * 100);
    node.textContent = `${values[key]} (${deckPct}% deck)`;
  }

  const summary = byId("roleBudgetSummary");
  if (summary) {
    const ratio = Math.max(0, Math.min(totalAssigned / budget, 1));
    summary.innerHTML = `
      <strong>Assigned:</strong> ${totalAssigned}/${budget} cards | <strong>Flex:</strong> ${flex}/${budget} | <strong>Radar:</strong> ${roleScaleMode() === "zoom" ? `Zoomed (${radarCap} cap)` : "Full"}
      <div class="budget-track"><span style="width: ${(ratio * 100).toFixed(1)}%"></span></div>
    `;
  }

  renderRoleRadar();
  renderRoleLegend();
}

function setActiveRolePreset(presetName) {
  document.querySelectorAll("#rolePresetButtons button[data-preset]").forEach((btn) => {
    btn.classList.toggle("primary", btn.dataset.preset === presetName);
  });
}

function applyRolePreset(presetName) {
  const formatKey = byId("format").value === "brawl" ? "brawl" : "historicbrawl";
  const preset = ROLE_PRESETS[formatKey]?.[presetName];
  if (!preset) {
    return;
  }
  setActiveRolePreset(presetName);
  applyRoleValues(preset);
  rebalanceRoleTargets(null);
  updateRoleOutputs();
  showToast(`${presetName[0].toUpperCase()}${presetName.slice(1)} preset applied.`);
}

function deckQueryParams() {
  const params = new URLSearchParams();
  params.set("format", byId("format").value);
  params.set("mode", byId("buildMode").value);
  params.set("include_combos", byId("includeCombos").checked ? "1" : "0");
  params.set("commander", byId("commanderSelect").value);
  const partnerName = byId("partnerCommanderSelect")?.value || "";
  if (partnerName) {
    params.set("commander2", partnerName);
  }
  for (const key of roleKeys()) {
    params.set(`target_${key}`, byId(roleInputId(key)).value);
  }
  return params;
}

function optimizePayloadBody(deckText) {
  const payload = {
    format: byId("format").value,
    mode: byId("buildMode").value,
    commander: byId("commanderSelect").value,
    deck_text: deckText,
  };
  const partnerName = byId("partnerCommanderSelect")?.value || "";
  if (partnerName) {
    payload.commander2 = partnerName;
  }
  for (const key of roleKeys()) {
    payload[`target_${key}`] = Number(byId(roleInputId(key)).value);
  }
  return payload;
}

async function refreshMeta() {
  const meta = await api("/api/meta");
  animateNumber(byId("cardsLoaded"), meta.cards_loaded || 0);
  animateNumber(byId("commandersLoaded"), meta.commanders_loaded || 0);
  byId("generatedAt").textContent = text(meta.metadata?.generated_at_utc || "-");
  renderCollectionStatus(meta.collection);
}

async function refreshCollection() {
  const payload = await api("/api/collection");
  renderCollectionStatus(payload.collection);
}

async function importCollection() {
  setStatus("collectionStatus", "Importing MTGA collection...");
  const rawPaths = byId("logPathInput").value || "";
  const parsedPaths = rawPaths
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
  try {
    const payload = await api("/api/collection/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log_paths: parsedPaths }),
    });
    renderCollectionStatus(payload.collection);
    const warn = (payload.import_result?.warnings || [])[0];
    setStatus("deckStatus", warn || "Collection import updated scoring inputs.", false, true);
  } catch (error) {
    setStatus("collectionStatus", error.message, true, true);
  }
}

async function downloadCollectionCsv() {
  try {
    const payload = await api("/api/collection/cards?limit=20000");
    const rows = payload.rows || [];
    if (!rows.length) {
      setStatus("collectionStatus", "No owned cards found. Import collection first.", true, true);
      return;
    }
    const header = ["arena_id", "name", "owned_count", "rarity", "set", "cmc", "type_line", "color_identity"];
    const lines = [header.join(",")];
    for (const row of rows) {
      const values = [
        row.arena_id,
        row.name,
        row.owned_count,
        row.rarity,
        row.set,
        row.cmc,
        (row.type_line || "").replace(/"/g, '""'),
        (row.color_identity || []).join(""),
      ];
      const csv = values
        .map((value) => {
          const str = text(value);
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",");
      lines.push(csv);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mtga_collection_full.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("collectionStatus", `Exported ${rows.length} owned cards to CSV.`, false, true);
  } catch (error) {
    setStatus("collectionStatus", error.message, true, true);
  }
}

async function fetchCommanders(queryValue) {
  const format = byId("format").value;
  const q = encodeURIComponent((queryValue || "").trim());
  const data = await api(`/api/commanders?format=${format}&q=${q}&limit=300`);
  return data.rows || [];
}

async function fetchLegalPartnerCommanders(primaryName, queryValue) {
  if (!primaryName) {
    return [];
  }
  const format = byId("format").value;
  const commander = encodeURIComponent(primaryName.trim());
  const q = encodeURIComponent((queryValue || "").trim());
  const data = await api(`/api/commanders/partners?format=${format}&commander=${commander}&q=${q}&limit=800`);
  return data.rows || [];
}

function populateCommanderSelect(selectId, rows, { includeBlank = false } = {}) {
  const select = byId(selectId);
  if (!select) {
    return;
  }
  const previous = select.value;
  select.innerHTML = "";
  if (includeBlank) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- none --";
    select.appendChild(blank);
  }
  for (const card of rows) {
    const option = document.createElement("option");
    option.value = card.name;
    const ci = (card.color_identity || []).join("") || "C";
    option.textContent = `${card.name} [${ci}]`;
    select.appendChild(option);
  }
  if (previous && [...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function filterLegalPartnerRows(primary, rows) {
  if (!primary) {
    return [];
  }
  return (rows || []).filter((candidate) => legalPartnerPair(primary, candidate));
}

async function refreshLegalPartnerOptions() {
  const primary = selectedCommanderData();
  const hint = byId("partnerCommanderHint");
  if (!primary) {
    state.partnerCommanderRows = [];
    populateCommanderSelect("partnerCommanderSelect", [], { includeBlank: true });
    if (hint) {
      hint.textContent = "Choose a primary commander first.";
    }
    return;
  }

  let legalRows = [];
  let fallbackUsed = false;
  try {
    legalRows = await fetchLegalPartnerCommanders(primary.name, byId("partnerCommanderQuery")?.value || "");
  } catch {
    fallbackUsed = true;
    legalRows = filterLegalPartnerRows(primary, state.commanderRows);
  }

  state.partnerCommanderRows = legalRows;
  populateCommanderSelect("partnerCommanderSelect", legalRows, { includeBlank: true });

  if (!hint) {
    return;
  }
  if (!legalRows.length) {
    hint.textContent = "No legal partner found for this commander in this format. Leave partner on -- none --.";
    byId("partnerCommanderSelect").value = "";
    return;
  }
  hint.textContent = `${legalRows.length} legal partner option${legalRows.length === 1 ? "" : "s"} for ${primary.name}${fallbackUsed ? " (local fallback)." : "."}`;
}

async function loadCommanders() {
  const format = byId("format").value;
  state.commanderRows = await fetchCommanders(byId("commanderQuery").value);
  populateCommanderSelect("commanderSelect", state.commanderRows);
  await refreshLegalPartnerOptions();

  updateRoleOutputs();
  renderSelectedCommander(selectedCommanderPair());
  setStatus("deckStatus", `Loaded ${state.commanderRows.length} commanders for ${format}.`);
}

function startGenerateOverlay() {
  const overlay = byId("generateOverlay");
  const stage = byId("generateStage");
  const fill = byId("generateTrackFill");
  if (!overlay || !stage || !fill) {
    return;
  }

  const steps = [
    "Scanning legal pool and commander identity...",
    "Applying role pressure and curve weighting...",
    "Evaluating synergy and collection ownership...",
    "Ranking final 100-card shape...",
  ];

  overlay.hidden = false;
  state.generateOverlayFrame = 0;
  fill.classList.add("indeterminate");
  fill.style.width = "44%";
  stage.textContent = steps[0];
  if (state.generateOverlayTimer) {
    window.clearInterval(state.generateOverlayTimer);
  }
  state.generateOverlayTimer = window.setInterval(() => {
    state.generateOverlayFrame += 1;
    stage.textContent = steps[state.generateOverlayFrame % steps.length];
  }, 340);
}

function stopGenerateOverlay(success = true) {
  const overlay = byId("generateOverlay");
  const fill = byId("generateTrackFill");
  if (!overlay || !fill) {
    return;
  }
  if (state.generateOverlayTimer) {
    window.clearInterval(state.generateOverlayTimer);
    state.generateOverlayTimer = null;
  }
  fill.classList.remove("indeterminate");
  fill.style.width = success ? "100%" : "22%";
  window.setTimeout(() => {
    overlay.hidden = true;
    fill.style.width = "0%";
  }, success ? 260 : 120);
}

async function suggestDeck(options = {}) {
  const celebrate = options.celebrate ?? true;
  const showOverlay = options.overlay ?? true;
  const commander = byId("commanderSelect").value;
  if (!commander) {
    setStatus("deckStatus", "Choose a commander first.", true, true);
    return;
  }

  setStatus("deckStatus", "Generating deck...");
  if (showOverlay) {
    startGenerateOverlay();
  }
  try {
    const params = deckQueryParams();
    const payload = await api(`/api/deck/suggest?${params.toString()}`);
    renderDeck(payload);
    if (payload.collection) {
      renderCollectionStatus(payload.collection);
    }
    const commanderLabel = (payload.commanders || [])
      .map((card) => card?.name)
      .filter(Boolean)
      .join(" + ") || payload.commander?.name || "selected commander";
    setStatus("deckStatus", `Generated ${payload.stats.deck_size}/${payload.stats.target_size} cards for ${commanderLabel}.`, false, true);
    if (celebrate) {
      confettiBurst("manual");
    }
    if (showOverlay) {
      stopGenerateOverlay(true);
    }
  } catch (error) {
    setStatus("deckStatus", error.message, true, true);
    if (showOverlay) {
      stopGenerateOverlay(false);
    }
  }
}

async function analyzeImportedDeck() {
  const deckText = byId("importDeckText").value.trim();
  if (!deckText) {
    setStatus("importStatus", "Paste a decklist first.", true, true);
    return;
  }

  setStatus("importStatus", "Analyzing imported decklist...");
  try {
    const payload = await api("/api/deck/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(optimizePayloadBody(deckText)),
    });
    renderImportAnalysis(payload);
    confettiBurst("manual");
  } catch (error) {
    setStatus("importStatus", error.message, true, true);
  }
}

async function searchCards() {
  const format = byId("format").value;
  const q = encodeURIComponent(byId("cardQuery").value.trim());
  const colors = encodeURIComponent(byId("colorFilter").value.trim().toUpperCase());
  const type = encodeURIComponent(byId("typeFilter").value.trim());
  const data = await api(`/api/cards?format=${format}&q=${q}&colors=${colors}&type=${type}&limit=72`);
  renderCards(data.rows || []);
}

function copyDeckText() {
  const value = byId("deckList").value || "";
  if (!value) {
    setStatus("deckStatus", "No deck text available.", true, true);
    return;
  }
  copyText(value, "deckStatus", "Decklist copied.", "Clipboard copy failed.");
}

function copyOptimizedDeckText() {
  if (!state.optimizedPayload?.optimized_deck_text) {
    setStatus("importStatus", "Run Analyze + Optimize first.", true, true);
    return;
  }
  copyText(state.optimizedPayload.optimized_deck_text, "importStatus", "Optimized deck copied.", "Clipboard copy failed.");
}

function downloadDeckText() {
  const payload = state.deckPayload;
  if (!payload) {
    setStatus("deckStatus", "Generate a deck first.", true, true);
    return;
  }
  const blob = new Blob([byId("deckList").value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const commanderTag = ((payload.commanders || []).map((card) => card?.name).filter(Boolean).join("_") || payload.commander?.name || "commander")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase();
  anchor.href = url;
  anchor.download = `${commanderTag}_${payload.format}_deck.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("deckStatus", "Decklist downloaded.", false, true);
}

function rerenderDeckIfPresent() {
  if (!state.deckPayload) {
    return;
  }
  renderDeck(state.deckPayload);
}

function syncCardSize() {
  const value = Number(byId("cardSize").value || 150);
  state.cardSize = value;
  document.documentElement.style.setProperty("--card-w", `${value}px`);
  byId("cardSizeValue").textContent = `${value}px`;

  const settings = readUiSettings();
  settings.card_size = value;
  writeUiSettings(settings);
}

function syncUiScale() {
  const value = Number(byId("uiScale").value || 100);
  document.documentElement.style.fontSize = `${value}%`;
  byId("uiScaleValue").textContent = `${value}%`;

  const settings = readUiSettings();
  settings.ui_scale = value;
  writeUiSettings(settings);
}

function syncMotionLevel() {
  const value = Number(byId("motionLevel").value || 78);
  const clamped = Math.max(0, Math.min(value, 100));
  const factor = clamped / 100;
  document.documentElement.style.setProperty("--motion-factor", `${factor}`);
  byId("motionLevelValue").textContent = `${clamped}%`;

  const settings = readUiSettings();
  settings.motion = clamped;
  writeUiSettings(settings);

  startSparkleCanvas();
}

function syncConfettiMode() {
  const mode = confettiMode();
  const settings = readUiSettings();
  settings.confetti = mode;
  writeUiSettings(settings);
}

function syncRoleScaleMode() {
  const settings = readUiSettings();
  settings.role_scale = roleScaleMode();
  writeUiSettings(settings);
  setRoleSliderValuesForFormat(byId("format").value, false);
}

function syncInfoDensity() {
  const value = byId("infoDensity")?.value || "normal";
  document.body.dataset.density = value;
  const settings = readUiSettings();
  settings.density = value;
  writeUiSettings(settings);

  const methodPanel = byId("methodPanel");
  const advancedPanel = byId("advancedPanel");
  const displayPanel = byId("displayPanel");
  if (methodPanel) {
    methodPanel.open = value === "deep";
  }
  if (advancedPanel) {
    advancedPanel.open = value === "deep";
  }
  if (displayPanel && value === "focus") {
    displayPanel.open = false;
  }
  if (byId("deckPanel")) {
    byId("deckPanel").dataset.density = value;
  }
}

function applyThemePreset(sourceId = "themePreset") {
  const source = byId(sourceId);
  const theme = source?.value || byId("themePreset")?.value || byId("themePresetQuick")?.value || "aurora";
  if (byId("themePreset") && byId("themePreset").value !== theme) {
    byId("themePreset").value = theme;
  }
  if (byId("themePresetQuick") && byId("themePresetQuick").value !== theme) {
    byId("themePresetQuick").value = theme;
  }
  document.body.dataset.theme = theme;

  const settings = readUiSettings();
  settings.theme = theme;
  writeUiSettings(settings);

  startSparkleCanvas();
}

function applySavedUiSettings() {
  const settings = readUiSettings();

  if (byId("themePreset")) {
    byId("themePreset").value = settings.theme || "aurora";
    document.body.dataset.theme = byId("themePreset").value;
  }
  if (byId("themePresetQuick")) {
    byId("themePresetQuick").value = settings.theme || "aurora";
  }
  if (byId("motionLevel")) {
    byId("motionLevel").value = String(settings.motion ?? 78);
  }
  if (byId("uiScale")) {
    byId("uiScale").value = String(settings.ui_scale ?? 100);
  }
  if (byId("cardSize")) {
    byId("cardSize").value = String(settings.card_size ?? 150);
  }
  if (byId("apiBaseUrl")) {
    byId("apiBaseUrl").value = settings.api_base || "";
  }
  if (byId("confettiMode")) {
    byId("confettiMode").value = settings.confetti || "subtle";
  }
  if (byId("roleScaleMode")) {
    byId("roleScaleMode").value = settings.role_scale || "full";
  }
  if (byId("infoDensity")) {
    byId("infoDensity").value = settings.density || "normal";
    document.body.dataset.density = byId("infoDensity").value;
  }
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

function saveApiBase() {
  const settings = readUiSettings();
  settings.api_base = byId("apiBaseUrl").value.trim();
  writeUiSettings(settings);
  setStatus("aiStatus", "API base saved. Keep provider keys on backend only.", false, true);
}

function emailInput() {
  return byId("authEmail")?.value.trim() || "";
}

function passwordInput() {
  return byId("authPassword")?.value || "";
}

function setAuth(payload) {
  state.auth = payload || null;
  writeAuthState(payload || {});
}

function clearAuth() {
  state.auth = null;
  writeAuthState({});
  renderAccountStatus(null);
}

function renderCoinPackages(packages) {
  const container = byId("coinPackageButtons");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  for (const pkg of packages || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${pkg.name} (${pkg.coins} coins) - ${pkg.display_price}`;
    button.addEventListener("click", () => {
      startCoinCheckout(pkg.id).catch((error) => setStatus("authStatus", error.message, true, true));
    });
    container.appendChild(button);
  }
}

function renderAccountStatus(payload) {
  const node = byId("accountStats");
  if (!node) {
    return;
  }
  if (!payload?.user) {
    node.innerHTML = `<span class="stat-pill">Not logged in</span>`;
    return;
  }
  node.innerHTML = `
    <span class="stat-pill bold">${text(payload.user.email)}</span>
    <span class="stat-pill">Coins ${Number(payload.balance?.coins || 0).toLocaleString()}</span>
    <span class="stat-pill">Spent ${Number(payload.balance?.spent || 0).toLocaleString()}</span>
    <span class="stat-pill">Purchased ${Number(payload.balance?.purchased || 0).toLocaleString()}</span>
  `;
}

async function loadCoinPackages() {
  const payload = await api("/api/coins/packages");
  state.coinPackages = payload.packages || [];
  renderCoinPackages(state.coinPackages);
}

async function refreshAccount() {
  if (!authToken()) {
    renderAccountStatus(null);
    return;
  }
  try {
    const payload = await api("/api/auth/me");
    setAuth({ token: authToken(), user: payload.user });
    renderAccountStatus(payload);
  } catch (error) {
    clearAuth();
    setStatus("authStatus", error.message, true, true);
  }
}

async function registerAccount() {
  const email = emailInput();
  const password = passwordInput();
  if (!email || !password) {
    setStatus("authStatus", "Email and password are required.", true, true);
    return;
  }
  const payload = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuth({ token: payload.token, user: payload.user });
  renderAccountStatus(payload);
  setStatus("authStatus", `Registered. Welcome bonus: ${payload.welcome_bonus || 0} coins.`, false, true);
}

async function loginAccount() {
  const email = emailInput();
  const password = passwordInput();
  if (!email || !password) {
    setStatus("authStatus", "Email and password are required.", true, true);
    return;
  }
  const payload = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuth({ token: payload.token, user: payload.user });
  renderAccountStatus(payload);
  setStatus("authStatus", "Logged in.", false, true);
}

async function logoutAccount() {
  if (!authToken()) {
    clearAuth();
    return;
  }
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Token may already be invalid; clear local state anyway.
  }
  clearAuth();
  setStatus("authStatus", "Logged out.", false, true);
}

async function startCoinCheckout(packageId) {
  if (!authToken()) {
    setStatus("authStatus", "Login required before checkout.", true, true);
    return;
  }
  const successUrl = `${window.location.origin}${window.location.pathname}?checkout=success`;
  const cancelUrl = `${window.location.origin}${window.location.pathname}?checkout=cancel`;
  const payload = await api("/api/coins/checkout", {
    method: "POST",
    body: JSON.stringify({ package_id: packageId, success_url: successUrl, cancel_url: cancelUrl }),
  });
  if (payload.checkout_url) {
    window.location.href = payload.checkout_url;
    return;
  }
  setStatus("authStatus", "Checkout session created but no redirect URL returned.", true, true);
}

async function askAiCoach() {
  if (!authToken()) {
    setStatus("aiCoachStatus", "Login required to use AI coach.", true, true);
    return;
  }
  const prompt = byId("aiCoachPrompt").value.trim();
  if (!prompt) {
    setStatus("aiCoachStatus", "Enter an AI question first.", true, true);
    return;
  }
  const deckText = byId("deckList").value.trim();
  setStatus("aiCoachStatus", "Asking AI coach...");
  try {
    const payload = await api("/api/ai/deck-coach", {
      method: "POST",
      body: JSON.stringify({ prompt, deck_text: deckText }),
    });
    byId("aiCoachResult").textContent = text(payload.answer || "");
    setStatus("aiCoachStatus", `AI answer ready. Coins remaining: ${payload.balance?.coins ?? "-"}.`, false, true);
    await refreshAccount();
  } catch (error) {
    setStatus("aiCoachStatus", error.message, true, true);
  }
}

function wireCopyHelpers() {
  const importCmd = 'cd "/path/to/mtg-decks" && . .venv/bin/activate && python scripts/import_arena_collection.py';
  const macPath = "~/Library/Logs/Wizards Of The Coast/MTGA/Player.log";
  const winPath = "%USERPROFILE%\\AppData\\LocalLow\\Wizards Of The Coast\\MTGA\\Player.log";

  byId("copyImportCommand").addEventListener("click", () => {
    copyText(importCmd, "collectionStatus", "Import command copied.", "Copy failed.");
  });
  byId("copyMacLogPath").addEventListener("click", () => {
    copyText(macPath, "collectionStatus", "macOS log path copied.", "Copy failed.");
  });
  byId("copyWindowsLogPath").addEventListener("click", () => {
    copyText(winPath, "collectionStatus", "Windows log path copied.", "Copy failed.");
  });
}

function wireQuickDock() {
  byId("jumpToTop").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  byId("jumpToSetup").addEventListener("click", () => {
    byId("setupPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  byId("jumpToOptimize").addEventListener("click", () => {
    byId("optimizePanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function wireEvents() {
  const commanderSearchDebounced = debounce(() => {
    loadCommanders().catch((error) => setStatus("deckStatus", error.message, true, true));
  }, 260);
  const partnerCommanderSearchDebounced = debounce(() => {
    refreshLegalPartnerOptions().catch((error) => setStatus("deckStatus", error.message, true, true));
  }, 260);

  byId("format").addEventListener("change", () => {
    setRoleSliderValuesForFormat(byId("format").value);
    loadCommanders().catch((error) => setStatus("deckStatus", error.message, true, true));
  });

  byId("commanderQuery").addEventListener("input", commanderSearchDebounced);
  byId("partnerCommanderQuery").addEventListener("input", partnerCommanderSearchDebounced);
  byId("commanderSelect").addEventListener("change", () => {
    refreshLegalPartnerOptions().catch((error) => setStatus("deckStatus", error.message, true, true));
    setRoleSliderValuesForFormat(byId("format").value, false);
    renderSelectedCommander(selectedCommanderPair());
  });
  byId("partnerCommanderSelect").addEventListener("change", () => {
    setRoleSliderValuesForFormat(byId("format").value, false);
    renderSelectedCommander(selectedCommanderPair());
  });

  byId("loadCommanders").addEventListener("click", () => loadCommanders().catch((error) => setStatus("deckStatus", error.message, true, true)));
  byId("suggestDeck").addEventListener("click", () => suggestDeck().catch((error) => setStatus("deckStatus", error.message, true, true)));
  byId("analyzeImportedDeck").addEventListener("click", () => analyzeImportedDeck().catch((error) => setStatus("importStatus", error.message, true, true)));

  byId("importCollection").addEventListener("click", () => importCollection().catch((error) => setStatus("collectionStatus", error.message, true, true)));
  byId("refreshCollection").addEventListener("click", () => refreshCollection().catch((error) => setStatus("collectionStatus", error.message, true, true)));
  byId("downloadCollectionCsv").addEventListener("click", () => downloadCollectionCsv().catch((error) => setStatus("collectionStatus", error.message, true, true)));

  byId("copyDeck").addEventListener("click", copyDeckText);
  byId("copyOptimizedDeck").addEventListener("click", copyOptimizedDeckText);
  byId("downloadDeck").addEventListener("click", downloadDeckText);

  byId("deckViewMode").addEventListener("change", rerenderDeckIfPresent);
  byId("deckSortBy").addEventListener("change", rerenderDeckIfPresent);
  byId("deckRoleFilter").addEventListener("change", rerenderDeckIfPresent);

  byId("cardSize").addEventListener("input", syncCardSize);
  byId("uiScale").addEventListener("input", syncUiScale);
  byId("motionLevel").addEventListener("input", syncMotionLevel);
  byId("themePreset").addEventListener("change", () => applyThemePreset("themePreset"));
  byId("themePresetQuick").addEventListener("change", () => applyThemePreset("themePresetQuick"));
  byId("confettiMode").addEventListener("change", syncConfettiMode);
  byId("roleScaleMode").addEventListener("change", syncRoleScaleMode);
  byId("infoDensity").addEventListener("change", syncInfoDensity);

  for (const key of roleKeys()) {
    byId(roleInputId(key))?.addEventListener("input", () => {
      rebalanceRoleTargets(key);
      updateRoleOutputs();
    });
  }
  document.querySelectorAll("#rolePresetButtons button[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => applyRolePreset(btn.dataset.preset || "balanced"));
  });

  byId("searchCards").addEventListener("click", () => {
    searchCards().catch((error) => setStatus("deckStatus", error.message, true, true));
  });

  byId("saveApiBase").addEventListener("click", saveApiBase);
  byId("registerBtn").addEventListener("click", () => registerAccount().catch((error) => setStatus("authStatus", error.message, true, true)));
  byId("loginBtn").addEventListener("click", () => loginAccount().catch((error) => setStatus("authStatus", error.message, true, true)));
  byId("logoutBtn").addEventListener("click", () => logoutAccount().catch((error) => setStatus("authStatus", error.message, true, true)));
  byId("refreshAccountBtn").addEventListener("click", () => refreshAccount().catch((error) => setStatus("authStatus", error.message, true, true)));
  byId("askAiCoach").addEventListener("click", () => askAiCoach().catch((error) => setStatus("aiCoachStatus", error.message, true, true)));
  byId("copyAiCoachResult").addEventListener("click", () => copyText(byId("aiCoachResult").textContent || "", "aiCoachStatus", "AI answer copied.", "Copy failed."));
  byId("closeCardPreview")?.addEventListener("click", (event) => {
    event.preventDefault();
    closeCardPreview();
  });

  const previewModal = byId("cardPreviewModal");
  previewModal?.addEventListener("click", (event) => {
    const rect = previewModal.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      closeCardPreview();
    }
  });

  wireCopyHelpers();
  wireQuickDock();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCardPreview();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      suggestDeck().catch((error) => setStatus("deckStatus", error.message, true, true));
    }
  });
}

async function init() {
  renderRoleSliders();
  renderRoleFilterOptions();
  applySavedUiSettings();
  syncCardSize();
  syncUiScale();
  syncMotionLevel();
  syncConfettiMode();
  syncInfoDensity();
  applyThemePreset();
  state.auth = readAuthState();
  renderAccountStatus(null);
  setRoleSliderValuesForFormat(byId("format").value);

  setupScrollProgress();
  setupRevealObserver();
  wireEvents();

  await loadCoinPackages();
  await refreshAccount();
  await refreshMeta();
  await loadCommanders();
  byId("comboPanel").hidden = true;
  const checkoutResult = new URLSearchParams(window.location.search).get("checkout");
  if (checkoutResult === "success") {
    setStatus("authStatus", "Checkout completed. Refreshing coin balance...", false, true);
    await refreshAccount();
  } else if (checkoutResult === "cancel") {
    setStatus("authStatus", "Checkout canceled.", true, true);
  }
  setStatus("deckStatus", "Ready. Choose a commander and press Generate Deck.");
}

init().catch((error) => {
  setStatus("deckStatus", error.message || String(error), true, true);
});
