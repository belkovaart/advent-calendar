/* =========================
   CONFIG
   ========================= */

// переключатель режима:
// - "JAN"  — реальный режим: 1–7 января 2026
// - "TEST" — ручной тест: можно выставить любой "сегодняшний день" 1..7
const CONFIG = {
  year: 2026,
  mode: "TEST", // <- на время тестов поставь "TEST"
  testDay: 2, // <- для TEST: 1..7
};

const STORAGE_KEY = "advent_opened_days_2026";

/* тексты событий */
const OFFERS = {
  1: "Today we will be launching fireworks 🎆",
  2: "Today we're sliding down the hill and sipping mulled wine!🍷",
  3: "Пора испытать поводья 😉",
  4: "Зайдёт медсестра проверить самочувствие",
  5: "Варим глинтвейн и слушаем музыку",
  6: "Сегодня к тебе придёт монашка, почистить твою душу ✨",
  7: "Ты чист и свеж, розовая девушка благославит тебя на отличный год 🎁",
};

/* =========================
   STORAGE
   ========================= */

function getOpenedDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOpenedDays(days) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
}

/* =========================
   DATE
   ========================= */

function getTodayIndex() {
  // TEST: вручную подставляем "сегодня"
  if (CONFIG.mode === "TEST") {
    const forced = Number(CONFIG.testDay);
    if (!Number.isFinite(forced) || forced < 1 || forced > 7) {
      return { allowedDay: null, newYearDay: null };
    }
    return { allowedDay: forced, newYearDay: forced };
  }

  // JAN: реальные даты 1..7 января CONFIG.year
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1..12
  const d = now.getDate(); // 1..31

  if (y === CONFIG.year && m === 1 && d >= 1 && d <= 7) {
    return { allowedDay: d, newYearDay: d };
  }

  return { allowedDay: null, newYearDay: null };
}

function getUnlockDateForDay(day) {
  // 1..7 января CONFIG.year
  return new Date(CONFIG.year, 0, day);
}

function formatRuDate(date) {
  // "1 января"
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
}

/* =========================
   DOM
   ========================= */

function setTodayBanner() {
  const el = document.getElementById("todayDay");
  if (!el) return;

  const { newYearDay } = getTodayIndex();
  el.textContent = newYearDay ? String(newYearDay) : "—";
}

function applyTexts() {
  document.querySelectorAll(".day-card").forEach((card) => {
    const day = Number(card.dataset.day);
    const contentText = card.querySelector(".day-card__text");
    if (contentText) contentText.textContent = OFFERS[day] ?? "";
  });
}

function setState(card, state) {
  card.classList.remove(
    "day-card--future",
    "day-card--available",
    "day-card--opened",
    "day-card--past"
  );
  card.classList.add(state);
}

/* =========================
   STATE MACHINE
   ========================= */

function updateCardsState() {
  const { allowedDay } = getTodayIndex();
  const openedDays = new Set(getOpenedDays());

  document.querySelectorAll(".day-card").forEach((card) => {
    const day = Number(card.dataset.day);

    const openBtn = card.querySelector(".day-card__action--open");
    const lockedEl = card.querySelector(".day-card__action--locked");
    const content = card.querySelector(".day-card__content");
    const previewWrap = card.querySelector(".day-card__preview");
    const previewText = card.querySelector(".day-card__previewText");

    // reset
    if (openBtn) {
      openBtn.disabled = true;
      openBtn.setAttribute("disabled", "");
      openBtn.removeAttribute("title");
    }
    if (content) content.setAttribute("aria-hidden", "true");
    if (previewWrap) previewWrap.setAttribute("aria-hidden", "true");
    if (previewText) {
      previewText.textContent = "past day";
      previewText.removeAttribute("title");
    }
    if (lockedEl) lockedEl.removeAttribute("title");

    // вне диапазона: всё future + тултип с датой
    if (allowedDay === null) {
      setState(card, "day-card--future");

      if (lockedEl) {
        const unlock = getUnlockDateForDay(day);
        lockedEl.title = `Will be available ${formatRuDate(unlock)}`;
      }
      return;
    }

    // прошлые дни всегда past (даже если были открыты)
    if (day < allowedDay) {
      setState(card, "day-card--past");

      if (previewWrap) previewWrap.setAttribute("aria-hidden", "false");

      if (previewText && openedDays.has(day)) {
        const text = OFFERS[day] ?? "";
        previewText.textContent =
          text.length > 40 ? text.slice(0, 40) + "…" : text;
        previewText.title = text; // полный текст при наведении
      }

      return;
    }

    // сегодня и уже открыто
    if (day === allowedDay && openedDays.has(day)) {
      setState(card, "day-card--opened");
      if (content) content.setAttribute("aria-hidden", "false");
      return;
    }

    // сегодня доступно
    if (day === allowedDay) {
      setState(card, "day-card--available");

      if (openBtn) {
        openBtn.disabled = false;
        openBtn.removeAttribute("disabled");
      }

      return;
    }

    // будущие дни
    setState(card, "day-card--future");

    if (lockedEl) {
      const unlock = getUnlockDateForDay(day);
      lockedEl.title = `Will be available ${formatRuDate(unlock)}`;
    }
  });
}

/* =========================
   INTERACTIONS
   ========================= */

function bindOpenHandlers() {
  document.querySelectorAll(".day-card").forEach((card) => {
    const day = Number(card.dataset.day);
    const btn = card.querySelector(".day-card__action--open");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const { allowedDay } = getTodayIndex();
      if (allowedDay !== day) return;

      const opened = new Set(getOpenedDays());
      if (opened.has(day)) return;

      opened.add(day);
      saveOpenedDays([...opened]);

      updateCardsState();
    });
  });
}

/* =========================
   INIT
   ========================= */

applyTexts();
bindOpenHandlers();
setTodayBanner();
updateCardsState();

setInterval(() => {
  setTodayBanner();
  updateCardsState();
}, 60 * 1000);



