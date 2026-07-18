/**
 * Blocking theme bootstrap — applied before React hydrates to avoid FOUC.
 * Keep the storage key in sync with `THEME_STORAGE_KEY` in `src/shared/lib/theme.ts`.
 */
(function () {
  try {
    var key = "ph.theme";
    var preference = "system";
    var raw = localStorage.getItem(key);
    if (raw) {
      var data = JSON.parse(raw);
      var stored = data && data.state && data.state.preference;
      if (stored === "light" || stored === "dark" || stored === "system") {
        preference = stored;
      }
    }
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved =
      preference === "system" ? (prefersDark ? "dark" : "light") : preference;
    var root = document.documentElement;
    if (resolved === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.colorScheme = resolved;
  } catch {
    // Ignore storage / parse failures — ThemeProvider will apply a safe default.
  }
})();
