// Recovery for Next.js ChunkLoadError.
//
// When a new build is deployed, the JS chunk filenames change (their content
// hash changes). A browser that still has the *old* page open will try to fetch
// a chunk URL that no longer exists on the CDN — e.g. on route navigation or a
// lazy import — and throw a `ChunkLoadError: Loading chunk NNNN failed`.
//
// The only real fix is to reload so the browser pulls the fresh HTML + chunk
// manifest. We do a single hard reload, guarded by sessionStorage so a chunk
// that is *genuinely* gone (not just stale) can't trap the user in a reload
// loop — after one recent attempt we stop and let the error surface normally.

const RELOAD_KEY = "chunk-reload-at";
const COOLDOWN_MS = 10_000;

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  if (e.name === "ChunkLoadError") return true;
  const msg = e.message ?? String(err);
  return /Loading chunk [\w-]+ failed|ChunkLoadError|(import|importing) (a )?(dynamically )?(imported )?module/i.test(
    msg,
  );
}

// Returns true if it kicked off a reload (caller should stop further handling).
export function maybeReloadForChunkError(err: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (!isChunkLoadError(err)) return false;

  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) return false; // already tried recently — avoid a loop
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode quota etc.) — reload anyway, once.
  }

  window.location.reload();
  return true;
}
