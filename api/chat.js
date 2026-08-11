export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido" }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "GEMINI_API_KEY não configurada." }); return; }

  const { messages, userName } = req.body || {};
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  const systemPrompt = `Você é o assistente do Social Studio, ferramenta interna de geração de legendas da Localiza.${userName ? ` Você está conversando com ${userName} — use o nome quando fizer sentido.` : ""}

FUNCIONALIDADES:
- 5 BUs: RAC Brasil, Zarp, Assinatura, Caminhões, Seminovos
- Nova legenda: tópico + rede + palavras-chave + opções → Cmd+Enter pra gerar
- Otimizar legenda: cola texto existente e melhora
- Estilo geral da marca: configura tom, regras, vocabulário por BU
- Estilos criados: lista estilos salvos
- Legendas salvas: biblioteca com busca, filtros, calendário, histórico de versões
- Painel Admin: só admins. Gerencia usuários e estilos.
- Chat (você): tira dúvidas sobre a ferramenta

ATALHOS:
- Cmd+Enter (Mac) / Ctrl+Enter (Win): gerar legenda
- Botão direito nas BUs: abre em nova guia
- "Destacar": legenda vira referência automática para próximas gerações
- "Salvar": guarda sem destacar
- Preview: simula a legenda no feed de cada rede
- Exportar (⬇): copia todas as legendas de uma vez
- Cores das KWs: verde = boa SEO, amarelo = média, vermelho = fraca

REGRAS:
- Só auxilie no uso da ferramenta, dê dicas e opiniões
- NÃO gere legendas nem crie textos de marketing
- Seja conciso, direto e amigável em português brasileiro casual`;

  // Formata histórico alternando user/model (exigência do Gemini)
  const contents = (messages || []).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: contents.slice(-10),
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
      }
    );

    const data = await r.json();

    if (!r.ok) {
      res.status(500).json({ error: data?.error?.message || "Erro na API Gemini." });
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui responder agora.";
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
