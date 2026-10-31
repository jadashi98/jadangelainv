import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_SETTINGS, type WeddingSettings } from "./settings";
import { effectiveLimit, MAX_PHOTO_BYTES, ALLOWED_TYPES } from "./photo-rules";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadRules() {
  const db = await admin();
  const { data } = await db.from("site_settings").select("data").eq("id", 1).maybeSingle();
  const s = { ...DEFAULT_SETTINGS, ...((data?.data ?? {}) as Partial<WeddingSettings>) };
  return { db, limit: effectiveLimit(s.uploadLimit), enabled: s.uploadsEnabled !== false };
}

async function sessionFor(db: Awaited<ReturnType<typeof admin>>, token: string) {
  if (!token || token.length < 32) throw new Error("invalid_session");
  const { data } = await db.from("guest_tokens").select("session_id").eq("token_hash", await sha256(token)).maybeSingle();
  if (!data) throw new Error("invalid_session");
  return data.session_id;
}

async function status(db: Awaited<ReturnType<typeof admin>>, sessionId: string, limit: number) {
  const { data } = await db
    .from("photos")
    .select("id, path")
    .eq("session_id", sessionId)
    .eq("status", "done")
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const urls: { id: string; url: string }[] = [];
  if (rows.length) {
    const { data: signed } = await db.storage.from("wedding-photos").createSignedUrls(rows.map((r) => r.path), 3600);
    signed?.forEach((s, i) => s.signedUrl && urls.push({ id: rows[i]!.id, url: s.signedUrl }));
  }
  return { used: rows.length, limit, photos: urls };
}

/** Creates (or resumes) this guest's private upload session. */
export const startGuestSession = createServerFn({ method: "POST" })
  .inputValidator((d: { token?: string | null; name?: string | null }) => ({
    token: typeof d.token === "string" ? d.token : null,
    name: typeof d.name === "string" ? d.name.trim().slice(0, 80) : null,
  }))
  .handler(async ({ data }) => {
    const { db, limit, enabled } = await loadRules();
    if (data.token) {
      try {
        const sid = await sessionFor(db, data.token);
        if (data.name) await db.from("guest_sessions").update({ guest_name: data.name }).eq("id", sid);
        return { token: data.token, enabled, ...(await status(db, sid, limit)) };
      } catch {
        /* fall through to a new session */
      }
    }
    const { data: s, error } = await db.from("guest_sessions").insert({ guest_name: data.name }).select("id").single();
    if (error) throw new Error("server_error");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    await db.from("guest_tokens").insert({ token_hash: await sha256(token), session_id: s.id });
    return { token, enabled, used: 0, limit, photos: [] as { id: string; url: string }[] };
  });

/** Reserves one of the guest's slots and returns a one-time signed upload ticket. */
export const requestUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; name: string; type: string; size: number }) => d)
  .handler(async ({ data }) => {
    const { db, limit, enabled } = await loadRules();
    if (!enabled) return { error: "disabled" as const };
    if (!ALLOWED_TYPES.includes(data.type)) return { error: "type" as const };
    if (!(data.size > 0) || data.size > MAX_PHOTO_BYTES) return { error: "size" as const };
    const sid = await sessionFor(db, data.token);
    const ext = (data.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `${sid}/${crypto.randomUUID()}.${ext}`;
    const { data: photoId, error } = await db.rpc("reserve_photo_slot", {
      _session: sid, _limit: limit, _path: path, _name: data.name.slice(0, 200), _type: data.type, _size: data.size,
    });
    if (error) return { error: error.message.includes("limit_reached") ? ("limit" as const) : ("server" as const) };
    const { data: up, error: upErr } = await db.storage.from("wedding-photos").createSignedUploadUrl(path);
    if (upErr || !up) return { error: "server" as const };
    return { photoId: photoId as string, path, uploadToken: up.token };
  });

/** Marks an upload complete after verifying the file really landed in storage. */
export const confirmUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; photoId: string }) => d)
  .handler(async ({ data }) => {
    const { db, limit } = await loadRules();
    const sid = await sessionFor(db, data.token);
    const { data: p } = await db.from("photos").select("path").eq("id", data.photoId).eq("session_id", sid).maybeSingle();
    if (!p) throw new Error("not_found");
    const [folder, file] = p.path.split("/");
    const { data: list } = await db.storage.from("wedding-photos").list(folder, { search: file ?? "" });
    if (!list?.some((o) => o.name === file)) throw new Error("missing_file");
    await db.from("photos").update({ status: "done" }).eq("id", data.photoId);
    return status(db, sid, limit);
  });
