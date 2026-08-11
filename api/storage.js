// Backend usando Google Sheets como banco de dados
const SHEET_ID = "1MORipRhbN8-X-Afpata5zLfXLq0oBaf8DpP2hTzWtcs";
const SHEET_NAME = "Presets";
const OWNER_EMAIL = "vitoriatmqs@gmail.com";

async function getAccessToken() {
  const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(claim)}`;
  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const jwt = `${signingInput}.${sign.sign(key, "base64url")}`;
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const data = await r.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sheetsGet(token, range) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${token}` } });
  return (await r.json()).values || [];
}

async function sheetsAppend(token, values, sheetName = SHEET_NAME) {
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
}

async function sheetsUpdate(token, range, values) {
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
}

async function sheetsClear(token, range) {
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

async function getAllPresets(token) {
  const rows = await sheetsGet(token, `${SHEET_NAME}!A2:E`);
  return rows.map((r, i) => ({ id: r[0] || "", bu: r[1] || "", visibility: r[2] || "public", userHash: r[3] || "", preset: r[4] ? (() => { try { return JSON.parse(r[4]); } catch { return {}; } })() : {}, rowIndex: i + 2 }));
}

async function getAllUsers(token) {
  const rows = await sheetsGet(token, "Users!A2:D");
  return rows.map((r, i) => ({ hash: r[0] || "", name: r[1] || "", email: r[2] || "", role: r[3] || "user", rowIndex: i + 2 }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido" }); return; }

  try {
    const token = await getAccessToken();
    const { action, userHash, bu, email } = req.body || {};

    if (action === "ping") { res.status(200).json({ ok: true, got: "pong" }); return; }

    // ---- USUÁRIOS ----
    if (action === "checkUser") {
      const rows = await sheetsGet(token, "Users!A2:D");
      const user = rows.find((r) => r[0] === userHash);
      const isOwner = email === OWNER_EMAIL;
      // Se for owner mas não estiver na planilha ainda, retorna exists: true mesmo assim
      if (isOwner && !user) {
        res.status(200).json({ exists: true, user: { hash: userHash, name: email.split("@")[0], email, role: "owner" } });
        return;
      }
      if (!user) {
        res.status(200).json({ exists: false, user: null });
        return;
      }
      res.status(200).json({ exists: true, user: { hash: user[0], name: user[1], email: user[2] || email || "", role: isOwner ? "owner" : (user[3] || "user") } });
      return;
    }

    if (action === "registerUser") {
      const { name, userHash: hash, email: userEmail } = req.body;
      const rows = await sheetsGet(token, "Users!A2:D");
      const existing = rows.find((r) => r[0] === hash);
      const role = userEmail === OWNER_EMAIL ? "owner" : "user";
      if (!existing) await sheetsAppend(token, [[hash, name, userEmail || "", role]], "Users");
      else if (existing[3] !== role && userEmail === OWNER_EMAIL) {
        const rowIdx = rows.indexOf(existing);
        await sheetsUpdate(token, `Users!D${rowIdx + 2}`, [["owner"]]);
      }
      res.status(200).json({ ok: true, user: { hash, name, email: userEmail || "", role } });
      return;
    }

    if (action === "listUsers") {
      const users = await getAllUsers(token);
      res.status(200).json({ users: users.map(u => ({ hash: u.hash, name: u.name, email: u.email, role: u.email === OWNER_EMAIL ? "owner" : u.role })) });
      return;
    }

    if (action === "setUserRole") {
      const { targetHash, role: newRole, requesterEmail } = req.body;
      if (requesterEmail !== OWNER_EMAIL) { res.status(403).json({ error: "Sem permissão." }); return; }
      const users = await getAllUsers(token);
      const idx = users.findIndex(u => u.hash === targetHash);
      if (idx < 0) { res.status(404).json({ error: "Usuário não encontrado." }); return; }
      if (users[idx].email === OWNER_EMAIL) { res.status(403).json({ error: "Não é possível alterar o proprietário." }); return; }
      await sheetsUpdate(token, `Users!D${users[idx].rowIndex}`, [[newRole]]);
      res.status(200).json({ ok: true });
      return;
    }

    // ---- PRESETS ----
    if (action === "listPublicPresets") {
      const all = await getAllPresets(token);
      res.status(200).json({ presets: all.filter(p => p.bu === bu && p.visibility === "public").map(p => p.preset) });
      return;
    }

    if (action === "listPrivatePresets") {
      const all = await getAllPresets(token);
      res.status(200).json({ presets: all.filter(p => p.bu === bu && p.visibility === "private" && p.userHash === userHash).map(p => p.preset) });
      return;
    }

    if (action === "listAllPresets") {
      // Só admin/owner pode ver todos
      const { requesterEmail } = req.body;
      const users = await getAllUsers(token);
      const requester = users.find(u => u.email === requesterEmail);
      if (!requester && requesterEmail !== OWNER_EMAIL) { res.status(403).json({ error: "Sem permissão." }); return; }
      if (requesterEmail !== OWNER_EMAIL && requester?.role !== "admin") { res.status(403).json({ error: "Sem permissão." }); return; }
      const all = await getAllPresets(token);
      res.status(200).json({ presets: all.map(p => ({ ...p.preset, _bu: p.bu, _visibility: p.visibility, _userHash: p.userHash })) });
      return;
    }

    if (action === "savePreset") {
      const { preset, visibility, userName } = req.body;
      const rows = await sheetsGet(token, `${SHEET_NAME}!A2:E`);
      const rowIdx = rows.findIndex((r) => r[0] === preset.id);
      const isNew = rowIdx < 0;
      const row = [preset.id, bu, visibility, userHash || "", JSON.stringify(preset)];
      if (rowIdx >= 0) await sheetsUpdate(token, `${SHEET_NAME}!A${rowIdx + 2}:E${rowIdx + 2}`, [row]);
      else await sheetsAppend(token, [row]);
      // Registrar atividade pública
      if (visibility === "public") {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        const desc = isNew ? `Criou o estilo "${preset.title}"` : `Atualizou o estilo "${preset.title}"`;
        await sheetsAppend(token, [[id, "preset", bu, userName || "Anônimo", desc, new Date().toISOString()]], "Activity");
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "adminUpdatePreset") {
      // Admin pode mudar visibilidade ou deletar qualquer preset
      const { presetId, preset, visibility: newVis } = req.body;
      const { requesterEmail } = req.body;
      const users = await getAllUsers(token);
      const requester = users.find(u => u.email === requesterEmail);
      if (requesterEmail !== OWNER_EMAIL && requester?.role !== "admin") { res.status(403).json({ error: "Sem permissão." }); return; }
      const rows = await sheetsGet(token, `${SHEET_NAME}!A2:E`);
      const rowIdx = rows.findIndex((r) => r[0] === presetId);
      if (rowIdx < 0) { res.status(404).json({ error: "Preset não encontrado." }); return; }
      const current = rows[rowIdx];
      const updated = [current[0], current[1], newVis || current[2], current[3], preset ? JSON.stringify(preset) : current[4]];
      await sheetsUpdate(token, `${SHEET_NAME}!A${rowIdx + 2}:E${rowIdx + 2}`, [updated]);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "deletePreset") {
      const { presetId } = req.body;
      const rows = await sheetsGet(token, `${SHEET_NAME}!A2:E`);
      const rowIdx = rows.findIndex((r) => r[0] === presetId);
      if (rowIdx >= 0) await sheetsClear(token, `${SHEET_NAME}!A${rowIdx + 2}:E${rowIdx + 2}`);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "logActivity") {
      const { type, bu: actBu, userName, description } = req.body;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      await sheetsAppend(token, [[id, type, actBu || "", userName || "Anônimo", description || "", new Date().toISOString()]], "Activity");
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "listActivity") {
      const rows = await sheetsGet(token, "Activity!A2:F");
      const activities = rows
        .filter(r => r[0] && (!bu || r[2] === bu))
        .map(r => ({ id: r[0], type: r[1], bu: r[2], userName: r[3], description: r[4], createdAt: r[5] }))
        .reverse()
        .slice(0, 50);
      res.status(200).json({ activities });
      return;
    }

    // ---- LEGENDAS ----
    if (action === "listCaptions") {
      const rows = await sheetsGet(token, "Captions!A2:P");
      const captions = rows
        .filter(r => r[0] && r[1] === bu)
        .filter(r => {
          const { requesterRole, requesterHash } = req.body;
          if (requesterRole === "admin" || requesterRole === "owner") return true;
          return r[10] === "public" || r[14] === requesterHash;
        })
        .map(r => ({
          id: r[0], bu: r[1], platform: r[2], legenda: r[3],
          hashtags: r[4] ? (() => { try { return JSON.parse(r[4]); } catch { return []; } })() : [],
          topico: r[5], presetTitle: r[6],
          seoScore: Number(r[7]) || 0, toneScore: Number(r[8]) || 0,
          destaque: r[9] === "true", visibility: r[10] || "private",
          savedBy: r[11], savedAt: r[12], publishDate: r[13] || "",
          userHash: r[14] || "",
          versions: r[15] ? (() => { try { return JSON.parse(r[15]); } catch { return []; } })() : [],
        }));
      res.status(200).json({ captions });
      return;
    }

    if (action === "saveCaption") {
      const { caption } = req.body;
      const rows = await sheetsGet(token, "Captions!A2:P");
      const rowIdx = rows.findIndex(r => r[0] === caption.id);
      // Se já existe, salva versão anterior antes de atualizar
      let versions = caption.versions || [];
      if (rowIdx >= 0 && rows[rowIdx][3]) {
        const prev = { legenda: rows[rowIdx][3], savedAt: rows[rowIdx][12] };
        versions = [prev, ...versions].slice(0, 10);
      }
      const row = [
        caption.id, caption.bu, caption.platform, caption.legenda,
        JSON.stringify(caption.hashtags || []),
        caption.topico || "", caption.presetTitle || "",
        caption.seoScore || 0, caption.toneScore || 0,
        String(!!caption.destaque), caption.visibility || "private",
        caption.savedBy || "Anônimo", caption.savedAt || new Date().toISOString(),
        caption.publishDate || "", caption.userHash || "",
        JSON.stringify(versions),
      ];
      if (rowIdx >= 0) await sheetsUpdate(token, `Captions!A${rowIdx + 2}:P${rowIdx + 2}`, [row]);
      else await sheetsAppend(token, [row], "Captions");
      // Registrar atividade se pública
      if (caption.visibility === "public") {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        await sheetsAppend(token, [[id, "caption", caption.bu, caption.savedBy, `Salvou legenda de ${caption.platform} sobre "${(caption.topico||"").slice(0,40)}"`, new Date().toISOString()]], "Activity");
      }
      res.status(200).json({ ok: true, versions });
      return;
    }

    if (action === "deleteCaption") {
      const { captionId } = req.body;
      const rows = await sheetsGet(token, "Captions!A2:P");
      const rowIdx = rows.findIndex(r => r[0] === captionId);
      if (rowIdx >= 0) await sheetsClear(token, `Captions!A${rowIdx + 2}:P${rowIdx + 2}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    res.status(500).json({ error: `Erro: ${e.message}` });
  }
}
