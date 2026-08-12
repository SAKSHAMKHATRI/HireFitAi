"use client"

/**
 * Theme system (Phase 5).
 *
 * The app is dark-first: `<html>` starts with the `dark` class (see
 * `src/app/layout.tsx`, which also installs a tiny inline script that
 * restores a persisted light preference before hydration to avoid a
 * flash).
 *
 * Hydration safety: `useState` always initializes to `"dark"` — both on the
 * server AND during the first client render — so the client's initial HTML
 * always matches the server-rendered output (no React hydration mismatch on
 * the theme toggle icon/label). The persisted preference is then adopted in
 * an effect right after mount, and the `dark` class is applied only once the
 * adopted theme is known (so the inline script's pre-hydration fix is never
 * clobbered by a stale "dark" class). Toggling afterwards behaves exactly as
 * before.
 */

import { useCallback, useEffect, useState } from "react"

export type Theme = "dark" | "light"

const themeKey = "hirefit_theme"

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  const stored = window.localStorage.getItem(themeKey)
  return stored === "light" ? "light" : "dark"
}

export function applyThemeClass(theme: Theme): void {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function useTheme() {
  // Always start from the SSR value so the first client render matches the
  // server HTML exactly. The persisted preference is adopted after mount.
  const [theme, setThemeState] = useState<Theme>("dark")
  const [adopted, setAdopted] = useState(false)

  useEffect(() => {
    setThemeState(loadTheme())
    setAdopted(true)
  }, [])

  useEffect(() => {
    if (!adopted) return
    applyThemeClass(theme)
    try {
      window.localStorage.setItem(themeKey, theme)
    } catch {
      // Storage failures are non-fatal; the theme still applies for this session.
    }
  }, [theme, adopted])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
    []
  )

  return { theme, setTheme, toggleTheme }
}
