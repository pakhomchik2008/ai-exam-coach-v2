/**
 * Client call for Settings → Delete account.
 * Server wipes the auth user; personal rows cascade. Local clear is the
 * caller's job after `{ ok: true }` so a failed request cannot log the
 * student out with their cloud copy still alive.
 *
 * Demo has no auth user — local wipe is enough, same as Erase study data
 * plus leaving the demo session.
 */

import { apiUrl } from "./platform";

function w(): Window & {
  apiHeaders?: () => Promise<Record<string, string>>;
  getSession?: () => { mode?: string } | null;
} {
  return window;
}

export async function deleteAccount(): Promise<{ ok?: true; error?: string }> {
  const headers = await w().apiHeaders?.();
  if (!headers || !headers.Authorization) {
    if (w().getSession?.()?.mode === "demo") return { ok: true };
    return { error: "Sign in to delete your account." };
  }
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/delete-account"), { method: "POST", headers });
  } catch {
    return { error: "Could not reach the server." };
  }
  const body = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
  if (!res.ok) return { error: body.error || "Could not delete the account." };
  return { ok: true };
}
