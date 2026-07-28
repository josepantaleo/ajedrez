"use strict";

// =========================
// UTILIDADES PURAS
// Funciones sin dependencias del estado global ni del DOM.
// Movidas acá primero porque son las únicas 100% seguras de aislar
// sin riesgo de romper referencias cruzadas con el resto de la app.
// =========================

export function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

export function capitalizeFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

export function cpToWin(cp) {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

export function classifyLoss(loss) {
  if (loss < 15) return "best";
  if (loss < 40) return "good";
  if (loss < 90) return "inaccuracy";
  if (loss < 200) return "mistake";
  return "blunder";
}

export function levelLabel(level) {
  if (level <= 3) return "Principiante";
  if (level <= 7) return "Intermedio";
  return "Avanzado";
}