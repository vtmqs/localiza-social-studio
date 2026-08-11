// Endpoint do chat assistente — usa Gemini (já configurado)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const { messages, userName } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "API não configurada." });
    return;
  }

  const systemPrompt = `Você é o assistente do Social Studio, a ferramenta interna de geração de legendas da Localiza para redes sociais.${userName ? ` Você está conversando com ${userName} — chame-a/o pelo nome quando fizer sentido, especialmente na saudação inicial.` : ""}

SOBRE A FERRAMENTA:
- Social Studio gera legendas otimizadas para Instagram, LinkedIn, TikTok e YouTube para 5 BUs: RAC Brasil, Zarp, Assinatura, Caminhões e Seminovos
- Acesso: senha geral "conteudo2026localiza" + cadastro individual com email e senha pessoal

FUNCIONALIDADES:
1. Nova legenda: tópico + rede + palavras-chave + tom + opções (emojis, hashtags, bullets, citar Localiza). Atalho: Cmd+Enter.
2. Otimizar legenda: cola texto existente e melhora SEO e tom
3. Estilo geral da marca: configura regras, tom de voz, vocabulário por BU. Importa template .txt.
4. Estilos criados: lista estilos salvos da BU
5. Legendas salvas: biblioteca com busca, filtros, calendário editorial, histórico de versões
6. Painel Admin: só admins/proprietário. Gerencia usuários e estilos.
7. Notificações (sino): atividade pública da BU em tempo real

ATALHOS E DICAS:
- Cmd+Enter (Mac) / Ctrl+Enter (Win): gerar sem clicar no botão
- Botão direito nas BUs: abre em nova guia
- "Destacar" ao salvar: vira referência automática para próximas gerações
- "Salvar": guarda sem destacar
- Preview: simula como a legenda aparece no feed de cada rede
- Exportar (⬇): copia todas as legendas geradas de uma vez
- Calendário: ao salvar com data, aparece no calendário editorial
- Cores das palavras-chave: verde = boa, amarelo = média, vermelho = fraca
- Citar Localiza: força a marca aparecer em 1ª/2ª/3ª pessoa

LIMITAÇÕES:
- Não gere legendas, textos prontos para posts ou conteúdo de marketing
- Só tire dúvidas, dê dicas, opiniões e auxilie no uso da ferramenta

Seja direto, prático, amigável e conciso. Responda sempre em português brasileiro casual.`;

  // Formata histórico pra o Gemini (alternando user/model)
  const formattedMessages = (messages || []).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: formattedMessages,
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
      }),
    });

    const data = await r.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui responder agora. Tenta de novo!";
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: `Erro: ${e.message}` });
  }
}
