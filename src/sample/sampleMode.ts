/// <reference types="vite/client" />
// Sample mode: render the app with a fictional in-memory dataset and no auth.
// Dev-only. Enable with `VITE_SAMPLE=1 yarn dev` or by adding `?sample` to the URL.
// Production builds never enter sample mode (import.meta.env.DEV is false there).
export const IS_SAMPLE: boolean =
  import.meta.env.DEV &&
  (import.meta.env.VITE_SAMPLE === '1' ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sample')));

// Screenshot helpers (sample mode only): show a couple of goals expanded, and
// `?sample&reflection` opens last month's reflection once data has loaded.
if (IS_SAMPLE) {
  try { localStorage.setItem('expandedGoals', JSON.stringify(['qg0', 'qg1'])); } catch { /* ignore */ }
}
export const SAMPLE_OPEN_REFLECTION: boolean =
  IS_SAMPLE && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('reflection');
