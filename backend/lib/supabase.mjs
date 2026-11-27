// Ixtiyoriy Supabase bulutli zaxira va sinxronizatsiya moduli.
// SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY .env da berilganda ishga tushadi; bo'lmasa mahalliy SQLite o'zi to'liq ishlaydi.

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function syncSnapshotToSupabase(userId, payload) {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key || !userId) return { skipped: true };

  try {
    const res = await fetch(`${url}/rest/v1/mizan_backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'resolution=merge-duplicates',
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        user_id: String(userId),
        payload,
        updated_at: new Date().toISOString(),
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
