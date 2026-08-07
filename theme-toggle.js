"use strict";

(() => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const icon = toggle.querySelector(".theme-toggle-icon");
  const label = toggle.querySelector(".theme-toggle-label");
  const darkThemes = new Set([
    "blue",
    "wood",
    "green",
    "purple",
    "red",
    "ocean",
    "midnight",
  ]);

  function currentTheme() {
    return (
      document.body.dataset.theme ||
      localStorage.getItem("chessTheme") ||
      "blue"
    );
  }

  function rememberDarkTheme(theme) {
    if (darkThemes.has(theme)) {
      localStorage.setItem("chessLastDarkTheme", theme);
    }
  }

  function updateToggle() {
    const activeTheme = currentTheme();
    const lightMode = activeTheme === "light";
    const action = lightMode ? "Modo oscuro" : "Modo claro";
    const accessibleAction = lightMode
      ? "Activar modo oscuro"
      : "Activar modo claro";

    rememberDarkTheme(activeTheme);
    icon.textContent = lightMode ? "\u263e" : "\u2600";
    label.textContent = action;
    toggle.setAttribute("aria-label", accessibleAction);
    toggle.setAttribute("title", accessibleAction);
    toggle.setAttribute("aria-pressed", String(lightMode));
  }

  toggle.addEventListener("click", () => {
    const activeTheme = currentTheme();
    const nextTheme =
      activeTheme === "light"
        ? localStorage.getItem("chessLastDarkTheme") || "blue"
        : "light";

    rememberDarkTheme(activeTheme);

    if (typeof applyTheme === "function") {
      applyTheme(nextTheme);
    } else {
      document.body.dataset.theme = nextTheme;
      localStorage.setItem("chessTheme", nextTheme);
    }

    updateToggle();
  });

  new MutationObserver(updateToggle).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  updateToggle();
})();
