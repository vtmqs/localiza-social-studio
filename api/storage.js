// Endpoint de storage usando Upstash Redis (KV) via REST API.
// Variáveis necessárias (criadas automaticamente pela integração Vercel/Upstash):
//   KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN

// Variáveis criadas pela integração Vercel/Upstash (nomes podem variar por idioma da UI)
const KV_URL = process.env.KV_REST_API_URL || process.env["URL da API REST KV"] || process.env.URL_KV;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_READ_TOKEN = process.env.KV_REST_API_READ_ONLY_TOKEN;

async function kvGet(key) {
  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_READ_TOKEN}` },
  });
  const data = await r.json();
  return data.result ?? null;
}

async function kvSet(key, value) {
  // API REST do Upstash: POST /set/KEY com body sendo o valor como string
  const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([value]),
  });
  return r.ok;
}

async function kvDel(key) {
  const r = await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  return r.ok;
}

export default async function handler(req, res) {
  if (!KV_URL || !KV_TOKEN) {
    res.status(500).json({ error: "Upstash KV não configurado." });
    return;
  }

  const { action, key, value, userHash, bu } = req.body || {};

  // ---- DIAGNÓSTICO ----
  if (action === "ping") {
    try {
      await kvSet("ping:test", "ok");
      const val = await kvGet("ping:test");
      res.status(200).json({ ok: true, got: val, url: KV_URL ? KV_URL.slice(0, 30) + "..." : "MISSING", token: KV_TOKEN ? "ok" : "MISSING" });
    } catch (e) {
      res.status(200).json({ ok: false, error: e.message, url: KV_URL ? KV_URL.slice(0, 30) + "..." : "MISSING" });
    }
    return;
  }

  try {
    // ---- VERIFICAR SE USUÁRIO JÁ EXISTE ----
    if (action === "checkUser") {
      const existing = await kvGet(`user:${userHash}`);
      res.status(200).json({ exists: !!existing, user: existing ? JSON.parse(existing) : null });
      return;
    }

    // ---- CADASTRAR USUÁRIO ----
    if (action === "registerUser") {
      const { name, userHash: hash } = req.body;
      const existing = await kvGet(`user:${hash}`);
      if (existing) {
        res.status(200).json({ ok: true, user: JSON.parse(existing) });
        return;
      }
      const user = { name, hash, createdAt: new Date().toISOString() };
      await kvSet(`user:${hash}`, JSON.stringify(user));
      res.status(200).json({ ok: true, user });
      return;
    }

    // ---- LISTAR ESTILOS PÚBLICOS DE UMA BU ----
    if (action === "listPublicPresets") {
      const raw = await kvGet(`presets:public:${bu}`);
      const presets = raw ? JSON.parse(raw) : [];
      res.status(200).json({ presets });
      return;
    }

    // ---- LISTAR ESTILOS PRIVADOS DE UM USUÁRIO ----
    if (action === "listPrivatePresets") {
      const raw = await kvGet(`presets:private:${userHash}:${bu}`);
      const presets = raw ? JSON.parse(raw) : [];
      res.status(200).json({ presets });
      return;
    }

    // ---- SALVAR ESTILO (PÚBLICO OU PRIVADO) ----
    if (action === "savePreset") {
      const { preset, visibility } = req.body;
      if (visibility === "public") {
        const raw = await kvGet(`presets:public:${bu}`);
        const list = raw ? JSON.parse(raw) : [];
        // atualiza se já existe, senão adiciona
        const idx = list.findIndex((p) => p.id === preset.id);
        if (idx >= 0) list[idx] = preset;
        else list.unshift(preset);
        await kvSet(`presets:public:${bu}`, JSON.stringify(list));
      } else {
        const raw = await kvGet(`presets:private:${userHash}:${bu}`);
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((p) => p.id === preset.id);
        if (idx >= 0) list[idx] = preset;
        else list.unshift(preset);
        await kvSet(`presets:private:${userHash}:${bu}`, JSON.stringify(list));
      }
      res.status(200).json({ ok: true });
      return;
    }

    // ---- DELETAR ESTILO ----
    if (action === "deletePreset") {
      const { presetId, visibility } = req.body;
      const storageKey =
        visibility === "public"
          ? `presets:public:${bu}`
          : `presets:private:${userHash}:${bu}`;
      const raw = await kvGet(storageKey);
      const list = raw ? JSON.parse(raw) : [];
      const updated = list.filter((p) => p.id !== presetId);
      await kvSet(storageKey, JSON.stringify(updated));
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    res.status(500).json({ error: `Erro no storage: ${e.message}` });
  }
}
