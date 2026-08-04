// Backend mínimo para a Localiza Social Studio, usando a API gratuita do
// Google Gemini (Google AI Studio). Roda como Serverless Function na Vercel
// (deploy automático ao colocar este arquivo dentro de uma pasta /api na
// raiz do projeto).
//
// O que ele faz: recebe { system, prompt, useSearch } do front, chama a API
// do Gemini usando a chave guardada em variável de ambiente (nunca exposta
// no navegador) e devolve { text }.
//
// CONFIGURAÇÃO NECESSÁRIA NA VERCEL:
// 1. No painel do projeto, vá em Settings > Environment Variables
// 2. Adicione GEMINI_API_KEY com sua chave gratuita do Google AI Studio
// 3. (Opcional) Adicione GEMINI_MODEL, ex: "gemini-2.5-flash" — se não
//    definir, usa gemini-2.5-flash (o modelo do plano gratuito).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    return;
  }

  const { system, prompt, useSearch } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Campo 'prompt' é obrigatório." });
    return;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  async function callGemini(withSearch) {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }
    if (withSearch) {
      body.tools = [{ google_search: {} }];
    }
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      }
    );
    return geminiRes;
  }

  try {
    let geminiRes = await callGemini(!!useSearch);

    // Se a busca falhar (ex: grounding não disponível nessa chave/conta),
    // tenta de novo sem busca em vez de simplesmente devolver erro.
    if (!geminiRes.ok && useSearch) {
      const firstErrText = await geminiRes.text();
      const retryRes = await callGemini(false);
      if (retryRes.ok) {
        geminiRes = retryRes;
      } else {
        res.status(geminiRes.status || 500).json({
          error: `Erro do Gemini (com busca): ${firstErrText}`,
        });
        return;
      }
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(geminiRes.status).json({ error: `Erro do Gemini: ${errText}` });
      return;
    }

    const data = await geminiRes.json();

    // Extrai o texto de saída do formato da API do Gemini
    let text = "";
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.text) text += p.text;
    }

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: `Falha ao chamar o Gemini: ${e.message}` });
  }
}
