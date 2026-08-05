// Backend usando Google Sheets como banco de dados
// Planilha: https://docs.google.com/spreadsheets/d/1MORipRhbN8-X-Afpata5zLfXLq0oBaf8DpP2hTzWtcs

const SHEET_ID = "1MORipRhbN8-X-Afpata5zLfXLq0oBaf8DpP2hTzWtcs";
const SHEET_NAME = "Presets";

async function getAccessToken() {
  const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const email = process.env.GOOGLE_CLIENT_EMAIL;

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(claim)}`;

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await r.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sheetsGet(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return data.values || [];
}

async function sheetsAppend(token, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=RAW`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

async function sheetsUpdate(token, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

async function sheetsClear(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`;
  await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

// Lê todos os presets da planilha
async function getAllPresets(token) {
  const rows = await sheetsGet(token, `${SHEET_NAME}!A2:E`);
  return rows.map((r) => ({
    id: r[0] || "",
    bu: r[1] || "",
    visibility: r[2] || "public",
    userHash: r[3] || "",
    preset: r[4] ? JSON.parse(r[4]) : {},
    rowIndex: null,
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  try {
    const token = await getAccessToken();
    const { action, userHash, bu } = req.body || {};

    if (action === "ping") {
      res.status(200).json({ ok: true, got: "pong" });
      return;
    }

    if (action === "checkUser") {
      const rows = await sheetsGet(token, "Users!A2:C");
      const user = rows.find((r) => r[0] === userHash);
      res.status(200).json({ exists: !!user, user: user ? { hash: user[0], name: user[1] } : null });
      return;
    }

    if (action === "registerUser") {
      const { name, userHash: hash } = req.body;
      const rows = await sheetsGet(token, "Users!A2:C");
      const existing = rows.find((r) => r[0] === hash);
      if (!existing) {
        await sheetsAppend(token, [[hash, name, new Date().toISOString()]]);
      }
      res.status(200).json({ ok: true, user: { hash, name } });
      return;
    }

    if (action === "listPublicPresets") {
      const all = await getAllPresets(token);
      const presets = all.filter((p) => p.bu === bu && p.visibility === "public").map((p) => p.preset);
      res.status(200).json({ presets });
      return;
    }

    if (action === "listPrivatePresets") {
      const all = await getAllPresets(token);
      const presets = all.filter((p) => p.bu === bu && p.visibility === "private" && p.userHash === userHash).map((p) => p.preset);
      res.status(200).json({ presets });
      return;
    }

    if (action === "savePreset") {
      const { preset, visibility } = req.body;
      const rows = await sheetsGet(token, `${SHEET_NAME}!A2:E`);
      const rowIdx = rows.findIndex((r) => r[0] === preset.id);
      const row = [preset.id, bu, visibility, userHash || "", JSON.stringify(preset)];
      if (rowIdx >= 0) {
        await sheetsUpdate(token, `${SHEET_NAME}!A${rowIdx + 2}:E${rowIdx + 2}`, [row]);
      } else {
        await sheetsAppend(token, [row]);
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "deletePreset") {
      const { presetId } = req.body;
      const rows = await sheetsGet(token, `${SHEET_NAME}!A2:E`);
      const rowIdx = rows.findIndex((r) => r[0] === presetId);
      if (rowIdx >= 0) {
        await sheetsClear(token, `${SHEET_NAME}!A${rowIdx + 2}:E${rowIdx + 2}`);
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    res.status(500).json({ error: `Erro: ${e.message}` });
  }
}
