// Storage usando Upstash Redis REST API
// Formato correto: POST /pipeline com array de comandos Redis

const KV_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redisCmd(...args) {
  const r = await fetch(`${KV_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([args]),
  });
  if (!r.ok) throw new Error(`Upstash ${r.status}: ${await r.text()}`);
  const data = await r.json();
  // pipeline retorna array de resultados
  return data[0]?.result ?? null;
}

async function kvGet(key) {
  return redisCmd("GET", key);
}

async function kvSet(key, value) {
  await redisCmd("SET", key, value);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  if (!KV_URL || !KV_TOKEN) {
    res.status(500).json({ error: `KV não configurado. URL=${KV_URL ? "ok" : "MISSING"} TOKEN=${KV_TOKEN ? "ok" : "MISSING"}` });
    return;
  }

  const { action, userHash, bu } = req.body || {};

  // DIAGNÓSTICO
  if (action === "ping") {
    try {
      await kvSet("ping:test", "pong");
      const val = await kvGet("ping:test");
      res.status(200).json({ ok: true, got: val, url: KV_URL.slice(0, 35) + "..." });
    } catch (e) {
      res.status(200).json({ ok: false, error: e.message });
    }
    return;
  }

  try {
    if (action === "checkUser") {
      const raw = await kvGet(`user:${userHash}`);
      res.status(200).json({ exists: !!raw, user: raw ? JSON.parse(raw) : null });
      return;
    }

    if (action === "registerUser") {
      const { name, userHash: hash } = req.body;
      const existing = await kvGet(`user:${hash}`);
      const user = existing ? JSON.parse(existing) : { name, hash, createdAt: new Date().toISOString() };
      if (!existing) await kvSet(`user:${hash}`, JSON.stringify(user));
      res.status(200).json({ ok: true, user });
      return;
    }

    if (action === "listPublicPresets") {
      const raw = await kvGet(`presets:public:${bu}`);
      res.status(200).json({ presets: raw ? JSON.parse(raw) : [] });
      return;
    }

    if (action === "listPrivatePresets") {
      const raw = await kvGet(`presets:private:${userHash}:${bu}`);
      res.status(200).json({ presets: raw ? JSON.parse(raw) : [] });
      return;
    }

    if (action === "savePreset") {
      const { preset, visibility } = req.body;
      const key = visibility === "public"
        ? `presets:public:${bu}`
        : `presets:private:${userHash}:${bu}`;
      const raw = await kvGet(key);
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((p) => p.id === preset.id);
      if (idx >= 0) list[idx] = preset;
      else list.unshift(preset);
      await kvSet(key, JSON.stringify(list));
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "deletePreset") {
      const { presetId, visibility } = req.body;
      const key = visibility === "public"
        ? `presets:public:${bu}`
        : `presets:private:${userHash}:${bu}`;
      const raw = await kvGet(key);
      const list = raw ? JSON.parse(raw) : [];
      await kvSet(key, JSON.stringify(list.filter((p) => p.id !== presetId)));
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    res.status(500).json({ error: `Erro no storage: ${e.message}` });
  }
}
