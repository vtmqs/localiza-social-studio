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
// 3. (Opcional) Adicione GEMINI_MODEL, ex: "gemini-3.1-flash-lite" — se não
//    definir, usa gemini-3.1-flash-lite (o modelo atual do plano gratuito).

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

  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

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
    let searched = !!useSearch;
    let searchError = null;

    // Se a busca falhar (ex: grounding não disponível nessa chave/conta),
    // tenta de novo sem busca em vez de simplesmente devolver erro.
    // Isso é sinalizado ao front via "searched: false", pra ele NUNCA tratar
    // o resultado como se fosse baseado em busca real quando não foi.
    if (!geminiRes.ok && useSearch) {
      const firstErrText = await geminiRes.text();
      console.error("Erro Gemini (com busca):", firstErrText);
      searchError = firstErrText;
      const retryRes = await callGemini(false);
      if (retryRes.ok) {
        geminiRes = retryRes;
        searched = false;
      } else {
        res.status(geminiRes.status || 500).json({
          error: `Erro do Gemini (com busca): ${firstErrText}`,
        });
        return;
      }
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Erro Gemini:", errText);
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

    // Extrai as fontes REAIS retornadas pela busca (grounding), não o que o
    // texto do modelo diz que encontrou. São usadas pra validar URLs no front
    // e evitar link inventado.
    const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c) => ({ url: c?.web?.uri, title: c?.web?.title }))
      .filter((s) => s.url);

    res.status(200).json({ text, searched, sources, searchError });
  } catch (e) {
    res.status(500).json({ error: `Falha ao chamar o Gemini: ${e.message}` });
  }
}
