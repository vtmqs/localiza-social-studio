import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Music2,
  PlayCircle,
  Camera,
  Search,
  Sparkles,
  X,
  Plus,
  Copy,
  Check,
  Loader2,
  Settings2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileEdit,
  ChevronRight,
  BarChart3,
  Users,
  Trash2,
  PenLine,
  Link2,
  ExternalLink,
  Bookmark,
  Star,
  Smile,
  Hash,
  Wand2,
  RefreshCw,
  LogOut,
  List,
  Upload,
  Menu,
  Building2,
  Shield,
  Bell,
  Eye,
  Download,
  Calendar,
  MessageCircle,
  Send,
  HelpCircle,
  Link as LinkIcon,
} from "lucide-react";

const GREEN = "#01652A";
const GREEN_DARK = "#014A1F";
const GREEN_DEEPER = "#013318";
const LIME = "#78DE1F";
const LIME_SOFT = "#EAF9DC";
const BG = "#F6F9F6";
const TEXT = "#16241A";
const BORDER = "#E1E8E2";
const MUTED = "#5B6B60";

const BUS = [
  { id: "rac", label: "RAC Brasil", sub: "Aluguel de carros" },
  { id: "zarp", label: "Zarp", sub: "Assinatura para motoristas de app" },
  { id: "assinatura", label: "Assinatura", sub: "Antigo MEOO" },
  { id: "caminhoes", label: "Caminhões", sub: "Locação de frotas" },
  { id: "seminovos", label: "Seminovos", sub: "Venda de carros seminovos" },
];

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: Briefcase },
  { id: "instagram", label: "Instagram", icon: Camera },
  { id: "tiktok", label: "TikTok", icon: Music2 },
  { id: "youtube", label: "YouTube", icon: PlayCircle },
];

const TONE_TAGS = [
  "Descontraído",
  "Formal",
  "Inspirador",
  "Direto e objetivo",
  "Bem-humorado",
  "Urgente / Promocional",
  "Educativo",
  "Emocional",
];

const OBJECTIVES = [
  "Engajamento",
  "Geração de leads / conversão",
  "Branding institucional",
  "Educar / Informar",
  "Tráfego para o site",
  "Awareness de campanha",
];

const BLANK_PRESET = {
  id: null,
  title: "",
  regras: "",
  eixo: "",
  fioCondutor: "",
  tomGeral: "",
  vocabulario: [],
  evitar: "",
  exemplos: "",
  concorrentes: [],
  insights: "",
};

function normalizePreset(raw) {
  const p = { ...BLANK_PRESET, ...raw };
  if (typeof p.vocabulario === "string") {
    p.vocabulario = p.vocabulario.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(p.vocabulario)) p.vocabulario = [];
  if (Array.isArray(p.concorrentes)) {
    p.concorrentes = p.concorrentes.map((c) => (typeof c === "string" ? { nome: c, tipo: "concorrente" } : c));
  } else {
    p.concorrentes = [];
  }
  return p;
}

function emptyDraft(presetId) {
  return {
    mode: "novo",
    presetId: presetId || null,
    platforms: ["instagram"],
    topic: "",
    existingCaption: "",
    objective: OBJECTIVES[0],
    toneTags: [],
    keywords: [],
    keywordInput: "",
    keywordSelected: {},
    relatedContent: [],
    relatedMode: "incluir", // "incluir" | "basear"
    citarLocaliza: false,
    pessoaLocaliza: "3", // "1" | "2" | "3"
    useEmojis: true,
    useHashtags: true,
    useBullets: false,
    length: "curta",
    autoKwTried: false,
  };
}

async function callAI({ system, prompt, useSearch }) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, useSearch: !!useSearch }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Falha na chamada ao backend (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { text: data.text || "", sources: data.sources || [], searched: !!data.searched, searchError: data.searchError || "" };
}

const storage = {
  get(key) {
    try { return Promise.resolve(localStorage.getItem(key)); } catch { return Promise.resolve(null); }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
    return Promise.resolve();
  },
};

function extractJSON(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const startArr = cleaned.indexOf("[");
  let from = start;
  if (startArr !== -1 && (start === -1 || startArr < start)) from = startArr;
  const sliced = from >= 0 ? cleaned.slice(from) : cleaned;
  return JSON.parse(sliced);
}

function platformNotesFor(length) {
  const tamanho = {
    curta: { linkedin: "curta, 1 a 2 frases diretas", instagram: "curta, no máximo 2 a 3 linhas", tiktok: "bem curta, quase uma legenda-gancho", youtube: "descrição curta, 2 a 3 frases" },
    media: { linkedin: "média, 2 a 3 parágrafos curtos", instagram: "média, 4 a 6 linhas", tiktok: "curta a média, direta", youtube: "descrição média, um parágrafo explicando o vídeo" },
    longa: { linkedin: "mais longa, até ~4 parágrafos curtos", instagram: "mais longa, com contexto e storytelling", tiktok: "média, sem perder o ritmo de TikTok", youtube: "descrição longa e explicativa, com contexto completo" },
  }[length] || {};
  return {
    linkedin: `LinkedIn: tom mais profissional. Extensão: ${tamanho.linkedin}. Hashtags ao final.`,
    instagram: `Instagram: legenda envolvente. Extensão: ${tamanho.instagram}. Hashtags estratégicas (não genéricas em excesso).`,
    tiktok: `TikTok: linguagem coloquial, sem soar institucional. Extensão: ${tamanho.tiktok}.`,
    youtube: `YouTube: funciona como descrição do vídeo, inclua 1 chamada para ação. Extensão: ${tamanho.youtube}.`,
  };
}

function sanitizeDashes(text) {
  if (typeof text !== "string") return text;
  let t = text;
  // Converte variantes de quebra de linha
  t = t.replace(/<br\s*\/?>/gi, "\n"); // <br> → 

  t = t.replace(/\\n/g, "\n");          // \n literal → 

  t = t
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
  return t;
}

function sanitizeResults(parsed) {
  const out = {};
  Object.keys(parsed || {}).forEach((k) => {
    const r = parsed[k];
    out[k] = {
      ...r,
      legenda: sanitizeDashes(r.legenda),
      hashtags: (r.hashtags || []).map((h) => sanitizeDashes(h)),
      titulo_youtube: r.titulo_youtube ? sanitizeDashes(r.titulo_youtube) : "",
      originalScore: typeof r.originalScore === "number" ? r.originalScore : 0,
    };
  });
  return out;
}


// Renderiza texto com quebras de linha e bullets de forma visual
function renderLegenda(text) {
  if (!text) return null;
  const lines = text.split(/\n/);
  return lines.map((line, i) => {
    if (line.startsWith("•") || line.startsWith("-")) {
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span style={{ color: "#01652A", fontWeight: 600, flexShrink: 0 }}>•</span>
          <span>{line.replace(/^[•\-]\s*/, "")}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <div key={i}>{line}</div>;
  });
}




const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Bem-vinda ao Social Studio! 👋",
    desc: "Essa ferramenta gera legendas otimizadas para as redes sociais da Localiza. O tour vai mostrar os 5 passos principais em menos de 2 minutos. Clique em Próximo para começar.",
    target: null,
    position: "center",
    autoAdvance: null,
  },
  {
    id: "style",
    title: "1. Estilo geral da marca",
    desc: "Antes de gerar legendas, configure o estilo da BU com regras, tom de voz e vocabulário. Quanto mais completo, melhor a legenda. Clique no botão destacado para abrir.",
    target: "[data-onboard='style-btn']",
    position: "right",
    autoAdvance: "page:style",
  },
  {
    id: "compose",
    title: "2. Nova legenda",
    desc: "Aqui você cria as legendas. Clique no botão destacado para ir para a tela de criação.",
    target: "[data-onboard='compose-btn']",
    position: "right",
    autoAdvance: "page:compose",
  },
  {
    id: "topic",
    title: "3. Descreva o tópico",
    desc: "Escreva aqui o assunto do post com o máximo de contexto possível. Quanto mais específico, melhor a legenda. Ex: 'vídeo mostrando retirada sem burocracia no app'.",
    target: "[data-onboard='topic-input']",
    position: "bottom",
    autoAdvance: null,
  },
  {
    id: "generate",
    title: "4. Gere a legenda",
    desc: "Com o tópico preenchido, clique aqui para gerar. Você pode usar Cmd+Enter (Mac) ou Ctrl+Enter (Windows) como atalho. O resultado vem com score de SEO, Tom e Originalidade.",
    target: "[data-onboard='generate-btn']",
    position: "top",
    autoAdvance: null,
  },
  {
    id: "library",
    title: "5. Legendas salvas",
    desc: "Tudo que você salvar fica aqui. Use os filtros, a busca e o calendário editorial para organizar. Legendas destacadas (⭐) viram referência automática para as próximas gerações.",
    target: "[data-onboard='library-btn']",
    position: "right",
    autoAdvance: "page:library",
  },
  {
    id: "chat",
    title: "6. Assistente sempre disponível 🤖",
    desc: "O botão verde no canto inferior direito é o seu assistente. Ele conhece tudo sobre a ferramenta e pode te ajudar com dúvidas, sugerir atalhos e dar dicas. É só clicar!",
    target: "[data-onboard='chat-btn']",
    position: "top",
    autoAdvance: null,
  },
  {
    id: "done",
    title: "Tudo pronto! 🎉",
    desc: "Você conhece os recursos principais do Social Studio. Lembre-se: quanto mais completo o estilo da BU, melhor a legenda gerada. Boas criações!",
    target: null,
    position: "center",
    autoAdvance: null,
  },
];


// Renderiza markdown simples nas mensagens do chat
// + converte menções a seções da ferramenta em links clicáveis
function renderChatMessage(text, onNavigate) {
  // Mapeamento de palavras-chave → ações de navegação
  const navLinks = [
    { pattern: /(Estilo geral da marca|estilos? da marca|configurar o estilo)/gi, page: "style", label: null },
    { pattern: /(Estilos? criados?)/gi, page: "presets-list", label: null },
    { pattern: /(Legendas? salvas?|biblioteca)/gi, page: "library", label: null },
    { pattern: /(Nova legenda|criar legenda|nova legenda)/gi, page: "compose", label: null },
    { pattern: /(Painel Admin)/gi, page: "admin", label: null },
  ];

  // Divide o texto em linhas pra processar
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  function processInline(str) {
    // Transforma o texto inline aplicando bold, nav-links
    // Primeiro aplica nav-links, depois bold
    const parts = [];
    let remaining = str;
    let safetyCounter = 0;

    while (remaining.length > 0 && safetyCounter++ < 200) {
      // Testar cada padrão de navegação
      let earliest = null;
      let earliestPattern = null;
      let earliestPage = null;

      for (const { pattern, page } of navLinks) {
        pattern.lastIndex = 0;
        const match = pattern.exec(remaining);
        if (match && (earliest === null || match.index < earliest.index)) {
          earliest = match;
          earliestPattern = pattern;
          earliestPage = page;
        }
      }

      // Testar bold **texto**
      const boldMatch = /\*\*(.+?)\*\*/.exec(remaining);

      if (earliest && boldMatch) {
        // Qual vem primeiro?
        if (earliest.index <= boldMatch.index) {
          if (earliest.index > 0) parts.push(remaining.slice(0, earliest.index));
          parts.push({ type: "navlink", text: earliest[0], page: earliestPage, key: key++ });
          remaining = remaining.slice(earliest.index + earliest[0].length);
        } else {
          if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
          parts.push({ type: "bold", text: boldMatch[1], key: key++ });
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        }
      } else if (earliest) {
        if (earliest.index > 0) parts.push(remaining.slice(0, earliest.index));
        parts.push({ type: "navlink", text: earliest[0], page: earliestPage, key: key++ });
        remaining = remaining.slice(earliest.index + earliest[0].length);
      } else if (boldMatch) {
        if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
        parts.push({ type: "bold", text: boldMatch[1], key: key++ });
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      } else {
        parts.push(remaining);
        remaining = "";
      }
    }

    return parts.map((part, i) => {
      if (typeof part === "string") return <span key={i}>{part}</span>;
      if (part.type === "bold") return <strong key={part.key} style={{ color: "#01652A", fontWeight: 700 }}>{part.text}</strong>;
      if (part.type === "navlink") return (
        <button
          key={part.key}
          onClick={() => onNavigate(part.page)}
          style={{ color: "#01652A", fontWeight: 600, textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
        >
          {part.text}
        </button>
      );
      return null;
    });
  }

  let inList = false;
  let listItems = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ol key={key++} style={{ paddingLeft: 16, margin: "6px 0", display: "flex", flexDirection: "column", gap: 4 }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ fontSize: 11, lineHeight: 1.5 }}>{processInline(item)}</li>
          ))}
        </ol>
      );
      listItems = [];
      inList = false;
    }
  }

  lines.forEach((line, i) => {
    // Lista numerada: "1. texto"
    const listMatch = line.match(/^\d+\.\s+(.+)$/);
    if (listMatch) {
      inList = true;
      listItems.push(listMatch[1]);
      return;
    }

    // Bullet: "- texto" ou "• texto"
    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      flushList();
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
          <span style={{ color: "#01652A", fontWeight: 700, flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 11, lineHeight: 1.5 }}>{processInline(bulletMatch[1])}</span>
        </div>
      );
      return;
    }

    flushList();

    if (line.trim() === "") {
      if (i > 0) elements.push(<div key={key++} style={{ height: 6 }} />);
      return;
    }

    elements.push(
      <p key={key++} style={{ fontSize: 11, lineHeight: 1.6, margin: 0 }}>
        {processInline(line)}
      </p>
    );
  });

  flushList();
  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{elements}</div>;
}

const GlobalStyle = () => (
  <style>{`
    .ls-input { transition: border-color .15s ease, box-shadow .15s ease; }
    .ls-input:focus { border-color: ${GREEN} !important; box-shadow: 0 0 0 3px rgba(1,101,42,0.12); outline: none; }
    .ls-card { transition: box-shadow .2s ease, transform .2s ease; box-shadow: 0 1px 2px rgba(16,36,22,0.04); }
    .ls-card:hover { box-shadow: 0 6px 20px rgba(16,36,22,0.07); }
    .ls-btn-primary { transition: transform .12s ease, box-shadow .15s ease, opacity .15s ease; box-shadow: 0 4px 14px rgba(120,222,31,0.35); }
    .ls-btn-primary:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(120,222,31,0.45); transform: translateY(-1px); }
    .ls-btn-primary:active:not(:disabled) { transform: translateY(0); }
    .ls-btn-ghost { transition: background .15s ease, border-color .15s ease, color .15s ease; }
    .ls-btn-ghost:hover:not(:disabled) { border-color: ${GREEN}; color: ${GREEN}; }
    .ls-nav-item { position: relative; transition: background .15s ease, color .15s ease; }
    .ls-nav-item.active { background: rgba(255,255,255,0.97); color: ${GREEN_DARK}; }
    .ls-nav-item.active::before { content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: ${LIME}; }
    .ls-nav-item:not(.active):hover { background: rgba(255,255,255,0.10); }
    .ls-chip-x { transition: opacity .12s ease, background .12s ease; }
    .ls-chip-x:hover { opacity: 0.6; }
    .ls-toggle { transition: background .15s ease, border-color .15s ease, color .15s ease; }
    .ls-platform-btn { transition: background .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease; }
    .ls-side-link { transition: color .12s ease, opacity .12s ease; }
    .ls-side-link:hover { opacity: 0.85; }
    .ls-preset-item { transition: background .15s ease, border-color .15s ease; }
    .ls-preset-item:hover { background: ${LIME_SOFT}; }
    .ls-preset-item.active { background: ${LIME_SOFT}; border-color: ${LIME} !important; }
    .ls-trash { transition: opacity .12s ease; opacity: 0; }
    .ls-preset-item:hover .ls-trash { opacity: 0.6; }
    .ls-trash:hover { opacity: 1 !important; }
    .ls-bu-row { transition: background .15s ease; }
    .ls-bu-row:hover { background: rgba(255,255,255,0.05); }
    .ls-bu-number { transition: color .15s ease, transform .15s ease; }
    .ls-bu-row:hover .ls-bu-number { color: ${LIME} !important; transform: translateX(3px); }
    .ls-card:hover { box-shadow: 0 6px 20px rgba(16,36,22,0.07); }
    .ls-btn-primary { transition: transform .12s ease, box-shadow .15s ease, opacity .15s ease; box-shadow: 0 4px 14px rgba(120,222,31,0.35); }
    .ls-btn-primary:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(120,222,31,0.45); transform: translateY(-1px); }
    .ls-btn-primary:active:not(:disabled) { transform: translateY(0); }
    .ls-btn-ghost { transition: background .15s ease, border-color .15s ease, color .15s ease; }
    .ls-btn-ghost:hover:not(:disabled) { border-color: ${GREEN}; color: ${GREEN}; }
    .ls-nav-item { position: relative; transition: background .15s ease, color .15s ease; }
    .ls-nav-item.active { background: rgba(255,255,255,0.97); color: ${GREEN_DARK}; }
    .ls-nav-item.active::before { content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: ${LIME}; }
    .ls-nav-item:not(.active):hover { background: rgba(255,255,255,0.10); }
    .ls-chip-x { transition: opacity .12s ease, background .12s ease; }
    .ls-chip-x:hover { opacity: 0.6; }
    .ls-toggle { transition: background .15s ease, border-color .15s ease, color .15s ease; }
    .ls-platform-btn { transition: background .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease; }
    .ls-side-link { transition: color .12s ease, opacity .12s ease; }
    .ls-side-link:hover { opacity: 0.85; }
    .ls-preset-item { transition: background .15s ease, border-color .15s ease; }
    .ls-preset-item:hover { background: ${LIME_SOFT}; }
    .ls-preset-item.active { background: ${LIME_SOFT}; border-color: ${LIME} !important; }
    .ls-trash { transition: opacity .12s ease; opacity: 0; }
    .ls-preset-item:hover .ls-trash { opacity: 0.6; }
    .ls-trash:hover { opacity: 1 !important; }
    .ls-bu-row { transition: background .15s ease; }
    .ls-bu-row:hover { background: rgba(255,255,255,0.05); }
    .ls-bu-number { transition: color .15s ease, transform .15s ease; }
    .ls-bu-row:hover .ls-bu-number { color: ${LIME} !important; transform: translateX(3px); }
    .ls-mode-tab { transition: background .15s ease, color .15s ease; }

  `}</style>
);

function Chip({ children, onRemove, tone = "default" }) {
  const style =
    tone === "accent"
      ? { background: LIME_SOFT, borderColor: LIME, color: GREEN_DARK }
      : { background: "#FFFFFF", borderColor: "#E1E8E2", color: "#16241A" };
  return (
    <span style={style} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="ls-chip-x focus:outline-none" aria-label="Remover">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

function ToggleTag({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={
        active
          ? { background: GREEN, borderColor: GREEN, color: "#FFFFFF" }
          : { background: "#FFFFFF", borderColor: "#E1E8E2", color: "#5B6B60" }
      }
      className="ls-toggle px-3 py-1.5 rounded-full border text-xs font-medium"
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold tracking-wide block mb-1.5" style={{ color: MUTED }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function scoreColor(v) {
  if (v == null) return MUTED;
  if (v >= 75) return GREEN;
  if (v >= 50) return "#B98A1F";
  return "#C0402A";
}

function ScoreRing({ label, value }) {
  const size = 46;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;
  const color = scoreColor(v);
  return (
    <div className="flex items-center gap-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BORDER} strokeWidth={stroke} />
          {v != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - (v / 100) * c}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dashoffset .4s ease" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold" style={{ color: v != null ? color : MUTED }}>
          {v != null ? v : "–"}
        </div>
      </div>
      <span className="text-[11px] leading-tight" style={{ color: MUTED, maxWidth: 54 }}>
        {label}
      </span>
    </div>
  );
}


function OnboardingSpotlight({ step, stepIndex, total, onNext, onPrev, onDone, isLast }) {
  const [targetRect, setTargetRect] = React.useState(null);
  const [popupPos, setPopupPos] = React.useState({ top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
  const POPUP_W = 300;
  const POPUP_H = 220; // altura estimada do popup
  const GAP = 12;

  React.useEffect(() => {
    if (!step.target) {
      setTargetRect(null);
      setPopupPos({ top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      setPopupPos({ top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Espera o scroll terminar antes de calcular
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const r = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      setTargetRect(r);

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Tenta posicionar à direita
      if (step.position === "right" && r.left + r.width + GAP + POPUP_W < vw) {
        setPopupPos({
          top: Math.max(16, Math.min(r.top, vh - POPUP_H - 16)),
          left: r.left + r.width + GAP,
        });
        return;
      }
      // Tenta posicionar abaixo
      if ((step.position === "bottom" || step.position === "right") && r.top + r.height + GAP + POPUP_H < vh) {
        setPopupPos({
          top: r.top + r.height + GAP,
          left: Math.max(16, Math.min(r.left, vw - POPUP_W - 16)),
        });
        return;
      }
      // Tenta posicionar acima
      if (r.top - GAP - POPUP_H > 0) {
        setPopupPos({
          top: r.top - POPUP_H - GAP,
          left: Math.max(16, Math.min(r.left, vw - POPUP_W - 16)),
        });
        return;
      }
      // Tenta posicionar à esquerda
      if (r.left - GAP - POPUP_W > 0) {
        setPopupPos({
          top: Math.max(16, Math.min(r.top, vh - POPUP_H - 16)),
          left: r.left - POPUP_W - GAP,
        });
        return;
      }
      // Fallback: centro da tela
      setPopupPos({ top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
    }, 350);
  }, [step]);

  return (
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: "none" }}>
      {/* Overlay com buraco no elemento */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "all" }} onClick={e => e.stopPropagation()}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect x={targetRect.left - 6} y={targetRect.top - 6} width={targetRect.width + 12} height={targetRect.height + 12} rx="8" fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#spotlight-mask)" />
        {targetRect && (
          <rect x={targetRect.left - 6} y={targetRect.top - 6} width={targetRect.width + 12} height={targetRect.height + 12} rx="8" fill="none" stroke="#78DE1F" strokeWidth="2.5" strokeDasharray="6 3">
            <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>

      {/* Popup */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl"
        style={{ ...popupPos, width: POPUP_W, zIndex: 70, pointerEvents: "all", padding: "18px 20px" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#EAF9DC", color: "#014A1F" }}>
            {stepIndex + 1} / {total}
          </span>
          <button onClick={onDone} className="text-[10px]" style={{ color: "#9dbfaa" }}>Pular tour</button>
        </div>
        <h3 className="text-sm font-bold mb-2" style={{ color: "#014A1F" }}>{step.title}</h3>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "#5B6B60" }}>{step.desc}</p>
        {step.autoAdvance && (
          <p className="text-[10px] mb-3 flex items-center gap-1" style={{ color: "#78DE1F" }}>
            <span>●</span> Clique no elemento destacado para avançar automaticamente
          </p>
        )}
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button onClick={onPrev} className="px-3 py-2 rounded-lg border text-xs" style={{ borderColor: "#E1E8E2", color: "#5B6B60" }}>‹</button>
          )}
          <button
            onClick={isLast ? onDone : onNext}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: "#01652A" }}
          >
            {isLast ? "Entendi como usar! ✓" : step.autoAdvance ? "Pular passo →" : "Próximo →"}
          </button>
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="rounded-full transition-all" style={{ width: i === stepIndex ? 16 : 6, height: 6, background: i === stepIndex ? "#01652A" : "#E1E8E2" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const APP_PASSWORD = "conteudo2026localiza";

const CHAT_SYSTEM_PROMPT = `Você é o assistente do Social Studio, a ferramenta interna de geração de legendas da Localiza para redes sociais. Seu papel é ajudar os membros do time de conteúdo a usar a ferramenta com mais eficiência.

SOBRE A FERRAMENTA:
- Social Studio gera legendas otimizadas para Instagram, LinkedIn, TikTok e YouTube para 5 BUs: RAC Brasil, Zarp, Assinatura, Caminhões e Seminovos
- Acesso: senha geral "conteudo2026localiza" + cadastro individual com email e senha pessoal
- URL: localiza-social-studio.vercel.app

FUNCIONALIDADES PRINCIPAIS:
1. Nova legenda: descreve o tópico, seleciona rede, palavras-chave, tom, tamanho e opções (emojis, hashtags, bullets, citar Localiza). Atalho: Cmd+Enter para gerar.
2. Otimizar legenda: cola uma legenda existente e a ferramenta melhora SEO e tom
3. Estilo geral da marca: configura regras, tom de voz, vocabulário e eixo editorial por BU. Pode importar template .txt
4. Estilos criados: lista todos os estilos salvos da BU, públicos e privados
5. Legendas salvas: biblioteca com busca, filtro por rede, visualização em calendário e histórico de versões
6. Painel Admin: visível só para admins/proprietário. Gerencia usuários e estilos

DICAS E ATALHOS:
- Cmd+Enter (Mac) / Ctrl+Enter (Windows): gerar legenda
- Botão direito nas BUs do menu: abre em nova guia
- "Destacar" ao salvar: legenda vira referência automática para próximas gerações
- "Salvar" apenas guarda sem destacar
- Score de SEO, Tom e Originalidade aparecem em cada legenda gerada
- Preview: veja como a legenda ficaria no feed antes de copiar
- Exportar: botão ⬇ copia todas as legendas geradas de uma vez
- Calendário: ao salvar com data de publicação, aparece no calendário editorial
- Conteúdo relacionado: busca posts reais da Localiza para usar como link ou inspiração
- Citar Localiza: força a marca aparecer na legenda em 1ª, 2ª ou 3ª pessoa

REGRAS DO QUE VOCÊ PODE E NÃO PODE:
✅ Pode: explicar como usar qualquer funcionalidade, sugerir qual botão clicar, dar dicas de boas práticas, opinar sobre estratégia de conteúdo, ajudar a configurar estilos, esclarecer dúvidas sobre SEO e redes sociais
❌ Não pode: gerar legendas, criar textos para posts, escrever conteúdo de marketing

Seja direto, prático e amigável. Quando sugerir uma ação, indique o caminho exato (ex: "vá em Estilo geral da marca → campo Tom de voz"). Responda sempre em português brasileiro casual.`;
const OWNER_EMAIL = "vitoriatmqs@gmail.com";
const isAdminUser = (user) => user && (user.email === OWNER_EMAIL || user.role === "admin" || user.role === "owner");
const canEditPreset = (preset, user) => {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (preset.userHash === user.hash) return true;
  if ((preset.editors || []).includes(user.hash)) return true;
  return false;
};

// Hash simples da senha pessoal (não é criptografia bancária, mas evita
// guardar a senha em texto puro no servidor)
function hashPassword(pwd) {
  // Hash simples e síncrono — suficiente pra identificar o usuário no KV
  // sem expor a senha em texto puro, sem precisar de crypto assíncrono.
  let h = 0x811c9dc5;
  for (let i = 0; i < pwd.length; i++) {
    h ^= pwd.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + pwd.length.toString(16).padStart(4, "0");
}

async function storageAPI(body) {
  const r = await fetch("/api/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Usuário cadastrado
  const [currentUser, setCurrentUser] = useState(null); // { name, hash }
  const [showRegister, setShowRegister] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [loginPwd, setLoginPwd] = useState("");
  const [loginError, setLoginError] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    storage.get("app-unlocked").then((v) => {
      if (v === "true") setUnlocked(true);
    });
    // Carrega usuário salvo localmente
    storage.get("current-user").then((v) => {
      if (v) setCurrentUser(JSON.parse(v));
    });
  }, []);

  // Quando desbloqueado mas sem usuário cadastrado, mostra tela de cadastro
  useEffect(() => {
    if (unlocked && !currentUser) setShowRegister(true);
  }, [unlocked, currentUser]);

  function handleRegister() {
    if (!regEmail.trim() || !regEmail.includes("@")) { setRegError("Digite um email válido."); return; }
    if (!regName.trim()) { setRegError("Digite seu nome de exibição."); return; }
    if (regPwd.length < 6) { setRegError("A senha precisa ter pelo menos 6 caracteres."); return; }
    const hash = hashPassword(regEmail.trim().toLowerCase() + "|" + regPwd);
    const user = { name: regName.trim(), email: regEmail.trim().toLowerCase(), hash };
    setCurrentUser(user);
    storage.set("current-user", JSON.stringify(user));
    setShowRegister(false);
    storageAPI({ action: "registerUser", name: regName.trim(), email: regEmail.trim().toLowerCase(), userHash: hash }).catch(() => {});
  }

  function handleLogin() {
    if (!regEmail.trim() || !regEmail.includes("@")) { setLoginError("Digite seu email."); return; }
    if (!loginPwd.trim()) { setLoginError("Digite sua senha pessoal."); return; }
    const hash = hashPassword(regEmail.trim().toLowerCase() + "|" + loginPwd);
    const emailLower = regEmail.trim().toLowerCase();
    storageAPI({ action: "checkUser", userHash: hash, email: emailLower }).then((data) => {
      if (data?.exists && data?.user) {
        const user = { name: data.user.name, hash, email: emailLower, role: data.user.role || "user" };
        setCurrentUser(user);
        storage.set("current-user", JSON.stringify(user));
        setShowRegister(false);
      } else {
        // Usuário pode estar no localStorage mas não no Sheets ainda
        // Tenta recuperar pelo localStorage
        try {
          const saved = localStorage.getItem("current-user");
          if (saved) {
            const savedUser = JSON.parse(saved);
            if (savedUser.hash === hash) {
              setCurrentUser(savedUser);
              setShowRegister(false);
              // Re-registra no Sheets em background
              storageAPI({ action: "registerUser", name: savedUser.name, userHash: hash, email: emailLower }).catch(() => {});
              return;
            }
          }
        } catch {}
        setLoginError("Email ou senha incorretos.");
      }
    }).catch(() => setLoginError("Erro ao conectar. Verifica sua conexão e tenta de novo."));
  }

  const [screen, setScreen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("bu") ? "workspace" : "home";
    } catch { return "home"; }
  });
  const [activeBU, setActiveBU] = useState(() => {
    // Lê ?bu=rac da URL pra permitir "Abrir em nova guia"
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("bu") || null;
    } catch { return null; }
  });
  const [page, setPage] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("page");
      return ["compose","style","presets-list","library","admin"].includes(p) ? p : "compose";
    } catch { return "compose"; }
  });

  // Auto-avança onboarding quando a página muda pro target esperado
  const setPageWithOnboard = (newPage) => {
    setPage(newPage);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("page", newPage);
      window.history.replaceState(null, "", `?${params.toString()}`);
    } catch {}
    if (onboardStep >= 0 && onboardStep < ONBOARDING_STEPS.length) {
      const step = ONBOARDING_STEPS[onboardStep];
      if (step.autoAdvance === `page:${newPage}`) {
        setTimeout(() => setOnboardStep(s => s + 1), 400);
      }
    }
  };

  const [presets, setPresets] = useState({});
  const [presetsLoaded, setPresetsLoaded] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [formPreset, setFormPreset] = useState(BLANK_PRESET);
  const [titleError, setTitleError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [switchNetModal, setSwitchNetModal] = useState(null);
  const [adminPage, setAdminPage] = useState("users"); // "users" | "presets"
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminPresets, setAdminPresets] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);


  // Onboarding
  const [onboardStep, setOnboardStep] = useState(-1); // inicia desligado, ativa ao entrar na primeira BU
  const onboardDone = () => { localStorage.setItem("onboard-done", "1"); setOnboardStep(-1); };

  // Busca na biblioteca
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("all"); // all | instagram | linkedin | tiktok | youtube | destaque

  // Calendário
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [calView, setCalView] = useState(false); // false = lista, true = calendário

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(() => { try { return JSON.parse(localStorage.getItem("notif-seen") || "{}"); } catch { return {}; } });
  const [pendingLegenda, setPendingLegenda] = useState(null); // legenda gerada antes de trocar
  const [showSaved, setShowSaved] = useState(false);

  const [library, setLibrary] = useState({});
  const [libraryLoaded, setLibraryLoaded] = useState({});

  const [draft, setDraft] = useState(emptyDraft());
  const [kwLoading, setKwLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [errorModal, setErrorModal] = useState("");
  useEffect(() => { if (error) { setErrorModal(error); } }, [error]);
  const [copiedKey, setCopiedKey] = useState("");
  const [concorrenteInput, setConcorrenteInput] = useState("");
  const [concorrenteTipo, setConcorrenteTipo] = useState("concorrente");
  const [vocabInput, setVocabInput] = useState("");
  const [benchLoading, setBenchLoading] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState({});
  const [liveScoring, setLiveScoring] = useState({}); // { platform: true } quando avaliando em tempo real
  const debounceRefs = React.useRef({});
  const [savingCaption, setSavingCaption] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedCaption, setSavedCaption] = useState({});
  const [starredCaption, setStarredCaption] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [scoreModal, setScoreModal] = useState(null); // { platform, legenda, hashtags, seoScore, toneScore, originalScore, analysis, loading } // { id, type: "caption"|"title", label }

  // Chat assistente
  const [chatOpen, setChatOpen] = useState(false);
  const [chatShowChoice, setChatShowChoice] = useState(false); // modal de escolha ao abrir
  const defaultChatMsg = (user) => {
    const nome = user?.name ? `, ${user.name.split(" ")[0]}` : "";
    return [{ role: "assistant", content: `Oi${nome}! 👋 Sou o assistente do Social Studio. Posso te ajudar com qualquer dúvida sobre a ferramenta, sugerir atalhos ou explicar como usar cada funcionalidade. Como posso ajudar?` }];
  };
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = React.useRef(null);

  // Ao abrir o chat, verifica se há histórico salvo
  const openChat = () => {
    const key = `chat-history:${currentUser?.hash || "anon"}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const history = JSON.parse(saved);
        if (history.length > 1) {
          // Tem histórico — pergunta se quer continuar ou começar novo
          setChatMessages(history);
          setChatShowChoice(true);
          setChatOpen(true);
          return;
        }
      }
    } catch {}
    // Sem histórico — abre direto com mensagem inicial
    setChatMessages(defaultChatMsg(currentUser));
    setChatOpen(true);
  };

  React.useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen]);

  const sendChatMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          userName: currentUser?.name || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages(prev => {
        const updated = [...prev, { role: "assistant", content: data.reply }];
        try { localStorage.setItem(`chat-history:${currentUser?.hash || "anon"}`, JSON.stringify(updated.slice(-40))); } catch {}
        return updated;
      });
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Erro ao conectar. Verifica sua conexão e tenta de novo." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const bu = BUS.find((b) => b.id === activeBU);
  const buPresets = (activeBU && presets[activeBU]) || [];
  const buLibrary = (activeBU && library[activeBU]) || [];
  const activeGenPreset = buPresets.find((p) => p.id === draft.presetId) || null;

  const loadPresets = useCallback((buId) => {
    // 1. Carrega do cache local imediatamente (zero latência)
    const cacheKey = `presets-cache:${buId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const list = JSON.parse(cached).map(normalizePreset);
        setPresets((prev) => ({ ...prev, [buId]: list }));
        setPresetsLoaded((prev) => ({ ...prev, [buId]: true }));
      } catch {}
    } else {
      setPresetsLoaded((prev) => ({ ...prev, [buId]: true }));
    }

    // 2. Atualiza do servidor em background (sem bloquear)
    const sync = async () => {
      try {
        const [pubData, privData] = await Promise.all([
          storageAPI({ action: "listPublicPresets", bu: buId }).catch(() => ({ presets: [] })),
          currentUser?.hash
            ? storageAPI({ action: "listPrivatePresets", bu: buId, userHash: currentUser.hash }).catch(() => ({ presets: [] }))
            : Promise.resolve({ presets: [] }),
        ]);
        const all = [
          ...(pubData.presets || []).map(normalizePreset),
          ...(privData.presets || []).map(normalizePreset),
        ];
        setPresets((prev) => ({ ...prev, [buId]: all }));
        localStorage.setItem(cacheKey, JSON.stringify(all));
      } catch {}
    };
    sync();
  }, [currentUser]);

  const loadLibrary = useCallback((buId) => {
    // Carrega do cache local primeiro (instantâneo)
    try {
      const cached = localStorage.getItem(`captions-cache:${buId}`);
      if (cached) setLibrary((prev) => ({ ...prev, [buId]: JSON.parse(cached) }));
    } catch {}
    setLibraryLoaded((prev) => ({ ...prev, [buId]: true }));
    // Sincroniza com Sheets em background
    storageAPI({ action: "listCaptions", bu: buId, requesterHash: currentUser?.hash || null, requesterRole: currentUser?.role || "user" })
      .then(data => {
        const list = data.captions || [];
        // Só substitui se o Sheets tiver pelo menos tanta coisa quanto o cache
        // (evita apagar legendas locais por falha temporária do Sheets)
        const cachedRaw = localStorage.getItem(`captions-cache:${buId}`);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : [];
        const merged = list.length >= cached.length ? list : cached;
        setLibrary((prev) => ({ ...prev, [buId]: merged }));
        localStorage.setItem(`captions-cache:${buId}`, JSON.stringify(merged));
      }).catch(() => {});
  }, [currentUser]);
  useEffect(() => {
    const handler = (e) => {
      if (!results && !genLoading) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter" && page === "compose") {
        e.preventDefault();
        draft.mode === "novo" ? generateCaptions() : optimizeCaptions();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, draft.mode, results, genLoading]);

  useEffect(() => {
    if (activeBU && !presetsLoaded[activeBU]) loadPresets(activeBU);
    if (activeBU) {
      storageAPI({ action: "listActivity", bu: activeBU })
        .then(d => setNotifications(d.activities || []))
        .catch(() => {});
    }
    if (activeBU && !libraryLoaded[activeBU]) loadLibrary(activeBU);
  }, [activeBU, presetsLoaded, libraryLoaded, loadPresets, loadLibrary]);

  useEffect(() => {
    if (activeBU && presetsLoaded[activeBU] && !draft.presetId) {
      const list = presets[activeBU] || [];
      if (list.length > 0) setDraft((d) => ({ ...d, presetId: list[0].id }));
    }
  }, [activeBU, presetsLoaded, presets]);

  const enterBU = (id) => {
    setActiveBU(id);
    setScreen("workspace");
    setPage("compose");
    setDraft(emptyDraft());
    setResults(null);
    setError("");
    setEditingId(null);
    try { window.history.replaceState(null, "", `?bu=${id}&page=compose`); } catch {}
    if (!localStorage.getItem("onboard-done")) setOnboardStep(0);
  };

  const switchBU = (id) => {
    setActiveBU(id);
    setDraft(emptyDraft());
    setResults(null);
    setError("");
    setEditingId(null);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("bu", id);
      window.history.replaceState(null, "", `?${params.toString()}`);
    } catch {}
  };

  const startNewPreset = () => {
    setEditingId("new");
    setFormPreset(BLANK_PRESET);
    setTitleError(false);
  };

  const selectPresetForEdit = (preset) => {
    setEditingId(preset.id);
    setFormPreset(preset);
    setTitleError(false);
  };

  const updateFormField = (field, value) => {
    setFormPreset((prev) => ({ ...prev, [field]: value }));
  };

  // Estado de visibilidade ao salvar estilo
  const [presetVisibility, setPresetVisibility] = useState("public");
  const [accessModal, setAccessModal] = useState(null); // { presetId, createdBy, editors: [] }
  const [allUsers, setAllUsers] = useState([]); // cache de usuários pra o modal

  const openScoreModal = async (platform, r) => {
    setScoreModal({ platform, legenda: r.legenda, hashtags: r.hashtags, seoScore: r.seoScore, toneScore: r.toneScore, originalScore: r.originalScore || 0, analysis: null, loading: true });
    try {
      const platformLabel = PLATFORMS.find(pl => pl.id === platform)?.label || platform;
      const kws = (draft.keywords || []).map(k => typeof k === "object" ? k.kw : k).join(", ");
      const { text } = await callAI({
        system: `Você é especialista em SEO para redes sociais e brandvoice. Analise a legenda fornecida e gere uma análise honesta e detalhada em JSON. Seja criterioso — uma legenda comum não merece nota alta. Retorne SOMENTE JSON válido sem markdown.`,
        prompt: `Legenda para ${platformLabel}:
"${r.legenda}"

Hashtags: ${(r.hashtags || []).join(", ") || "nenhuma"}
Keywords alvo: ${kws || "não informadas"}
Scores atuais — SEO: ${r.seoScore}/100, Tom: ${r.toneScore}/100, Originalidade: ${r.originalScore || 0}/100

Retorne este JSON exato:
{
  "seo": {
    "score": ${r.seoScore},
    "pontos_positivos": ["lista do que está bom"],
    "pontos_negativos": ["lista do que está faltando ou errado"],
    "como_chegar_a_100": ["ações específicas e concretas para melhorar"]
  },
  "tom": {
    "score": ${r.toneScore},
    "pontos_positivos": ["lista do que está bom"],
    "pontos_negativos": ["lista do que está faltando ou errado"],
    "como_chegar_a_100": ["ações específicas e concretas para melhorar"]
  },
  "originalidade": {
    "score": ${r.originalScore || 0},
    "pontos_positivos": ["lista do que está bom"],
    "pontos_negativos": ["lista do que está faltando ou errado"],
    "como_chegar_a_100": ["ações específicas e concretas para melhorar"]
  },
  "resumo": "Uma frase direta sobre o estado geral da legenda"
}`,
        useSearch: false,
      });
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setScoreModal(prev => ({ ...prev, analysis: parsed, loading: false }));
    } catch (e) {
      setScoreModal(prev => ({ ...prev, analysis: null, loading: false, error: "Não consegui gerar a análise agora." }));
    }
  };

  const openAccessModal = async (preset) => {
    // Carrega lista de usuários se ainda não tiver
    if (allUsers.length === 0) {
      try {
        const data = await storageAPI({ action: "listUsers" });
        setAllUsers(data.users || []);
      } catch {}
    }
    setAccessModal({
      presetId: preset.id,
      presetTitle: preset.title,
      editors: preset.editors || [],
    });
  };

  const savePreset = async () => {
    if (!formPreset.title.trim()) { setTitleError(true); return; }
    setTitleError(false);
    const list = presets[activeBU] || [];
    let savedId;
    let preset;
    if (editingId === "new" || !formPreset.id) {
      savedId = `${Date.now()}`;
      preset = { ...formPreset, id: savedId, createdBy: currentUser?.name || "Anônimo", userHash: currentUser?.hash || null, visibility: presetVisibility, createdAt: new Date().toISOString() };
    } else {
      savedId = formPreset.id;
      preset = { ...formPreset, updatedAt: new Date().toISOString() };
    }
    const idx = list.findIndex((p) => p.id === savedId);
    const updated = idx >= 0 ? list.map((p) => (p.id === savedId ? preset : p)) : [...list, preset];

    // Atualiza local IMEDIATAMENTE e mostra "Salvo!" sem esperar o servidor
    setPresets((prev) => ({ ...prev, [activeBU]: updated }));
    localStorage.setItem(`presets-cache:${activeBU}`, JSON.stringify(updated));
    setEditingId(savedId);
    setFormPreset(updated.find((p) => p.id === savedId));
    if (!draft.presetId) setDraft((d) => ({ ...d, presetId: savedId }));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1800);

    // Sincroniza com Upstash em background (com retry silencioso)
    const sync = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          const result = await storageAPI({ action: "savePreset", bu: activeBU, userHash: currentUser?.hash, preset, visibility: preset.visibility || presetVisibility });
          if (result.error) throw new Error(result.error);
          return; // sucesso
        } catch (e) {
          console.error(`Sync tentativa ${i+1} falhou:`, e.message);
          if (i === 2) setError(`Estilo salvo localmente mas falhou no servidor: ${e.message}`);
          else await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
    };
    sync();
  };

  const deletePreset = async (id) => {
    try {
      const list = presets[activeBU] || [];
      const preset = list.find((p) => p.id === id);
      const updated = list.filter((p) => p.id !== id);
      setPresets((prev) => ({ ...prev, [activeBU]: updated }));
      localStorage.setItem(`presets-cache:${activeBU}`, JSON.stringify(updated));
      // Sincroniza com o servidor em background
      storageAPI({
        action: "deletePreset",
        bu: activeBU,
        userHash: currentUser?.hash,
        presetId: id,
        visibility: preset?.visibility || "public",
      }).catch(() => {});
      if (editingId === id) {
        if (updated.length > 0) selectPresetForEdit(updated[0]);
        else startNewPreset();
      }
      if (draft.presetId === id) {
        setDraft((d) => ({ ...d, presetId: updated[0]?.id || null }));
      }
    } catch (e) {
      setError("Não consegui excluir esse estilo agora.");
    }
  };

  const selectPlatform = (id) => {
    // Se já está selecionada, não faz nada
    if (draft.platforms[0] === id) return;
    // Se há legenda gerada, pergunta o que fazer antes de trocar
    if (results) {
      setPendingLegenda({ toId: id });
      setSwitchNetModal({ toId: id });
    } else {
      setDraft((d) => ({ ...d, platforms: [id] }));
    }
  };

  const toggleTone = (tag) => {
    setDraft((d) => ({
      ...d,
      toneTags: d.toneTags.includes(tag) ? d.toneTags.filter((t) => t !== tag) : [...d.toneTags, tag],
    }));
  };

  const addKeyword = async () => {
    const kw = draft.keywordInput.trim();
    if (!kw) return;
    const exists = draft.keywords.some(k => (typeof k === "object" ? k.kw : k).toLowerCase() === kw.toLowerCase());
    if (exists) { setDraft(d => ({ ...d, keywordInput: "" })); return; }
    setDraft(d => ({ ...d, keywordInput: "" }));

    // Usa o mesmo endpoint de geração pra avaliar a KW com contexto real do tópico
    let quality = "medium";
    try {
      const topico = draft.topic || draft.existingCaption || "";
      const buLabel = BUS.find(b => b.id === activeBU)?.label || "Localiza";
      const { text } = await callAI({
        system: `Você avalia se uma palavra-chave é relevante para um post de redes sociais. Responda SOMENTE com um JSON: {"quality":"good"} ou {"quality":"medium"} ou {"quality":"low"}. Nada mais. good = palavra diretamente relevante pro tema do post e pra ${buLabel}; medium = relacionada de forma ampla; low = sem relevância semântica ou de SEO pra esse contexto.`,
        prompt: `Tópico do post: "${topico || buLabel}"
Palavra-chave a avaliar: "${kw}"`,
        useSearch: false,
      });
      const match = text.match(/good|medium|low/);
      if (match) quality = match[0];
    } catch {}

    setDraft(d => ({
      ...d,
      keywords: [...d.keywords, { kw, quality }],
    }));
  };

  const removeKeyword = (kw) => {
    setDraft((d) => ({
      ...d,
      keywords: d.keywords.filter((k) => (typeof k === "object" ? k.kw : k) !== kw),
    }));
  };

  const toggleKeywordSelected = (kw) => {
    setDraft((d) => {
      const key = (typeof kw === "object" ? kw.kw : kw).toLowerCase();
      const current = d.keywordSelected?.[key] !== false;
      return { ...d, keywordSelected: { ...d.keywordSelected, [key]: !current } };
    });
  };

  const toggleRelatedSelected = (index) => {
    setDraft((d) => ({
      ...d,
      relatedContent: d.relatedContent.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)),
    }));
  };

  const addVocab = () => {
    const term = vocabInput.trim();
    if (!term) return;
    updateFormField("vocabulario", [...(formPreset.vocabulario || []), term]);
    setVocabInput("");
  };

  const removeVocab = (index) => {
    updateFormField(
      "vocabulario",
      (formPreset.vocabulario || []).filter((_, i) => i !== index)
    );
  };

  const addConcorrente = () => {
    const nome = concorrenteInput.trim();
    if (!nome) return;
    const atuais = formPreset.concorrentes || [];
    if (atuais.length >= 5) {
      setError("Máximo de 5 referências/concorrentes por estilo.");
      return;
    }
    if (atuais.some((c) => c.nome === nome)) return;
    updateFormField("concorrentes", [...atuais, { nome, tipo: concorrenteTipo }]);
    setConcorrenteInput("");
  };

  const removeConcorrente = (nome) => {
    updateFormField(
      "concorrentes",
      (formPreset.concorrentes || []).filter((c) => c.nome !== nome)
    );
  };

  const runBenchmark = async () => {
    const lista = formPreset.concorrentes || [];
    if (lista.length === 0) {
      setError("Adicione pelo menos 1 referência/concorrente antes de rodar o benchmark.");
      return;
    }
    setError("");
    setBenchLoading(true);
    try {
      const concorrentesTxt = lista.filter((c) => c.tipo === "concorrente").map((c) => c.nome).join(", ") || "nenhum";
      const inspiracoesTxt = lista.filter((c) => c.tipo === "inspiracao").map((c) => c.nome).join(", ") || "nenhum";
      const system =
        "Você é um analista de social media que faz benchmark no Brasil. Responda SOMENTE com um array JSON de 5 a 8 strings em português do Brasil, cada uma um insight objetivo sobre tom, formato, uso de hashtags ou linhas editoriais. Sem markdown, sem texto fora do array.";
      const prompt = `BU: ${bu.label} (${bu.sub}), do grupo Localiza.\nConcorrentes diretos a analisar (usar pra entender posicionamento, nunca copiar tom): ${concorrentesTxt}\nInspirações de tom/formato (usar como referência direta de como escrever, mesmo sendo de outro setor): ${inspiracoesTxt}\n\nPesquise na web as redes sociais (Instagram, LinkedIn, TikTok, YouTube) desses perfis/marcas e identifique padrões de tom de voz, formato de legenda, uso de hashtags e temas que geram mais engajamento. Diferencie insights vindos de concorrentes (positioning) dos vindos de inspirações (tom/formato direto). Retorne um array JSON de insights curtos e acionáveis em português do Brasil.`;
      const { text } = await callAI({ system, prompt, useSearch: true });
      const insights = extractJSON(text);
      const insightsText = Array.isArray(insights) ? insights.map((i) => `• ${i}`).join("\n") : "";
      updateFormField("insights", insightsText);
    } catch (e) {
      setError(`Não consegui rodar o benchmark agora: ${e.message}`);
    } finally {
      setBenchLoading(false);
    }
  };

  const researchKeywords = async (silent) => {
    const baseTexto = draft.mode === "otimizar" ? draft.existingCaption : draft.topic;
    if (!baseTexto.trim()) {
      if (!silent) setError("Descreve o tópico do post antes de pesquisar palavras-chave.");
      return;
    }
    if (!silent) setError("");
    setKwLoading(true);
    try {
      const system =
        `Você é um estrategista de conteúdo e SEO para redes sociais no Brasil. Responda SOMENTE com um array JSON de objetos, sem markdown. Formato: [{"kw": "palavra-chave", "quality": "good|medium|low"}]. quality: good = diretamente relevante pro tema e com boa intenção de busca; medium = relacionado mas genérico; low = pouco relevante ou volume baixo.`;
      const prompt = `Marca/BU: ${bu.label} (${bu.sub}), do grupo Localiza.\nTópico/conteúdo do post: ${baseTexto}\n\nPesquise na web e sugira palavras-chave relevantes pra esse post, combinando três grupos: (1) as específicas e diretas sobre o tema do post, (2) variações e termos similares/semanticamente relacionados que as pessoas também buscam sobre esse mesmo assunto, e (3) termos mais amplos que conectem o tema à marca ${bu.label} (${bu.sub}), mesmo que não sejam a busca exata. Não se limite ao termo literal do tópico, mas cada sugestão precisa fazer sentido sozinha como expressão completa. Retorne de 8 a 12 palavras-chave em português do Brasil.`;
      const { text } = await callAI({ system, prompt, useSearch: true });
      const kws = extractJSON(text);
      if (Array.isArray(kws)) {
        const novos = kws.map((k) => {
          if (typeof k === "string") return { kw: k, quality: "medium" };
          if (k.kw) return { kw: k.kw, quality: k.quality || "medium" };
          if (k.termo) return { kw: k.termo, quality: "medium" };
          return null;
        }).filter(Boolean);
        setDraft((d) => {
          const existentes = new Set(d.keywords.map(x => typeof x === "object" ? x.kw : x));
          const novosUnicos = novos.filter(n => !existentes.has(n.kw));
          return { ...d, keywords: [...d.keywords, ...novosUnicos] };
        });
      }
    } catch (e) {
      if (!silent) setError("Não consegui pesquisar palavras-chave agora. Tenta de novo em instantes.");
    } finally {
      setKwLoading(false);
    }
  };

  const handleTopicBlur = () => {
    const baseTexto = draft.mode === "otimizar" ? draft.existingCaption : draft.topic;
    if (baseTexto.trim() && draft.keywords.length === 0 && !draft.autoKwTried) {
      setDraft((d) => ({ ...d, autoKwTried: true }));
      researchKeywords(true);
    }
  };

  const findRelatedContent = async () => {
    const baseTexto = draft.mode === "otimizar" ? draft.existingCaption : draft.topic;
    if (!baseTexto.trim()) {
      setError("Descreve o tópico do post antes de buscar conteúdo relacionado.");
      return;
    }
    setError("");
    setRelatedLoading(true);
    try {
      const bySubdomain = {
        zarp: "site:zarp.localiza.com",
        assinatura: "site:meoo.localiza.com",
        seminovos: "site:seminovos.localiza.com",
        caminhoes: "site:pesados.localiza.com",
        rac: "site:localiza.com",
      };
      const buQuery = bySubdomain[activeBU] || "site:localiza.com";

      // Enriquece a query com palavras-chave selecionadas pra busca ser mais
      // temática e não trazer páginas genéricas da Localiza sem relação com o assunto.
      const selectedKws = draft.keywords
        .filter((k) => { const kstr = typeof k === 'object' ? k.kw : k; return draft.keywordSelected?.[kstr.toLowerCase()] !== false; })
        .slice(0, 3)
        .join(" ");
      const queryBase = selectedKws ? `${baseTexto} ${selectedKws}` : baseTexto;

      // Dispara várias buscas diretas e específicas em paralelo e junta os resultados.
      const buscas = [
        `site:localiza.com ${queryBase}`,
        buQuery !== "site:localiza.com" ? `${buQuery} ${queryBase}` : null,
        `${queryBase} Localiza site:instagram.com/localiza OR site:instagram.com/localizameoo`,
        `${queryBase} Localiza site:youtube.com/user/grupolocaliza OR site:tiktok.com/@voudelocaliza`,
      ].filter(Boolean);

      const system =
        "Você é um assistente de pesquisa com acesso a busca real na web. Rode a busca exatamente como pedida no texto do usuário e reporte os resultados reais encontrados, sem inventar nada. Se não achar nada, diga que não achou.";

      const respostas = await Promise.all(
        buscas.map((q) => callAI({ system, prompt: q, useSearch: true }).catch(() => ({ sources: [], searched: false, searchError: "falhou" })))
      );

      const algumaBuscaRodou = respostas.some((r) => r.searched);
      if (!algumaBuscaRodou) {
        const motivo = respostas.find((r) => r.searchError)?.searchError || "não informado";
        setError(`A busca real não pôde ser feita agora. Motivo: ${motivo}`);
        setDraft((d) => ({ ...d, relatedContent: [] }));
        return;
      }

      const todasFontes = respostas.flatMap((r) => r.sources || []);

      const isOficial = (s) => {
        const tituloTemLocaliza = (s.title || "").toLowerCase().includes("localiza");
        try {
          const host = new URL(s.url).hostname.replace(/^www\./, "");
          if (host.includes("localiza")) return true;
          // Se não deu pra resolver o link real (ainda é o redirecionamento
          // do Google), só aceita se o título já mencionar Localiza.
          if (s.resolved === false) return tituloTemLocaliza;
          const extras = ["medium.com", "llz.me", "instagram.com", "facebook.com", "linkedin.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "spotify.com"];
          if (!extras.includes(host)) return false;
          // Posts/vídeos de rede social não têm o nome da marca na URL (ex:
          // instagram.com/p/abc123), então o título é o sinal mais confiável aqui.
          const u = s.url.toLowerCase();
          return (
            tituloTemLocaliza ||
            u.includes("/localiza") ||
            u.includes("grupolocaliza") ||
            u.includes("voudelocaliza") ||
            u.includes("localizabr") ||
            u.includes("localizalabs")
          );
        } catch {
          return tituloTemLocaliza;
        }
      };

      const guessRede = (s) => {
        const t = `${s.title || ""} ${s.url || ""}`.toLowerCase();
        if (t.includes("instagram")) return "Instagram";
        if (t.includes("linkedin")) return "LinkedIn";
        if (t.includes("tiktok")) return "TikTok";
        if (t.includes("youtube")) return "YouTube";
        if (t.includes("facebook")) return "Facebook";
        if (t.includes("x.com") || t.includes("twitter")) return "X";
        if (t.includes("spotify")) return "Spotify";
        if (t.includes("medium.com")) return "Blog Localiza Labs";
        return "Blog/Site oficial";
      };
      const platformsInPost = draft.platforms.map((p) => PLATFORMS.find((pl) => pl.id === p)?.label?.toLowerCase());

      const vistos = new Set();
      const items = todasFontes
        .filter((s) => s.url && s.title && isOficial(s))
        .filter((s) => {
          if (vistos.has(s.url)) return false;
          vistos.add(s.url);
          return true;
        })
        .map((s) => ({ rede: guessRede(s), titulo: s.title, url: s.url, dica: "Encontrado na busca dentro dos perfis/domínios oficiais da Localiza. Confira se faz sentido citar ou linkar." }))
        .filter((it) => !platformsInPost.includes(it.rede.toLowerCase()))
        .slice(0, 5);

      if (items.length === 0) {
        setError("A busca rodou de verdade em vários lugares oficiais, mas não achou nada específico pra esse tópico. Tenta descrever o tópico de outro jeito ou com mais detalhe.");
      }

      setDraft((d) => ({
        ...d,
        relatedContent: items.map((it) => ({ ...it, selected: true })),
      }));
    } catch (e) {
      setError(`Não consegui buscar conteúdo relacionado agora: ${e.message}`);
    } finally {
      setRelatedLoading(false);
    }
  };

  function buildSharedContext() {
    const selectedKeywords = draft.keywords.filter((k) => {
      const kw = typeof k === "object" ? k.kw : k;
      return draft.keywordSelected?.[kw.toLowerCase()] !== false;
    }).map(k => typeof k === "object" ? k.kw : k);

    const selectedRelated = (draft.relatedContent || []).filter((r) => r.selected);
    const relatedParaIncluir = selectedRelated.filter(r => (r.mode || "incluir") === "incluir");
    const relatedParaBasear = selectedRelated.filter(r => r.mode === "basear");
    const urls = relatedParaIncluir.map((r) => r.url).filter(Boolean);
    const relatedText =
      selectedRelated.length > 0
        ? [
            relatedParaIncluir.length > 0 ? `INCLUIR LINK: ${relatedParaIncluir.map((r) => `${r.rede}: "${r.titulo}", URL: ${r.url}`).join("; ")}` : "",
            relatedParaBasear.length > 0 ? `USAR COMO INSPIRAÇÃO DE TEMA E TOM (não citar diretamente): ${relatedParaBasear.map((r) => `${r.rede}: "${r.titulo}"`).join("; ")}` : "",
          ].filter(Boolean).join(" | ")
        : "nenhum selecionado pelo time";

    const p = activeGenPreset || BLANK_PRESET;

    const vocabTxt = (p.vocabulario || []).length
      ? p.vocabulario.map((v, i) => `${i + 1}. ${v}`).join("; ")
      : "nenhum definido";

    const exemplosSalvos = buLibrary
      .filter((c) => c.destaque)
      .concat(buLibrary.filter((c) => !c.destaque))
      .slice(0, 4)
      .map((c) => `[${c.platform}] "${c.legenda}"`)
      .join("\n");

    const emojiInstr = draft.useEmojis
      ? "OBRIGATÓRIO: inclua 2 a 4 emojis no texto, mas cada um precisa fazer sentido real no ponto em que aparece, como um reforço visual da ideia daquela frase específica, não como decoração jogada aleatoriamente. Coloque o emoji logo após a palavra ou frase que ele ilustra. Jamais abra a legenda com emoji, nunca use emoji genérico (🌟✨💡) sem contexto real. Exemplos do que NÃO fazer: 'Viaje com estilo 🌟 e conforto ✨'. Exemplos do que fazer: 'Mala arrumada? O carro você já garantiu 🧳' ou 'Seis destinos, uma só estrada, zero preocupação com combustível 🛣️'."
      : "Não use nenhum emoji no texto.";
    const hashtagInstr = draft.useHashtags
      ? 'Gere hashtags relevantes: no máximo 5, mas a quantidade ideal varia por post e por plataforma (pode ser 1, 2, 3, 4 ou 5); não use sempre o mesmo número, decida pela relevância real.'
      : 'Não gere hashtags. Retorne "hashtags": [].';

    const bulletsInstr = draft.useBullets
      ? `REGRA ABSOLUTA DE ESTRUTURA — BULLETS OBRIGATÓRIOS: O campo "legenda" do JSON DEVE usar o caractere literal \\n para quebras de linha e DEVE conter uma lista com bullets usando • como marcador. Formato exato obrigatório: "Abertura em 1-2 frases.\\n\\n• Primeiro item\\n• Segundo item\\n• Terceiro item\\n\\nEncerramento com CTA." — Se não tiver bullets e \\n no resultado, a resposta está ERRADA.`
      : `ESTRUTURA: escreva em prosa com parágrafos separados por \\n\\n. Nunca entregue tudo num bloco único sem respiro.`;

    const urlInstr =
      urls.length > 0
        ? `Se houver URL pra incluir, coloque-a SEMPRE no final do texto, depois de toda a mensagem e antes das hashtags, assim: "Confira em: ${urls[0]}" ou "Saiba mais: ${urls[0]}". Nunca escreva "link na bio" nem mencione a URL no meio do texto. URLs a incluir: ${urls.join(", ")}.`
        : "Nenhuma URL selecionada para incluir.";

    const pessoaExemplo = draft.pessoaLocaliza === "1"
      ? "1ª pessoa do plural. Exemplos reais de como usar: 'Na Localiza, a gente acredita que...', 'Somos a maior rede de aluguel de carros do Brasil e...', 'Oferecemos a frota mais nova do mercado para...'. A marca deve aparecer como sujeito ativo da frase."
      : draft.pessoaLocaliza === "2"
      ? "2ª pessoa dirigida ao leitor. Exemplos reais: 'Com a Localiza, você escolhe o carro certo para...', 'Sua viagem começa quando você reserva com a Localiza', 'Para você que busca conforto e segurança, a Localiza tem...'. O leitor é o foco, a Localiza resolve o problema dele."
      : "3ª pessoa. Exemplos reais: 'A Localiza é a parceira de viagem de quem...', 'Com mais de X agências, a Localiza garante que...', 'A Localiza lança mais uma frota de veículos...'. Fale da marca como protagonista da história.";
    const citarInstr = draft.citarLocaliza
      ? `OBRIGATÓRIO — CITAR A LOCALIZA: a legenda DEVE conter uma frase que mencione a Localiza explicitamente pelo nome, integrada de forma natural ao texto. Use ${pessoaExemplo} Não basta mencionar "nós" sem deixar claro que é a Localiza — o nome da marca deve aparecer ao menos uma vez.`
      : "";

    return { p, selectedKeywords, relatedText, vocabTxt, exemplosSalvos, emojiInstr, hashtagInstr, bulletsInstr, urlInstr, citarInstr };
  }

  const generateCaptions = async () => {
    if (!draft.topic.trim()) {
      setError("Descreve o tópico do post antes de gerar as legendas.");
      return;
    }
    if (draft.platforms.length === 0) {
      setError("Selecione pelo menos uma rede social.");
      return;
    }
    setError("");
    setGenLoading(true);
    setResults(null);
    try {
      const ctx = buildSharedContext();
      const platformNotes = platformNotesFor(draft.length);

      const system = `Você é redator sênior de social media do grupo Localiza, especializado na BU ${bu.label} (${bu.sub}).
Escreva como uma pessoa real do time criativa e apurada escreveria: com personalidade, ponto de vista, ritmo próprio. Nunca escreva como press release nem como descrição de produto. Escreva como quem entende o assunto e tem algo real a dizer.
Erros concretos a evitar:
- Não abra com "Você sabia que", "Chegou a hora de", "Não perca tempo", "Está pronto para", "Descubra o segredo de" ou variações genéricas.
- Nunca introduza lugar, rota ou contexto geográfico sem âncora real — se mencionar "a serra", "as montanhas" ou qualquer destino, precisa haver um contexto claro no tópico ou nas informações fornecidas que justifique isso.
- Evite expressões sentimentais vagas como "memórias quentinhas", "momentos especiais", "experiência inesquecível" — substitua por imagens concretas e específicas.
- Nunca use "segurança automotiva garantida", "manutenção em dia" ou qualquer promessa técnica genérica — se for falar de segurança, contextualize com uma situação real.
- Não force metáforas de temperatura ou clima como recursos emocionais ("clima gelado se transforma em convite quente", etc.).
REGRA ABSOLUTA E INEGOCIÁVEL: JAMAIS use travessão (—) em nenhuma parte de nenhuma legenda, em nenhuma hipótese. Use vírgula, ponto ou reformule a frase em vez disso.
Cada legenda deve ter uma abertura forte e inesperada (um fato curioso, uma pergunta que provoca, uma observação que o leitor não esperava, uma cena que ele reconhece), um desenvolvimento que entregue valor real (dica prática, contexto, perspectiva), e um encerramento com CTA claro e humano.
Estilo de referência usado: ${ctx.p.title || "nenhum estilo salvo selecionado"}
Regras da marca: ${ctx.p.regras || "nenhuma regra específica definida"}
Eixo editorial: ${ctx.p.eixo || "não definido"}
Fio condutor que toda legenda deve manter: ${ctx.p.fioCondutor || "não definido"}
Vocabulário e registro de marca (referência de espírito e tom, não lista de palavras obrigatórias — pode ser explícito ou implícito conforme o contexto pedir): ${ctx.vocabTxt}
O que evitar: ${ctx.p.evitar || "nenhuma restrição adicional"}
Insights de benchmark de concorrentes/inspirações (usar como inspiração, nunca citar ou comparar diretamente): ${ctx.p.insights || "nenhum insight coletado"}
Exemplos reais de legendas já aprovadas pelo time para este BU (aprenda o padrão de tom/estrutura, não copie literalmente):
${ctx.exemplosSalvos || "nenhum salvo ainda"}
Exemplos manuais fornecidos no estilo: ${ctx.p.exemplos || "nenhum"}

${ctx.emojiInstr}
${ctx.hashtagInstr}
${ctx.urlInstr}

PALAVRAS-CHAVE: incorpore o tema e a intenção das palavras-chave listadas de forma fluida e natural no texto, como uma pessoa real escreveria, nunca como lista, nunca colando o termo de forma mecânica. Adapte o termo ao contexto e ao tom da plataforma: se a keyword é "aluguel de carro para viajar", escreva "pra quem vai viajar de carro" ou "na hora de planejar a viagem com carro alugado", não o termo exato engessado. O objetivo é que o texto responda a intenção de busca de quem pesquisa esse tema, não que inclua o termo roboticamente.

OTIMIZAÇÃO SEO PARA REDES SOCIAIS: escreva como um especialista em SEO e conteúdo faria, não só como redator. Isso significa:
- Inclua a palavra-chave principal ou variação próxima nas primeiras 1 a 2 linhas da legenda (onde o algoritmo e o leitor dão mais peso).
- Use variações semânticas naturais ao longo do texto (sinônimos, termos relacionados, perguntas que o público faz), não repita a mesma keyword várias vezes.
- A estrutura da legenda deve responder a intenção de quem buscaria esse tema: quem pesquisa "aluguel de carro férias" quer saber como resolver, não só ler sobre o assunto.
- No LinkedIn e YouTube, os primeiros 150 caracteres são indexados com mais peso: capriche na abertura tanto pro algoritmo quanto pro leitor.
- No Instagram e TikTok, as hashtags ampliam o alcance semântico: use-as como extensão do SEO, não como decoração.
- Não sacrifique o tom humano pelo SEO, mas não abra mão do SEO pelo tom: um especialista de verdade consegue os dois ao mesmo tempo.

Para cada plataforma, avalie a legenda gerada em "seoScore" (0-100, cobertura temática das keywords e uso estratégico de hashtags) e "toneScore" (0-100, aderência a regras/tom/eixo/fio condutor). Seja criterioso.

Responda SOMENTE com um objeto JSON válido, sem markdown, no formato:
{"plataforma_id": {"legenda": "Primeira frase.\n\n• Item um\n• Item dois\n\nEncerramento.", "hashtags": ["hashtag"], "seoScore": 0, "toneScore": 0, "originalScore": 0}}
ATENÇÃO: no campo "legenda", use \n para quebras de linha. NÃO inclua titulo_youtube aqui. Use exatamente os ids de plataforma como chaves. O campo "originalScore" (0-100) avalia: abertura não é clichê (+40), estrutura varia das últimas legendas (+30), sem construções genéricas de IA (+30).`

      const prompt = `Tópico do post: ${draft.topic}
Objetivo do post: ${draft.objective}
Tom de voz específico deste post: ${draft.toneTags.length ? draft.toneTags.join(", ") : "seguir o tom geral do estilo selecionado"}
Palavras-chave para integrar organicamente (não copie literal — adapte ao contexto da frase): ${ctx.selectedKeywords.length ? ctx.selectedKeywords.join(", ") : "nenhuma definida"}
Conteúdos relacionados selecionados: ${ctx.relatedText}
Plataformas solicitadas: ${draft.platforms.join(", ")}

Notas por plataforma:
${draft.platforms.map((pl) => `- ${pl}: ${platformNotes[pl]}`).join("\n")}

Crie a legenda do zero pra cada plataforma solicitada. Gere uma versão diferente de qualquer legenda que já tenha sido gerada anteriormente para este mesmo tópico; varie abertura, estrutura e ângulo narrativo. Seed de variação: ${Math.random().toString(36).slice(2, 8)}`;

      const { text } = await callAI({ system, prompt, useSearch: false });
      const parsed = sanitizeResults(extractJSON(text));
      setResults(parsed);
    } catch (e) {
      setError("Não consegui gerar as legendas agora. Tenta de novo em instantes.");
    } finally {
      setGenLoading(false);
    }
  };

  const optimizeCaptions = async () => {
    if (!draft.existingCaption.trim()) {
      setError("Cole a legenda atual antes de otimizar.");
      return;
    }
    if (draft.platforms.length === 0) {
      setError("Selecione pelo menos uma rede social.");
      return;
    }
    setError("");
    setGenLoading(true);
    setResults(null);
    try {
      const ctx = buildSharedContext();
      const platformNotes = platformNotesFor(draft.length);

      const system = `Você é redator sênior de social media do grupo Localiza, especializado na BU ${bu.label} (${bu.sub}).
Sua tarefa é OTIMIZAR uma legenda que já existe, não criar do zero. Preserve a mensagem central e a voz original, mas melhore: abertura (deve ser forte, não genérica), ritmo, cobertura temática das palavras-chave, aderência ao tom da marca, e encerramento com CTA claro. Se a abertura original for fraca ou clichê, reescreva-a. Nunca produza algo que pareça texto gerado por IA.
REGRA ABSOLUTA E INEGOCIÁVEL: JAMAIS use travessão (—) em nenhuma parte de nenhuma legenda. Se a legenda original tiver travessão, remova e reescreva com vírgula, ponto ou outra construção.
Estilo de referência usado: ${ctx.p.title || "nenhum estilo salvo selecionado"}
Regras da marca: ${ctx.p.regras || "nenhuma regra específica definida"}
Eixo editorial: ${ctx.p.eixo || "não definido"}
Fio condutor: ${ctx.p.fioCondutor || "não definido"}
Vocabulário e registro de marca (referência de espírito e tom, não lista de palavras obrigatórias — pode ser explícito ou implícito conforme o contexto pedir): ${ctx.vocabTxt}
O que evitar: ${ctx.p.evitar || "nenhuma restrição adicional"}
Exemplos reais de legendas já aprovadas pelo time (aprenda o padrão, não copie literalmente):
${ctx.exemplosSalvos || "nenhum salvo ainda"}

${ctx.emojiInstr}
${ctx.hashtagInstr}
${ctx.urlInstr}

PALAVRAS-CHAVE: ao otimizar, certifique-se de que o tema e a intenção das palavras-chave estejam presentes de forma fluida no texto, como uma pessoa real escreveria. Adapte o termo ao contexto, nunca cole o termo exato de forma mecânica se isso soar artificial. Reescreva frases onde fizer sentido pra cobrir o tema, sem sacrificar o tom.

OTIMIZAÇÃO SEO PARA REDES SOCIAIS: otimize como um especialista em SEO e conteúdo faria:
- Keyword principal ou variação próxima deve estar nas primeiras 1 a 2 linhas (onde o algoritmo e o leitor dão mais peso).
- Use variações semânticas ao longo do texto (sinônimos, termos relacionados), não repita a mesma keyword várias vezes.
- A estrutura deve responder a intenção de busca de quem pesquisaria esse tema.
- No LinkedIn e YouTube, os primeiros 150 caracteres têm peso maior pro algoritmo: garanta que a abertura seja relevante também para indexação.
- Hashtags no Instagram e TikTok como extensão semântica do SEO, não decoração.
- Tom humano e SEO não são opostos: um especialista de verdade entrega os dois.

Para cada plataforma, avalie a legenda otimizada em "seoScore" (0-100, cobertura temática das keywords) e "toneScore" (0-100). Seja criterioso.

Responda SOMENTE com um objeto JSON válido, sem markdown, no formato:
{"plataforma_id": {"legenda": "Primeira frase.\n\n• Item um\n• Item dois\n\nEncerramento.", "hashtags": ["hashtag"], "seoScore": 0, "toneScore": 0, "originalScore": 0}}
ATENÇÃO: no campo "legenda", use \n para quebras de linha. NÃO inclua titulo_youtube aqui. Use exatamente os ids de plataforma como chaves. O campo "originalScore" (0-100) avalia: abertura não é clichê (+40), estrutura varia das últimas legendas (+30), sem construções genéricas de IA (+30).`

      const prompt = `Legenda atual a ser otimizada: """${draft.existingCaption}"""
Objetivo do post: ${draft.objective}
Tom de voz específico: ${draft.toneTags.length ? draft.toneTags.join(", ") : "seguir o tom geral do estilo selecionado"}
Palavras-chave para integrar organicamente (adapte ao contexto — não insira de forma robótica): ${ctx.selectedKeywords.length ? ctx.selectedKeywords.join(", ") : "nenhuma definida"}
Conteúdos relacionados selecionados: ${ctx.relatedText}
Plataformas solicitadas: ${draft.platforms.join(", ")}

Notas por plataforma:
${draft.platforms.map((pl) => `- ${pl}: ${platformNotes[pl]}`).join("\n")}

Adapte e otimize a legenda acima pra cada plataforma solicitada. Gere uma versão diferente da anterior se já houve uma tentativa anterior; varie a estrutura e ângulo. Seed de variação: ${Math.random().toString(36).slice(2, 8)}`;

      const { text } = await callAI({ system, prompt, useSearch: false });
      const parsed = sanitizeResults(extractJSON(text));
      setResults(parsed);
    } catch (e) {
      setError("Não consegui otimizar a legenda agora. Tenta de novo em instantes.");
    } finally {
      setGenLoading(false);
    }
  };

  // Score determinístico — algoritmo local, sem Gemini, sempre consistente
  const scoreCaption = (platformId, legenda, hashtags) => {
    const p = activeGenPreset || BLANK_PRESET;
    const selectedKeywords = (draft.keywords || [])
      .filter(k => draft.keywordSelected?.[(typeof k === "object" ? k.kw : k).toLowerCase()] !== false)
      .map(k => (typeof k === "object" ? k.kw : k).toLowerCase());

    const text = (legenda || "").toLowerCase();
    const words = text.split(/\s+/);
    const first15 = words.slice(0, 15).join(" ");

    // --- SEO ---
    let seo = 0;
    // Keyword nas primeiras 15 palavras
    const kwInOpening = selectedKeywords.some(kw => first15.includes(kw));
    seo += kwInOpening ? 25 : 0;
    // Keywords no corpo
    const kwInBody = selectedKeywords.filter(kw => text.includes(kw)).length;
    seo += Math.min(kwInBody, 2) * 10;
    // Hashtags
    const hLen = (hashtags || []).length;
    const idealHashtags = { instagram: [3, 7], linkedin: [1, 3], tiktok: [2, 5], youtube: [0, 3] };
    const [hMin, hMax] = idealHashtags[platformId] || [1, 5];
    seo += (hLen >= hMin && hLen <= hMax) ? 20 : hLen > 0 ? 10 : 0;
    // Comprimento adequado por plataforma
    const charLen = legenda?.length || 0;
    const idealLen = { instagram: [80, 200], linkedin: [100, 300], tiktok: [50, 150], youtube: [100, 500] };
    const [lMin, lMax] = idealLen[platformId] || [80, 300];
    seo += (charLen >= lMin && charLen <= lMax) ? 20 : charLen > 30 ? 10 : 0;
    // CTA presente
    const ctaWords = ["saiba mais", "confira", "acesse", "reserve", "clique", "link", "veja", "descubra", "agende", "baixe"];
    seo += ctaWords.some(w => text.includes(w)) ? 15 : 0;
    seo = Math.min(100, seo);

    // --- TOM ---
    let tom = 100;
    // Penalizar clichês
    const cliches = ["mergulhe em", "descubra o poder", "eleve sua", "experiência única", "momentos especiais", "não é só", "muito mais do que", "transforme sua", "faça parte", "junte-se a nós", "a vida é feita"];
    const clicheCount = cliches.filter(w => text.includes(w)).length;
    tom -= clicheCount * 15;
    // Penalizar abertura genérica (começa com "o", "a", "os", "as" + adjetivo)
    const genericStart = /^(o|a|os|as)\s+(incrível|fantástico|melhor|perfeito|ideal|especial|único|exclusivo)/i;
    if (genericStart.test(legenda || "")) tom -= 10;
    // Vocabulário da marca presente
    const vocab = (p.vocabulario || []).map(v => v.toLowerCase());
    const vocabMatch = vocab.filter(v => text.includes(v)).length;
    tom += Math.min(vocabMatch * 5, 15);
    // Penalizar texto muito curto (sem narrativa)
    if (charLen < 50) tom -= 20;
    tom = Math.max(0, Math.min(100, tom));

    // --- ORIGINALIDADE ---
    let orig = 100;
    const genericPhrases = ["experiência única", "momentos especiais", "a vida é feita de", "memórias", "inesquecível", "não perca", "aproveite", "especial para você", "exclusivo para"];
    orig -= genericPhrases.filter(w => text.includes(w)).length * 12;
    // Abertura abstrata penalizada
    const abstractStart = /^(a|o|os|as|um|uma)?\s*(vida|amor|momento|sonho|felicidade|liberdade)/i;
    if (abstractStart.test(legenda || "")) orig -= 20;
    orig = Math.max(0, Math.min(100, orig));

    const scores = { seoScore: seo, toneScore: Math.round(tom), originalScore: Math.round(orig) };
    setResults(prev => prev && prev[platformId] ? ({
      ...prev,
      [platformId]: { ...prev[platformId], ...scores },
    }) : prev);
    setScoreModal(prev => prev && prev.platform === platformId ? { ...prev, ...scores } : prev);
    return scores;
  };

  const reanalyzeCaption = (platformId) => {
    const r = results?.[platformId];
    if (!r) return;
    setReanalyzing(prev => ({ ...prev, [platformId]: true }));
    scoreCaption(platformId, r.legenda, r.hashtags);
    setTimeout(() => setReanalyzing(prev => ({ ...prev, [platformId]: false })), 300);
  };

  // Avalia em tempo real com debounce quando a legenda é editada
  const onLegendaChange = (platformId, newLegenda) => {
    setResults(prev => {
      const updated = { ...prev, [platformId]: { ...prev[platformId], legenda: newLegenda } };
      // Score é determinístico — calcula direto, sem debounce nem Gemini
      const r = updated[platformId];
      const scores = scoreCaption(platformId, newLegenda, r?.hashtags);
      return { ...updated, [platformId]: { ...updated[platformId], ...scores } };
    });
  };

  const [publishDateModal, setPublishDateModal] = useState(null);
  const [publishDateInput, setPublishDateInput] = useState("");
  const [captionNameInput, setCaptionNameInput] = useState("");

  const doSaveCaption = async (platformId, destaque, publishDate = "", captionName = "") => {
    const r = results?.[platformId];
    if (!r || !activeBU) return;
    setSavingCaption((prev) => ({ ...prev, [platformId]: true }));
    try {
      const entry = {
        id: `${Date.now()}`,
        bu: activeBU,
        platform: platformId,
        legenda: r.legenda,
        hashtags: r.hashtags || [],
        titulo_youtube: platformId === "youtube" ? (r.titulo_youtube || "") : undefined,
        topico: captionName || (draft.mode === "otimizar" ? draft.existingCaption.slice(0, 80) : draft.topic),
        presetTitle: activeGenPreset?.title || "",
        seoScore: r.seoScore,
        toneScore: r.toneScore,
        destaque: !!destaque,
        destaqueTitle: false,
        visibility: "private",
        savedBy: currentUser?.name || "Anônimo",
        userHash: currentUser?.hash || "",
        savedAt: new Date().toISOString(),
        publishDate,
        versions: [],
      };
      const current = library[activeBU] || [];
      const updated = [entry, ...current];
      setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
      localStorage.setItem(`captions-cache:${activeBU}`, JSON.stringify(updated));
      storageAPI({ action: "saveCaption", caption: entry }).catch(() => {});
      if (destaque) {
        setStarredCaption((prev) => ({ ...prev, [platformId]: true }));
      } else {
        setSavedCaption((prev) => ({ ...prev, [platformId]: true }));
      }
    } catch (e) {
      setError("Não consegui salvar essa legenda agora.");
    } finally {
      setSavingCaption((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  const saveCaption = (platformId, destaque) => {
    const suggested = (draft.topic || draft.existingCaption || "").slice(0, 40).trim();
    setCaptionNameInput(suggested);
    setPublishDateModal({ platformId, destaque });
    setPublishDateInput("");
  };

  const toggleDestaque = (id) => {
    const current = library[activeBU] || [];
    const cap = current.find(x => x.id === id);
    const updated = current.map((c) => (c.id === id ? { ...c, destaque: !c.destaque } : c));
    setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
    localStorage.setItem(`captions-cache:${activeBU}`, JSON.stringify(updated));
    if (cap) storageAPI({ action: "saveCaption", caption: { ...cap, destaque: !cap.destaque } }).catch(() => {});
  };

  const deleteCaption = (id) => {
    const current = library[activeBU] || [];
    const updated = current.filter((c) => c.id !== id);
    setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
    localStorage.setItem(`captions-cache:${activeBU}`, JSON.stringify(updated));
    storageAPI({ action: "deleteCaption", captionId: id, bu: activeBU }).catch(() => {});
  };

  const copyToClipboard = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1500);
    } catch (e) {
      /* clipboard indisponível, ignora silenciosamente */
    }
  };

  const inputStyle = { background: "#FFFFFF", color: TEXT, borderColor: BORDER };
  const inputClass = "ls-input w-full text-sm border rounded-lg px-3 py-2.5";

  // ---------- SENHA ----------
  if (!unlocked) {
    return (
      <div
        translate="no"
        className="min-h-screen flex items-center justify-center px-6 notranslate"
        style={{
          background: `linear-gradient(160deg, ${GREEN} 0%, ${GREEN_DEEPER} 100%)`,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <GlobalStyle />
        <div className="w-full max-w-sm bg-white rounded-2xl p-7" style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
          <h1 style={{ fontFamily: "Georgia, serif", color: GREEN }} className="text-2xl mb-1 text-center">
            Social Studio
          </h1>
          <p className="text-sm text-center mb-5" style={{ color: MUTED }}>
            Acesso restrito ao time de conteúdo
          </p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setPasswordError(false);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (passwordInput === APP_PASSWORD) {
                storage.set("app-unlocked", "true");
                setUnlocked(true);
              } else {
                setPasswordError(true);
              }
            }}
            placeholder="Senha de acesso"
            className={inputClass}
            style={passwordError ? { borderColor: "#C0402A" } : {}}
            autoFocus
          />
          {passwordError && (
            <p className="text-xs mt-2" style={{ color: "#C0402A" }}>
              Senha incorreta.
            </p>
          )}
          <button
            onClick={() => {
              if (passwordInput === APP_PASSWORD) {
                storage.set("app-unlocked", "true");
                setUnlocked(true);
              } else {
                setPasswordError(true);
              }
            }}
            style={{ background: GREEN }}
            className="w-full text-white text-sm font-medium rounded-lg py-2.5 mt-4 hover:opacity-90 transition-opacity"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  // ---------- LOGIN / CADASTRO ----------
  if (unlocked && showRegister) {
    return (
      <div
        translate="no"
        className="min-h-screen flex items-center justify-center px-6 notranslate"
        style={{ background: `linear-gradient(160deg, ${GREEN} 0%, ${GREEN_DEEPER} 100%)`, fontFamily: "system-ui, sans-serif" }}
      >
        <GlobalStyle />
        <div className="w-full max-w-sm bg-white rounded-2xl p-7" style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
          <h1 style={{ fontFamily: "Georgia, serif", color: GREEN }} className="text-2xl mb-1 text-center">Social Studio</h1>
          <p className="text-sm text-center mb-5" style={{ color: MUTED }}>Acesso restrito ao time de conteúdo</p>

          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border mb-5" style={{ borderColor: BORDER }}>
            {[["login", "Entrar"], ["register", "Criar conta"]].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => { setAuthMode(mode); setLoginError(""); setRegError(""); }}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={authMode === mode ? { background: GREEN, color: "#FFF" } : { background: "#FFFFFF", color: MUTED }}
              >
                {label}
              </button>
            ))}
          </div>

          {authMode === "login" ? (
            <>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => { setRegEmail(e.target.value); setLoginError(""); }}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("login-pwd-input")?.focus()}
                placeholder="seu@email.com"
                className={inputClass}
                style={{ marginBottom: 12 }}
                autoFocus
              />
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Senha pessoal</label>
              <input
                id="login-pwd-input"
                type="password"
                value={loginPwd}
                onChange={(e) => { setLoginPwd(e.target.value); setLoginError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Digite sua senha"
                className={inputClass}
              />
              {loginError && <p className="text-xs mt-2" style={{ color: "#C0402A" }}>{loginError}</p>}
              <button
                onClick={handleLogin}
                style={{ background: GREEN }}
                className="w-full text-white text-sm font-medium rounded-lg py-2.5 mt-4 hover:opacity-90 transition-opacity"
              >
                Entrar
              </button>
            </>
          ) : (
            <>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => { setRegEmail(e.target.value); setRegError(""); }}
                placeholder="seu@email.com"
                className={inputClass}
                style={{ marginBottom: 12 }}
                autoFocus
              />
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Nome de exibição</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => { setRegName(e.target.value); setRegError(""); }}
                placeholder="Ex: Vitória"
                className={inputClass}
                style={{ marginBottom: 12 }}
              />
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Senha pessoal</label>
              <input
                type="password"
                value={regPwd}
                onChange={(e) => { setRegPwd(e.target.value); setRegError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
              />
              <p className="text-[11px] mt-1.5 mb-4" style={{ color: "#8A6A1F" }}>
                Use uma senha que você não usa em nenhum outro lugar, pois ela protege seus estilos privados nesta ferramenta.
              </p>
              {regError && <p className="text-xs mb-3" style={{ color: "#C0402A" }}>{regError}</p>}
              <button
                onClick={handleRegister}
                style={{ background: GREEN }}
                className="w-full text-white text-sm font-medium rounded-lg py-2.5 hover:opacity-90 transition-opacity"
              >
                Criar conta e entrar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- HOME ----------
  if (screen === "home") {
    return (
      <div
        translate="no"
        className="min-h-screen flex flex-col relative overflow-hidden notranslate"
        style={{
          background: `radial-gradient(1200px 600px at 85% -20%, rgba(120,222,31,0.14), transparent 55%), radial-gradient(800px 500px at -10% 100%, rgba(120,222,31,0.08), transparent 55%), linear-gradient(160deg, ${GREEN} 0%, ${GREEN_DEEPER} 100%)`,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <GlobalStyle />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 28px, ${LIME} 28px, ${LIME} 44px)`,
            backgroundPosition: "0 6px",
            backgroundSize: "100% 2px",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="flex-1 flex flex-col items-center px-6 py-20 sm:py-24 relative">
          <div className="w-full max-w-xl text-center mb-14">
            <span
              className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase mb-5 px-3 py-1 rounded-full"
              style={{ color: LIME, background: "rgba(120,222,31,0.12)", border: `1px solid rgba(120,222,31,0.3)` }}
            >
              Time de conteúdo · redes sociais
            </span>
            <h1 style={{ fontFamily: "Georgia, serif" }} className="text-5xl sm:text-6xl text-white tracking-tight mb-4">
              Social Studio
            </h1>
            <p className="text-white/65 text-base max-w-sm mx-auto leading-relaxed">
              Gerador de legendas e hashtags otimizadas em SEO
            </p>
          </div>

          <div className="w-full max-w-xl">
            <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 px-1">Escolha a BU</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {BUS.map((b, i) => (
                <a
                  key={b.id}
                  href={`?bu=${b.id}`}
                  onClick={(e) => { e.preventDefault(); enterBU(b.id); }}
                  className="ls-bu-row group w-full flex items-center gap-5 px-5 sm:px-7 py-5 text-left"
                  style={{ borderBottom: i < BUS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none", display: "flex", textDecoration: "none" }}
                >
                  <span style={{ color: "rgba(255,255,255,0.28)" }} className="ls-bu-number flex items-center justify-center shrink-0 w-12">
                    <ArrowRight size={26} strokeWidth={1.75} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-white font-semibold text-lg leading-tight">{b.label}</span>
                    <span className="block text-white/50 text-sm mt-0.5">{b.sub}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- WORKSPACE ----------
  return (
    <><div translate="no" className="min-h-screen flex flex-col md:flex-row notranslate" style={{ background: BG, color: TEXT, fontFamily: "system-ui, sans-serif", transition: "background 0.2s, color 0.2s" }}>
      <GlobalStyle />
      {/* Overlay mobile quando menu aberto */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className="w-full md:w-64 md:shrink-0 flex flex-col relative" style={{ background: `linear-gradient(180deg, ${GREEN} 0%, ${GREEN_DEEPER} 100%)` }}>

        {/* Barra compacta mobile — só aparece em telas pequenas */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setMobileMenuOpen((o) => !o)}
        >
          <div>
            <p className="text-white text-xs font-semibold">{bu?.label}</p>
            <p className="text-white/55 text-[11px]">{page === "compose" ? "Nova legenda" : page === "style" ? "Estilo geral da marca" : page === "presets-list" ? "Estilos criados" : "Legendas salvas"}</p>
          </div>
          <div className="flex items-center gap-2">
            {mobileMenuOpen ? <X size={18} className="text-white/80" /> : <Menu size={18} className="text-white/80" />}
          </div>
        </div>

        {/* Conteúdo do menu — oculto no mobile quando fechado */}
        <div className={`${mobileMenuOpen ? "block" : "hidden"} md:flex md:flex-col md:flex-1`}
          style={mobileMenuOpen ? { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 40, background: `linear-gradient(180deg, ${GREEN} 0%, ${GREEN_DEEPER} 100%)`, maxHeight: "80vh", overflowY: "auto" } : {}}
        >
        <button onClick={() => setScreen("home")} className="ls-side-link flex items-center gap-2 px-6 py-5 text-white/75 text-xs font-medium">
          <ArrowLeft size={14} />
          Trocar BU
        </button>

        <div className="px-6 pb-5">
          <p className="text-white text-[15px] font-semibold leading-tight">{bu.label}</p>
          <p className="text-white/55 text-xs mt-0.5">{bu.sub}</p>
        </div>

        <div className="mx-6 h-px mb-4" style={{ background: "rgba(255,255,255,0.12)" }} />

        <nav className="px-4 space-y-1">
          <button
            onClick={() => { setPageWithOnboard("compose"); setMobileMenuOpen(false); }}
data-onboard="compose-btn"
            className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "compose" ? "active" : "text-white/85"}`}
          >
            <FileEdit size={15} />
            Nova legenda
          </button>
          <button
            onClick={() => {
              setPageWithOnboard("style");
              if (!editingId) {
                if (buPresets.length > 0) selectPresetForEdit(buPresets[0]);
                else startNewPreset();
              }
            }}
data-onboard="style-btn"
            className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "style" ? "active" : "text-white/85"}`}
          >
            <Settings2 size={15} />
            Estilo geral da marca
          </button>
          <button
            onClick={() => { setPageWithOnboard("presets-list"); setMobileMenuOpen(false); }}
            className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "presets-list" ? "active" : "text-white/85"}`}
          >
            <Users size={15} />
            Estilos criados
          </button>
          <button
            onClick={() => { setPageWithOnboard("library"); setMobileMenuOpen(false); }}
data-onboard="library-btn"
            className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "library" ? "active" : "text-white/85"}`}
          >
            <Bookmark size={15} />
            Legendas salvas
          </button>

          {isAdminUser(currentUser) && (
            <button
              onClick={() => setPage("admin")}
              className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "admin" ? "active" : "text-white/85"}`}
            >
              <Shield size={15} />
              Painel Admin
            </button>
          )}

          <div className="mx-2 h-px my-2" style={{ background: "rgba(255,255,255,0.1)" }} />

          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider pl-4 pb-1">BUs</p>
          {BUS.map((b) => (
            <a
              key={b.id}
              href={`?bu=${b.id}`}
              onClick={(e) => { e.preventDefault(); b.id !== activeBU && switchBU(b.id); setMobileMenuOpen(false); }}
              className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg text-sm font-medium ${b.id === activeBU ? "active" : "text-white/70"}`}
              style={{ textDecoration: "none" }}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.id === activeBU ? "bg-lime-400" : "bg-white/30"}`} />
              {b.label}
            </a>
          ))}
        </nav>

        <div className="px-6 py-5 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {currentUser && (
            <div className="mb-3">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1">Usuário</p>
              <p className="text-white/80 text-xs font-medium">{currentUser.name}</p>
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem("onboard-done");
              setPage("compose");
              setResults(null);
              setTimeout(() => setOnboardStep(0), 100);
            }}
            className="flex items-center gap-2 text-white/40 text-xs hover:text-white/70 transition-colors mb-2"
          >
            <HelpCircle size={13} />
            Refazer tutorial
          </button>
          <button
            onClick={async () => {
              storage.set("current-user", "");
              storage.set("app-unlocked", "");
              setCurrentUser(null);
              setUnlocked(false);
              setShowRegister(false);
            }}
            className="flex items-center gap-2 text-white/50 text-xs hover:text-white/80 transition-colors"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
        </div>{/* fim do div colapsável mobile */}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b px-4 sm:px-8 py-4" style={{ borderColor: BORDER, background: "#FFFFFF" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium tracking-wide" style={{ color: MUTED }}>{bu.label}</p>
              <h2 className="text-lg font-semibold">
                {page === "compose" ? "Nova legenda" : page === "style" ? "Estilo geral da marca" : page === "presets-list" ? "Estilos criados" : page === "admin" ? "Painel Admin" : "Legendas salvas"}
              </h2>
            </div>
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(o => !o);
                  if (!notifOpen) {
                    // Marca todos como vistos
                    const seen = {};
                    notifications.forEach(n => seen[n.id] = true);
                    setNotifSeen(seen);
                    localStorage.setItem("notif-seen", JSON.stringify(seen));
                  }
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell size={18} style={{ color: MUTED }} />
                {notifications.filter(n => !notifSeen[n.id]).length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: "#EF4444" }}>
                    {Math.min(notifications.filter(n => !notifSeen[n.id]).length, 9)}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl border z-50 overflow-hidden" style={{ borderColor: BORDER }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                    <p className="text-sm font-semibold" style={{ color: GREEN_DARK }}>Atividade em {bu.label}</p>
                    <button onClick={() => setNotifOpen(false)}>
                      <X size={14} style={{ color: MUTED }} />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm px-4 py-6 text-center" style={{ color: MUTED }}>Nenhuma atividade ainda.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="px-4 py-3 border-b hover:bg-gray-50" style={{ borderColor: BORDER, background: notifSeen[n.id] ? "#FFF" : "#F0FFF4" }}>
                          <p className="text-xs font-semibold" style={{ color: GREEN_DARK }}>{n.userName}</p>
                          <p className="text-xs mt-0.5" style={{ color: TEXT }}>{n.description}</p>
                          <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                            {new Date(n.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => {
                      storageAPI({ action: "listActivity", bu: activeBU })
                        .then(d => setNotifications(d.activities || []))
                        .catch(() => {});
                    }}
                    className="w-full py-2 text-xs text-center hover:bg-gray-50 transition-colors"
                    style={{ color: MUTED }}
                  >
                    Atualizar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          {page === "style" && (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
              <div>
                <button
                  onClick={startNewPreset}
                  className="ls-btn-ghost w-full flex items-center justify-center gap-1.5 text-xs font-medium border rounded-lg py-2 mb-2 bg-white"
                  style={{ borderColor: BORDER, color: MUTED }}
                >
                  <Plus size={14} />
                  Novo estilo
                </button>
                <label
                  className="ls-btn-ghost w-full flex items-center justify-center gap-1.5 text-xs font-medium border rounded-lg py-2 mb-3 bg-white cursor-pointer"
                  style={{ borderColor: BORDER, color: MUTED }}
                  title="Importe um template .docx preenchido"
                >
                  <Upload size={14} />
                  Importar template
                  <input
                    type="file"
                    accept=".docx,.txt"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      e.target.value = "";
                      setError("");
                      try {
                        // Lê o arquivo como texto puro (.txt ou .docx simples)
                        let text = "";
                        try {
                          if (file.name.endsWith(".txt")) {
                            text = await file.text();
                          } else {
                            // Para .docx, extrai tags <w:t> do XML interno
                            const arrayBuffer = await file.arrayBuffer();
                            const bytes = new Uint8Array(arrayBuffer);
                            const decoder = new TextDecoder("utf-8", { fatal: false });
                            const raw = decoder.decode(bytes);
                            const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
                            text = matches.map(m => m.replace(/<[^>]+>/g, "")).join(" ").trim();
                          }
                          if (!text || text.length < 20) {
                            setError("Não consegui ler o arquivo. Use o template .txt fornecido.");
                            return;
                          }
                        } catch (readErr) {
                          setError(`Erro ao ler o arquivo: ${readErr.message}`);
                          return;
                        }
                        // Manda pro Gemini interpretar e preencher os campos
                        const { text: jsonText } = await callAI({
                          system: `Você é um parser de documentos. Dado o texto abaixo extraído de um template de estilo de marca, extraia os campos e retorne SOMENTE um objeto JSON válido com estas chaves exatas (string, sem markdown): title, regras, eixo, fioCondutor, tom, vocabulario (array de strings, uma por item), evitar, exemplos. Se um campo estiver vazio ou não encontrado, use string vazia ou array vazio.`,
                          prompt: text,
                          useSearch: false,
                        });
                        const parsed = extractJSON(jsonText);
                        if (!parsed || !parsed.title) {
                          setError("Não consegui ler o template. Verifique se está no formato correto.");
                          return;
                        }
                        const newPreset = {
                          ...BLANK_PRESET,
                          ...parsed,
                          vocabulario: Array.isArray(parsed.vocabulario) ? parsed.vocabulario : (parsed.vocabulario || "").split("\n").map(s => s.trim()).filter(Boolean),
                        };
                        setEditingId("new");
                        setFormPreset(newPreset);
                        setTitleError(false);
                      } catch (err) {
                        setError(`Erro ao importar o template: ${err.message}`);
                      }
                    }}
                  />
                </label>
                <div className="space-y-1.5">
                  {buPresets.length === 0 && (
                    <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                      Nenhum estilo salvo ainda pra {bu.label}. Crie o primeiro ao lado.
                    </p>
                  )}
                  {buPresets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => selectPresetForEdit(p)}
                      className={`ls-preset-item flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer ${editingId === p.id ? "active" : ""}`}
                      style={{ borderColor: editingId === p.id ? LIME : BORDER }}
                    >
                      <span className="text-sm font-medium truncate" style={{ color: TEXT }}>
                        {p.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(p.id);
                        }}
                        className="ls-trash shrink-0"
                        aria-label="Excluir estilo"
                      >
                        <Trash2 size={13} style={{ color: "#8A3A1F" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="ls-card bg-white border rounded-2xl p-6 space-y-6" style={{ borderColor: BORDER }}>
                  <div>
                    <label className="text-xs font-semibold tracking-wide flex items-center gap-1.5 mb-1.5" style={{ color: MUTED }}>
                      <PenLine size={13} />
                      Título do estilo
                    </label>
                    <input
                      value={formPreset.title}
                      onChange={(e) => {
                        updateFormField("title", e.target.value);
                        if (e.target.value.trim()) setTitleError(false);
                      }}
                      placeholder='Ex: "Tom padrão", "Campanha Black Friday", "Institucional"'
                      className={inputClass}
                      style={titleError ? { borderColor: "#C0402A" } : {}}
                    />
                    {titleError && (
                      <p className="text-[11px] mt-1" style={{ color: "#C0402A" }}>
                        Dá um título pro estilo antes de salvar.
                      </p>
                    )}
                  </div>

                  <Field label="Regras da marca (o que pode e o que não pode)">
                    <textarea
                      key={editingId + ".regras"}
                      defaultValue={formPreset.regras}
                      onBlur={(e) => updateFormField("regras", e.target.value)}
                      placeholder="Ex: não citar concorrentes pelo nome, não comparar diretamente com X, mencionar Y só de forma informativa..."
                      className={`${inputClass} min-h-[72px]`}
                    />
                  </Field>

                  <Field label="Eixo editorial">
                    <textarea
                      key={editingId + ".eixo"}
                      defaultValue={formPreset.eixo}
                      onBlur={(e) => updateFormField("eixo", e.target.value)}
                      placeholder="Ex: liberdade, mobilidade sem burocracia, praticidade no dia a dia..."
                      className={`${inputClass} min-h-[56px]`}
                    />
                  </Field>

                  <Field label="Fio condutor">
                    <textarea
                      key={editingId + ".fioCondutor"}
                      defaultValue={formPreset.fioCondutor}
                      onBlur={(e) => updateFormField("fioCondutor", e.target.value)}
                      placeholder="Ex: toda legenda deve conectar o assunto do post de volta à ideia de simplificar a vida de quem dirige..."
                      className={`${inputClass} min-h-[56px]`}
                    />
                  </Field>

                  <div>
                    <label className="text-xs font-semibold tracking-wide block mb-1.5" style={{ color: MUTED }}>
                      Vocabulário/expressões preferidas
                    </label>
                    {(formPreset.vocabulario || []).length > 0 && (
                      <ol className="space-y-1 mb-2 pl-1">
                        {formPreset.vocabulario.map((v, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm rounded-lg border px-3 py-1.5" style={{ borderColor: BORDER, background: "#F6F9F6" }}>
                            <span className="font-semibold w-5 shrink-0" style={{ color: GREEN }}>
                              {i + 1}.
                            </span>
                            <span className="flex-1" style={{ color: TEXT }}>
                              {v}
                            </span>
                            <button onClick={() => removeVocab(i)} className="ls-chip-x shrink-0" aria-label="Remover">
                              <X size={13} style={{ color: MUTED }} />
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                    <div className="flex gap-2 items-start">
                      <textarea
                        value={vocabInput}
                        onChange={(e) => setVocabInput(e.target.value)}
                        placeholder={"Uma expressão por linha\nEx: É Localiza, pode confiar\nA vida não espera"}
                        className={`${inputClass} flex-1 min-h-[72px] resize-none`}
                        rows={3}
                      />
                      <button
                        onClick={() => {
                          const terms = vocabInput.split("\n").map((t) => t.trim()).filter(Boolean);
                          if (!terms.length) return;
                          updateFormField("vocabulario", [...(formPreset.vocabulario || []), ...terms]);
                          setVocabInput("");
                        }}
                        className="ls-btn-ghost px-3 rounded-lg border bg-white shrink-0"
                        style={{ borderColor: BORDER, color: MUTED }}
                        aria-label="Adicionar"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold tracking-wide flex items-center gap-1.5 mb-1.5" style={{ color: MUTED }}>
                      <Users size={13} />
                      Referências (até 5): marque se é concorrente ou inspiração
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formPreset.concorrentes || []).map((c) => (
                        <span
                          key={c.nome}
                          className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-xs font-medium"
                          style={
                            c.tipo === "inspiracao"
                              ? { background: LIME_SOFT, borderColor: LIME, color: GREEN_DARK }
                              : { background: "#FFFFFF", borderColor: BORDER, color: TEXT }
                          }
                        >
                          <span
                            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                            style={c.tipo === "inspiracao" ? { background: LIME, color: GREEN_DEEPER } : { background: "#EDEFEC", color: MUTED }}
                          >
                            {c.tipo === "inspiracao" ? "Insp." : "Conc."}
                          </span>
                          {c.nome}
                          <button onClick={() => removeConcorrente(c.nome)} className="ls-chip-x focus:outline-none" aria-label="Remover">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <input
                        value={concorrenteInput}
                        onChange={(e) => setConcorrenteInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addConcorrente()}
                        placeholder="Nome da marca/perfil"
                        disabled={(formPreset.concorrentes || []).length >= 5}
                        className={`${inputClass} flex-1 min-w-[160px] disabled:opacity-50`}
                      />
                      <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
                        <button
                          onClick={() => setConcorrenteTipo("concorrente")}
                          className="ls-mode-tab text-xs font-medium px-3"
                          style={concorrenteTipo === "concorrente" ? { background: GREEN, color: "#FFFFFF" } : { background: "#FFFFFF", color: MUTED }}
                        >
                          Concorrente
                        </button>
                        <button
                          onClick={() => setConcorrenteTipo("inspiracao")}
                          className="ls-mode-tab text-xs font-medium px-3"
                          style={concorrenteTipo === "inspiracao" ? { background: GREEN, color: "#FFFFFF" } : { background: "#FFFFFF", color: MUTED }}
                        >
                          Inspiração
                        </button>
                      </div>
                      <button
                        onClick={addConcorrente}
                        disabled={(formPreset.concorrentes || []).length >= 5}
                        className="ls-btn-ghost px-3 rounded-lg border bg-white disabled:opacity-50"
                        style={{ borderColor: BORDER, color: MUTED }}
                        aria-label="Adicionar"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={runBenchmark}
                        disabled={benchLoading}
                        className="ls-btn-ghost flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border disabled:opacity-60 whitespace-nowrap"
                        style={{ background: LIME_SOFT, color: GREEN_DARK, borderColor: LIME }}
                      >
                        {benchLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                        Analisar
                      </button>
                    </div>
                    <p className="text-[11px] mb-2 leading-relaxed" style={{ color: MUTED }}>
                      Concorrente = posicionamento (nunca copiar tom). Inspiração = referência direta de como escrever.
                    </p>
                    {formPreset.insights && (
                      <textarea
                        key={editingId + ".insights"}
                        defaultValue={formPreset.insights}
                        onBlur={(e) => updateFormField("insights", e.target.value)}
                        className={`${inputClass} min-h-[120px]`}
                      />
                    )}
                  </div>

                  <Field label="Tom de voz geral">
                    <textarea
                      key={editingId + ".tomGeral"}
                      defaultValue={formPreset.tomGeral}
                      onBlur={(e) => updateFormField("tomGeral", e.target.value)}
                      placeholder="Ex: próximo, confiante, sem ser informal demais..."
                      className={`${inputClass} min-h-[64px]`}
                    />
                  </Field>

                  <Field label="O que evitar">
                    <textarea
                      key={editingId + ".evitar"}
                      defaultValue={formPreset.evitar}
                      onBlur={(e) => updateFormField("evitar", e.target.value)}
                      placeholder="Termos, tons ou construções a evitar"
                      className={`${inputClass} min-h-[56px]`}
                    />
                  </Field>

                  <Field label="Exemplos de legendas (opcional)">
                    <textarea
                      key={editingId + ".exemplos"}
                      defaultValue={formPreset.exemplos}
                      onBlur={(e) => updateFormField("exemplos", e.target.value)}
                      placeholder="Cole 1 ou 2 legendas de referência"
                      className={`${inputClass} min-h-[56px]`}
                    />
                  </Field>

                  {error && (
                    <div className="flex items-start gap-2 text-sm rounded-lg px-3 py-2" style={{ color: "#8A3A1F", background: "#FBEDE7", border: "1px solid #F0C9B8" }}>
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-xs font-semibold tracking-wide block mb-2" style={{ color: MUTED }}>Visibilidade do estilo</label>
                    <div className="flex gap-2">
                      {[
                        { id: "public", label: "Público", desc: "Todos do time veem" },
                        { id: "private", label: "Privado", desc: "Só você vê" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setPresetVisibility(opt.id)}
                          disabled={editingId !== "new" && !!formPreset.id}
                          className="flex-1 text-xs font-medium rounded-lg py-2 px-3 border text-left disabled:opacity-50"
                          style={presetVisibility === opt.id
                            ? { background: GREEN, color: "#FFF", borderColor: GREEN }
                            : { background: "#FFFFFF", color: MUTED, borderColor: BORDER }}
                        >
                          <div className="font-semibold">{opt.label}</div>
                          <div className="opacity-75">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conceder acesso — só aparece pro criador e admins quando editando um estilo existente */}
                  {formPreset.id && (formPreset.userHash === currentUser?.hash || isAdminUser(currentUser)) && (
                    <button
                      onClick={() => openAccessModal(formPreset)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-medium rounded-lg py-2 mb-3 border"
                      style={{ borderColor: BORDER, color: MUTED }}
                    >
                      <Users size={13} />
                      Conceder acesso de edição
                      {(formPreset.editors || []).length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: LIME_SOFT, color: GREEN_DARK }}>
                          {formPreset.editors.length}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Bloquear edição se não tiver permissão */}
                  {formPreset.id && !canEditPreset(formPreset, currentUser) ? (
                    <div className="rounded-lg p-3 text-xs text-center" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      Você não tem permissão para editar este estilo. Peça acesso ao criador.
                    </div>
                  ) : (
                  <button
                    onClick={savePreset}
                    disabled={saving}
                    style={{ background: GREEN }}
                    className="w-full flex items-center justify-center gap-2 text-white text-sm font-medium rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : showSaved ? <Check size={14} /> : null}
                    {showSaved ? "Estilo salvo" : editingId === "new" ? "Salvar novo estilo" : "Salvar alterações"}
                  </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {page === "admin" && isAdminUser(currentUser) && (
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: GREEN_DARK }}>Painel Admin</h2>
              <p className="text-sm mb-4" style={{ color: MUTED }}>
                {currentUser?.email === OWNER_EMAIL ? "Proprietário" : "Administrador"} · acesso total
              </p>

              <div className="flex gap-2 mb-6">
                {["users", "presets"].map((tab) => (
                  <button
                    key={tab}
                    onClick={async () => {
                      setAdminPage(tab);
                      setAdminLoading(true);
                      try {
                        if (tab === "users") {
                          const data = await storageAPI({ action: "listUsers" });
                          setAdminUsers(data.users || []);
                        } else {
                          const data = await storageAPI({ action: "listAllPresets", requesterEmail: currentUser?.email });
                          setAdminPresets(data.presets || []);
                        }
                      } catch (e) { setError(`Erro ao carregar: ${e.message}`); }
                      finally { setAdminLoading(false); }
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium border"
                    style={adminPage === tab ? { background: GREEN, color: "#FFF", borderColor: GREEN } : { background: "#FFFFFF", color: MUTED, borderColor: BORDER }}
                  >
                    {tab === "users" ? "Usuários" : "Estilos"}
                  </button>
                ))}
                <button
                  onClick={async () => {
                    setAdminLoading(true);
                    try {
                      if (adminPage === "users") {
                        const data = await storageAPI({ action: "listUsers" });
                        setAdminUsers(data.users || []);
                      } else {
                        const data = await storageAPI({ action: "listAllPresets", requesterEmail: currentUser?.email });
                        setAdminPresets(data.presets || []);
                      }
                    } catch (e) { setError(`Erro ao carregar: ${e.message}`); }
                    finally { setAdminLoading(false); }
                  }}
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: BORDER, color: MUTED }}
                >
                  {adminLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </button>
              </div>

              {adminLoading && <p className="text-sm" style={{ color: MUTED }}>Carregando...</p>}

              {!adminLoading && adminPage === "users" && (
                <div className="space-y-2">
                  {adminUsers.length === 0 && <p className="text-sm" style={{ color: MUTED }}>Nenhum usuário ainda. Clique em "Usuários" pra carregar.</p>}
                  {adminUsers.map((u) => (
                    <div key={u.hash} className="border rounded-xl p-4 flex items-center justify-between gap-3" style={{ borderColor: BORDER }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: GREEN_DARK }}>{u.name}</p>
                        <p className="text-xs" style={{ color: MUTED }}>{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={u.email === OWNER_EMAIL ? { background: "#FEF9C3", color: "#92400E" } : u.role === "admin" ? { background: "#DCFCE7", color: GREEN_DARK } : { background: "#F6F9F6", color: MUTED }}>
                          {u.email === OWNER_EMAIL ? "Proprietário" : u.role === "admin" ? "Admin" : "Usuário"}
                        </span>
                        {currentUser?.email === OWNER_EMAIL && u.email !== OWNER_EMAIL && (
                          <button
                            onClick={async () => {
                              const newRole = u.role === "admin" ? "user" : "admin";
                              try {
                                await storageAPI({ action: "setUserRole", targetHash: u.hash, role: newRole, requesterEmail: currentUser.email });
                                setAdminUsers(prev => prev.map(x => x.hash === u.hash ? { ...x, role: newRole } : x));
                              } catch (e) { setError(`Erro: ${e.message}`); }
                            }}
                            className="text-xs px-2 py-1 rounded border"
                            style={{ borderColor: BORDER, color: MUTED }}
                          >
                            {u.role === "admin" ? "Revogar admin" : "Tornar admin"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!adminLoading && adminPage === "presets" && (
                <div className="space-y-2">
                  {adminPresets.length === 0 && <p className="text-sm" style={{ color: MUTED }}>Nenhum estilo ainda. Clique em "Estilos" pra carregar.</p>}
                  {adminPresets.map((p) => (
                    <div key={p.id} className="border rounded-xl p-4" style={{ borderColor: BORDER }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: GREEN_DARK }}>{p.title || "(sem título)"}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                            BU: {p._bu} · Criado por: {p.createdBy || "?"} ·
                            <span className="ml-1" style={{ color: p._visibility === "public" ? GREEN_DARK : MUTED }}>
                              {p._visibility === "public" ? "Público" : "Privado"}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={async () => {
                              const newVis = p._visibility === "public" ? "private" : "public";
                              try {
                                await storageAPI({ action: "adminUpdatePreset", presetId: p.id, visibility: newVis, requesterEmail: currentUser?.email, bu: p._bu, userHash: p._userHash });
                                setAdminPresets(prev => prev.map(x => x.id === p.id ? { ...x, _visibility: newVis } : x));
                              } catch (e) { setError(`Erro: ${e.message}`); }
                            }}
                            className="text-[11px] px-2 py-1 rounded border"
                            style={{ borderColor: BORDER, color: MUTED }}
                          >
                            {p._visibility === "public" ? "Tornar privado" : "Tornar público"}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Excluir o estilo "${p.title}"?`)) return;
                              try {
                                await storageAPI({ action: "deletePreset", presetId: p.id, bu: p._bu, userHash: p._userHash, requesterEmail: currentUser?.email });
                                setAdminPresets(prev => prev.filter(x => x.id !== p.id));
                              } catch (e) { setError(`Erro: ${e.message}`); }
                            }}
                            className="text-[11px] px-2 py-1 rounded border"
                            style={{ borderColor: "#FCA5A5", color: "#7F1D1D" }}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {page === "presets-list" && (
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: GREEN_DARK }}>Estilos criados</h2>
              <p className="text-sm mb-5" style={{ color: MUTED }}>Clique em um estilo pra usá-lo na geração de legendas.</p>
              {buPresets.length === 0 ? (
                <>
                <p className="text-sm" style={{ color: MUTED }}>Nenhum estilo criado ainda pra {bu.label}.</p>
                <button
                  onClick={() => { setPage("style"); startNewPreset(); }}
                  style={{ background: GREEN }}
                  className="mt-4 text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
                >
                  Criar primeiro estilo
                </button>
              </>
              ) : (
                <div className="space-y-3">
                  {buPresets.map((p) => {
                    const canEdit = canEditPreset(p, currentUser);
                    const isCreator = p.userHash === currentUser?.hash;
                    const isSelected = draft.presetId === p.id;
                    return (
                      <div
                        key={p.id}
                        className="ls-card bg-white border rounded-xl p-4 cursor-pointer"
                        style={{ borderColor: isSelected ? GREEN : BORDER, boxShadow: isSelected ? `0 0 0 2px ${GREEN}22` : undefined }}
                        onClick={() => setDraft((d) => ({ ...d, presetId: p.id }))}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: GREEN_DARK }}>{p.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                              Criado por <span className="font-medium">{p.createdBy || "Anônimo"}</span>
                              {p.visibility === "private" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#F0F4F3", color: MUTED }}>Privado</span>}
                              {(p.editors || []).length > 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#EAF9DC", color: GREEN_DARK }}>{p.editors.length} editor(es)</span>}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                            {canEdit && (
                              <button
                                onClick={(e) => { e.stopPropagation(); selectPresetForEdit(p); setPage("style"); }}
                                className="text-[11px] px-2 py-1 rounded border"
                                style={{ borderColor: BORDER, color: MUTED }}
                              >
                                Editar
                              </button>
                            )}
                            {(isCreator || isAdminUser(currentUser)) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openAccessModal(p); }}
                                className="text-[11px] px-2 py-1 rounded border"
                                style={{ borderColor: BORDER, color: MUTED }}
                                title="Conceder acesso de edição"
                              >
                                <Users size={11} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDraft((d) => ({ ...d, presetId: p.id })); setPage("compose"); }}
                              className="text-[11px] px-2 py-1 rounded text-white"
                              style={{ background: GREEN }}
                            >
                              Usar
                            </button>
                          </div>
                        </div>
                        {p.regras && <p className="text-[11px] mt-2 line-clamp-2" style={{ color: MUTED }}>{p.regras}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {page === "library" && (
            <div>
              <p className="text-sm mb-2" style={{ color: MUTED }}>
                Legendas salvas de {bu.label}. As destacadas (⭐) têm mais peso como exemplo pra próxima geração.

                <div className="flex flex-wrap gap-2 mt-4 mb-2">
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={e => setLibrarySearch(e.target.value)}
                    placeholder="Buscar nas legendas..."
                    className="flex-1 text-sm border rounded-lg px-3 py-2"
                    style={{ borderColor: BORDER, background: "#FFFFFF", color: TEXT, minWidth: 160 }}
                  />
                  <select
                    value={libraryFilter}
                    onChange={e => setLibraryFilter(e.target.value)}
                    className="text-sm border rounded-lg px-2 py-2"
                    style={{ borderColor: BORDER, background: "#FFFFFF", color: TEXT }}
                  >
                    <option value="all">Todas as redes</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="destaque">⭐ Destacadas</option>
                  </select>
                  <button
                    onClick={() => setCalView(v => !v)}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border"
                    style={calView ? { background: GREEN, color: "#FFF", borderColor: GREEN } : { borderColor: BORDER, color: MUTED, background: "#FFFFFF" }}
                  >
                    <Calendar size={14} />
                    {calView ? "Lista" : "Calendário"}
                  </button>
                </div>

                {/* Calendário editorial */}
                {calView && (() => {
                  const year = calMonth.year, month = calMonth.month;
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
                  const today = new Date();
                  const platColor = { instagram: "#E1306C", linkedin: "#0A66C2", tiktok: "#69C9D0", youtube: "#FF0000" };
                  const byDay = {};
                  buLibrary.filter(x => x.publishDate).forEach(x => {
                    const parts = x.publishDate.split("-");
                    const y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2]);
                    if (y === year && m === month) {
                      if (!byDay[d]) byDay[d] = [];
                      byDay[d].push(x);
                    }
                  });
                  return (
                    <div className="mb-6 rounded-xl border p-4" style={{ borderColor: BORDER, background: "#FAFCFA" }}>
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: BORDER, color: MUTED }}>‹</button>
                        <p className="text-sm font-semibold" style={{ color: GREEN_DARK }}>{monthNames[month]} {year}</p>
                        <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: BORDER, color: MUTED }}>›</button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
                          <p key={d} className="text-[10px] font-semibold text-center" style={{ color: MUTED }}>{d}</p>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const posts = byDay[day] || [];
                          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                          return (
                            <div key={day} className="rounded-lg p-1.5 min-h-[48px]" style={{ background: isToday ? LIME_SOFT : "#FFFFFF", border: `1px solid ${isToday ? LIME : BORDER}` }}>
                              <p className="text-[10px] font-bold mb-1" style={{ color: isToday ? GREEN_DARK : MUTED }}>{day}</p>
                              {posts.slice(0, 2).map((post, pi) => (
                                <button
                                  key={pi}
                                  onClick={() => {
                                    setCalView(false);
                                    setTimeout(() => {
                                      const el = document.getElementById(`caption-${post.id}`);
                                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                    }, 100);
                                  }}
                                  className="w-full text-left rounded px-1 py-0.5 mb-0.5 truncate hover:opacity-80"
                                  style={{ background: platColor[post.platform] || GREEN, color: "#fff", fontSize: 8, lineHeight: 1.3 }}
                                  title={post.topico || post.legenda?.slice(0, 60)}
                                >
                                  {(post.topico || post.legenda || "").slice(0, 18) || post.platform}
                                </button>
                              ))}
                              {posts.length > 2 && <p className="text-[8px]" style={{ color: MUTED }}>+{posts.length - 2}</p>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                        {Object.entries(platColor).map(([plat, color]) => (
                          <div key={plat} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                            <span className="text-[11px] capitalize" style={{ color: MUTED }}>{plat}</span>
                          </div>
                        ))}
                        {buLibrary.filter(x => x.publishDate).length === 0 && (
                          <p className="text-[11px] w-full" style={{ color: MUTED }}>Nenhuma legenda com data de publicação ainda. Ao salvar uma legenda, informe a data pra ela aparecer aqui.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {buLibrary.filter(c => c.platform === "youtube" && c.titulo_youtube).length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>Títulos YouTube salvos</p>
                    <div className="space-y-2">
                      {buLibrary.filter(c => c.platform === "youtube" && c.titulo_youtube).map(c => (
                        <div key={c.id + "-title"} className="flex items-center justify-between gap-2 bg-white border rounded-lg px-3 py-2" style={{ borderColor: c.destaqueTitle ? LIME : BORDER }}>
                          <p className="text-sm flex-1" style={{ color: TEXT }}>{c.titulo_youtube}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                const updated = buLibrary.map(x => x.id === c.id ? { ...x, destaqueTitle: !x.destaqueTitle } : x);
                                setLibrary(prev => ({ ...prev, [activeBU]: updated }));
                                storage.set(`captions:${activeBU}`, JSON.stringify(updated));
                              }}
                            >
                              <Star size={14} fill={c.destaqueTitle ? LIME : "none"} style={{ color: c.destaqueTitle ? LIME : MUTED }} />
                            </button>
                            <button onClick={() => deleteCaption(c.id)}>
                              <Trash2 size={13} style={{ color: "#8A3A1F" }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </p>
              {buLibrary.length === 0 ? (
                <p className="text-sm" style={{ color: MUTED }}>
                  Nenhuma legenda salva ainda. Na tela "Nova legenda", depois de gerar, use os botões "Salvar" ou "Destacar".
                </p>
              ) : (
                <div className="space-y-3">
                  {buLibrary.filter(c => {
                    if (libraryFilter === "destaque") return c.destaque;
                    if (libraryFilter !== "all") return c.platform === libraryFilter;
                    return true;
                  }).filter(c => {
                    if (!librarySearch.trim()) return true;
                    const q = librarySearch.toLowerCase();
                    return (c.legenda || "").toLowerCase().includes(q) ||
                           (c.topico || "").toLowerCase().includes(q) ||
                           (c.savedBy || "").toLowerCase().includes(q);
                  }).map((c) => {
                    const Icon = PLATFORMS.find((pl) => pl.id === c.platform)?.icon || FileEdit;
                    return (
                      <div key={c.id} className="ls-card bg-white border rounded-2xl p-5" style={{ borderColor: c.destaque ? LIME : BORDER }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: GREEN_DARK }}>
                            <Icon size={15} />
                            {PLATFORMS.find((pl) => pl.id === c.platform)?.label || c.platform}
                            {c.presetTitle && (
                              <span className="text-xs font-normal" style={{ color: MUTED }}>
                                · {c.presetTitle}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const current = library[activeBU] || [];
                                const updated = current.map((x) => x.id === c.id ? { ...x, visibility: x.visibility === "public" ? "private" : "public" } : x);
                                setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
                                storage.set(`captions:${activeBU}`, JSON.stringify(updated));
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                              style={c.visibility === "public"
                                ? { background: "#EAF9DC", color: GREEN_DARK, borderColor: LIME }
                                : { background: BG, color: MUTED, borderColor: BORDER }}
                              title={c.visibility === "public" ? "Pública: clique pra tornar privada" : "Privada: clique pra tornar pública"}
                            >
                              {c.visibility === "public" ? "Pública" : "Privada"}
                            </button>
                            <button onClick={() => toggleDestaque(c.id)} aria-label="Destacar">
                              <Star size={16} fill={c.destaque ? LIME : "none"} style={{ color: c.destaque ? LIME : MUTED }} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: c.id, type: "caption", label: c.topico || c.legenda?.slice(0,40) || "esta legenda" })}
                              aria-label="Excluir"
                            >
                              <Trash2 size={14} style={{ color: "#8A3A1F" }} />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm leading-relaxed" style={{ color: TEXT }}>
                          {renderLegenda(c.legenda)}
                        </div>
                        {c.publishDate && (
                          <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: MUTED }}>
                            <Calendar size={11} />
                            Publicar em: {new Date(c.publishDate + "T12:00:00").toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <LinkIcon size={11} style={{ color: MUTED, flexShrink: 0 }} />
                          <input
                            type="url"
                            value={c.postLink || ""}
                            onChange={(e) => {
                              const updated = buLibrary.map(x => x.id === c.id ? { ...x, postLink: e.target.value, _linkDirty: true } : x);
                              setLibrary(prev => ({ ...prev, [activeBU]: updated }));
                              localStorage.setItem(`captions-cache:${activeBU}`, JSON.stringify(updated));
                            }}
                            placeholder="Link do post publicado (opcional)"
                            className="flex-1 text-[11px] border rounded px-2 py-1"
                            style={{ borderColor: c._linkDirty ? GREEN : BORDER, color: MUTED }}
                          />
                          {c._linkDirty && (
                            <button
                              onClick={() => {
                                const updated = buLibrary.map(x => x.id === c.id ? { ...x, _linkDirty: false } : x);
                                setLibrary(prev => ({ ...prev, [activeBU]: updated }));
                                localStorage.setItem(`captions-cache:${activeBU}`, JSON.stringify(updated));
                                storageAPI({ action: "saveCaption", caption: { ...c, _linkDirty: undefined } }).catch(() => {});
                              }}
                              className="text-[10px] px-2 py-1 rounded font-medium text-white shrink-0"
                              style={{ background: GREEN }}
                            >
                              Salvar
                            </button>
                          )}
                          {c.postLink && !c._linkDirty && (
                            <a href={c.postLink} target="_blank" rel="noreferrer" style={{ color: GREEN }}>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        {c.versions?.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-[11px] cursor-pointer" style={{ color: MUTED }}>
                              {c.versions.length} versão(ões) anterior(es)
                            </summary>
                            {c.versions.map((v, vi) => (
                              <div key={vi} className="mt-1 p-2 rounded text-xs leading-relaxed" style={{ background: BG, color: MUTED }}>
                                <p className="text-[10px] mb-1">{new Date(v.savedAt).toLocaleString("pt-BR")}</p>
                                {v.legenda}
                              </div>
                            ))}
                          </details>
                        )}
                        {c.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {c.hashtags.map((h, i) => (
                              <Chip key={i} tone="accent">
                                #{h.replace(/^#/, "")}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {page === "compose" && (
            <div className="max-w-3xl space-y-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setDraft((d) => ({ ...d, mode: "novo" }))}
                  className="ls-mode-tab flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2.5 border"
                  style={draft.mode === "novo" ? { background: GREEN, color: "#FFFFFF", borderColor: GREEN } : { background: "#FFFFFF", color: MUTED, borderColor: BORDER }}
                >
                  <FileEdit size={14} />
                  Criar legenda
                </button>
                <button
                  onClick={() => setDraft((d) => ({ ...d, mode: "otimizar", existingCaption: "", keywords: [], keywordSelected: {} }))}
                  className="ls-mode-tab flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2.5 border"
                  style={draft.mode === "otimizar" ? { background: GREEN, color: "#FFFFFF", borderColor: GREEN } : { background: "#FFFFFF", color: MUTED, borderColor: BORDER }}
                >
                  <Wand2 size={14} />
                  Otimizar legenda
                </button>
              </div>

              <div className="ls-card bg-white border rounded-2xl p-6" style={{ borderColor: BORDER }}>
                <div className="mb-5">
                  <label className="text-xs font-semibold tracking-wide block mb-2" style={{ color: MUTED }}>
                    Estilo usado nesta legenda
                  </label>
                  {buPresets.length === 0 ? (
                    <button
                      onClick={() => {
                        setPage("style");
                        startNewPreset();
                      }}
                      className="ls-btn-ghost flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-2 bg-white"
                      style={{ borderColor: BORDER, color: MUTED }}
                    >
                      <Settings2 size={13} />
                      Nenhum estilo salvo ainda, configurar agora
                    </button>
                  ) : (
                    <select
                      value={draft.presetId || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, presetId: e.target.value }))}
                      className={`${inputClass} sm:w-2/3`}
                    >
                      {buPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mb-5">
                  <label className="text-xs font-semibold tracking-wide block mb-2" style={{ color: MUTED }}>
                    Redes sociais
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                      const Icon = p.icon;
                      const active = draft.platforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => selectPlatform(p.id)}
                          style={active ? { background: GREEN, borderColor: GREEN, color: "#FFFFFF" } : { background: "#FFFFFF", borderColor: BORDER, color: MUTED }}
                          className="ls-platform-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
                        >
                          <Icon size={13} />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {draft.mode === "novo" ? (
                  <div className="mb-5">
                    <Field label="Tópico do post">
                      <textarea
                        data-onboard="topic-input"
                        value={draft.topic}
                        onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
                        onBlur={handleTopicBlur}
                        placeholder="Ex: vídeo mostrando o processo de retirada de carro sem burocracia no app"
                        className={`${inputClass} min-h-[72px]`}
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="mb-5">
                    <Field label="Legenda atual (cole aqui pra otimizar)">
                      <textarea
                        value={draft.existingCaption}
                        onChange={(e) => setDraft((d) => ({ ...d, existingCaption: e.target.value }))}
                        onBlur={handleTopicBlur}
                        placeholder="Cole aqui a legenda que já existe, pra ferramenta melhorar SEO, tom e formato"
                        className={`${inputClass} min-h-[90px]`}
                      />
                    </Field>
                  </div>
                )}

                <div className="mb-5">
                  <button
                    onClick={findRelatedContent}
                    disabled={relatedLoading}
                    className="ls-btn-ghost flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-2 disabled:opacity-60"
                    style={{ background: LIME_SOFT, color: GREEN_DARK, borderColor: LIME }}
                  >
                    {relatedLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    Buscar conteúdo relacionado nas outras redes da Localiza
                  </button>
                  <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: MUTED }}>
                    Marque os que fazem sentido. A URL do que estiver marcado entra automaticamente no texto da legenda.
                  </p>

                  {draft.relatedContent.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {draft.relatedContent.map((item, i) => (
                        <div
                          key={i}
                          className="rounded-lg border p-3"
                          style={{ borderColor: item.selected ? LIME : BORDER, background: item.selected ? LIME_SOFT : "#FAFCFA" }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#FFFFFF", color: GREEN_DARK }}>
                              {item.rede}
                            </span>
                            <div className="flex items-center gap-2">
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noreferrer" className="ls-side-link flex items-center gap-1 text-xs" style={{ color: GREEN }}>
                                  Abrir
                                  <ExternalLink size={11} />
                                </a>
                              )}
                              {item.selected && (
                                <select
                                  value={item.mode || draft.relatedMode || "incluir"}
                                  onChange={(e) => setDraft((d) => ({ ...d, relatedContent: d.relatedContent.map((rc, ri) => ri === i ? { ...rc, mode: e.target.value } : rc) }))}
                                  className="text-[10px] border rounded px-1 py-0.5"
                                  style={{ borderColor: BORDER, color: MUTED }}
                                >
                                  <option value="incluir">Incluir link</option>
                                  <option value="basear">Usar como base</option>
                                </select>
                              )}
                              <button
                                onClick={() => toggleRelatedSelected(i)}
                                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                                style={item.selected ? { background: GREEN, color: "#FFFFFF" } : { background: "#FFFFFF", color: MUTED, border: `1px solid ${BORDER}` }}
                              >
                                {item.selected && <Check size={11} />}
                                {item.selected ? "Selecionado" : "Selecionar"}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-1.5" style={{ color: TEXT }}>
                            {item.titulo}
                          </p>
                          {item.dica && (
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: MUTED }}>
                              {item.dica}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <Field label="Objetivo do post">
                    <select
                      value={draft.objective}
                      onChange={(e) => setDraft((d) => ({ ...d, objective: e.target.value }))}
                      className={`${inputClass} w-full sm:w-1/2`}
                    >
                      {OBJECTIVES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mb-5">
                  <label className="text-xs font-semibold tracking-wide block mb-2" style={{ color: MUTED }}>
                    Tamanho da legenda
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: "curta", label: "Curta" },
                      { id: "media", label: "Média" },
                      { id: "longa", label: "Longa" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDraft((d) => ({ ...d, length: opt.id }))}
                        className="ls-mode-tab flex-1 text-xs font-medium rounded-lg py-2 border"
                        style={
                          draft.length === opt.id
                            ? { background: GREEN, color: "#FFFFFF", borderColor: GREEN }
                            : { background: "#FFFFFF", color: MUTED, borderColor: BORDER }
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
                    {(() => {
                      const notes = {
                        instagram: "no Instagram o padrão é curto",
                        linkedin: "no LinkedIn dá pra escrever mais",
                        tiktok: "no TikTok o ideal é bem direto",
                        youtube: "no YouTube a descrição pode ser mais longa",
                      };
                      const parts = draft.platforms.map((p) => notes[p]).filter(Boolean);
                      if (parts.length === 0) return "Escolha as redes acima pra ver a dica de tamanho ideal pra cada uma.";
                      return `Pra rede selecionada, ${parts.join(", ")}. Pode pedir mais fôlego em "Longa" se o post precisar.`;
                    })()}
                  </p>
                </div>

                <div className="mb-5">
                  <label className="text-xs font-semibold tracking-wide block mb-2" style={{ color: MUTED }}>
                    Tom de voz deste post (opcional, se vazio usa o tom geral do estilo selecionado)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_TAGS.map((t) => (
                      <ToggleTag key={t} active={draft.toneTags.includes(t)} onClick={() => toggleTone(t)}>
                        {t}
                      </ToggleTag>
                    ))}
                  </div>
                </div>

                <div className="mb-2 flex flex-wrap gap-4">
                  <label className="ls-check-label flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={draft.useEmojis} onChange={(e) => setDraft((d) => ({ ...d, useEmojis: e.target.checked }))} />
                    <Smile size={15} className="ls-check-icon" />
                    Usar emojis
                  </label>
                  <label className="ls-check-label flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={draft.useHashtags} onChange={(e) => setDraft((d) => ({ ...d, useHashtags: e.target.checked }))} />
                    <Hash size={15} className="ls-check-icon" />
                    Incluir hashtags
                  </label>
                  <label className="ls-check-label flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={draft.useBullets} onChange={(e) => setDraft((d) => ({ ...d, useBullets: e.target.checked }))} />
                    <List size={15} className="ls-check-icon" />
                    Incluir bullets
                  </label>
                  <label className="ls-check-label flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={draft.citarLocaliza} onChange={(e) => setDraft((d) => ({ ...d, citarLocaliza: e.target.checked }))} />
                    <Building2 size={15} className="ls-check-icon" />
                    Citar Localiza
                  </label>
                </div>
                {draft.citarLocaliza && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs" style={{ color: MUTED }}>Pessoa gramatical:</span>
                    {[["1", "1ª pessoa (Somos, Oferecemos)"], ["2", "2ª pessoa (Você, Sua)"], ["3", "3ª pessoa (A Localiza, Ela)"]].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setDraft((d) => ({ ...d, pessoaLocaliza: val }))}
                        className="text-xs px-2 py-1 rounded border"
                        style={draft.pessoaLocaliza === val ? { background: GREEN, color: "#FFF", borderColor: GREEN } : { background: "#FFFFFF", color: MUTED, borderColor: BORDER }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {draft.useHashtags && (
                  <p className="text-[11px] mb-5" style={{ color: MUTED }}>
                    A ferramenta decide a quantidade ideal (até no máximo 5), sem número fixo, varia por post e rede.
                  </p>
                )}
                {!draft.useHashtags && <div className="mb-5" />}

                <div className="mb-5">
                  <label className="text-xs font-semibold tracking-wide flex items-center gap-1.5 mb-2" style={{ color: MUTED }}>
                    <Hash size={13} />
                    Palavras-chave recomendadas
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {draft.keywords.map((kwObj) => {
                      const kw = typeof kwObj === "object" ? kwObj.kw : kwObj;
                      const quality = typeof kwObj === "object" ? (kwObj.quality || "medium") : "low";
                      const qualityColor = quality === "good" ? "#16a34a" : quality === "medium" ? "#d97706" : "#dc2626";
                      const selected = draft.keywordSelected?.[kw.toLowerCase()] !== false;
                      return (
                        <span
                          key={kw}
                          style={{
                            background: selected ? LIME_SOFT : "#F9FAFB",
                            borderColor: selected ? LIME : "#E5E7EB",
                            color: selected ? GREEN_DARK : "#374151",
                          }}
                          className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-xs font-medium"
                        >
                          <button
                            onClick={() => toggleKeywordSelected(kw)}
                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: selected ? GREEN : "#FFFFFF", border: `1px solid ${selected ? GREEN : BORDER}` }}
                            aria-label={selected ? "Remover da legenda" : "Incluir na legenda"}
                            title={selected ? "Usada na legenda, clique pra tirar" : "Não usada, clique pra incluir"}
                          >
                            {selected && <Check size={10} color="#FFFFFF" />}
                          </button>
                          {kw}
                          {/* Indicador de quality sempre visível */}
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: qualityColor }}
                            title={quality === "good" ? "Boa relevância SEO" : quality === "medium" ? "Relevância média" : "Baixa relevância SEO"}
                          />
                          <button onClick={() => removeKeyword(kw)} className="ls-chip-x focus:outline-none" aria-label="Excluir">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  {draft.keywords.length > 0 && (
                    <p className="text-[11px] mb-2" style={{ color: MUTED }}>
                      As marcadas em verde entram na legenda, clique na bolinha pra incluir ou tirar.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={draft.keywordInput}
                      onChange={(e) => setDraft((d) => ({ ...d, keywordInput: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                      placeholder="Adicionar palavra-chave manualmente"
                      className={`${inputClass} flex-1`}
                    />
                    <button onClick={addKeyword} className="ls-btn-ghost px-3 rounded-lg border bg-white" style={{ borderColor: BORDER, color: MUTED }} aria-label="Adicionar">
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => researchKeywords(false)}
                      disabled={kwLoading}
                      className="ls-btn-ghost flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border disabled:opacity-60 whitespace-nowrap"
                      style={{ background: LIME_SOFT, color: GREEN_DARK, borderColor: LIME }}
                    >
                      {kwLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      Sugerir palavras-chave
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm rounded-lg px-3 py-2 mb-4" style={{ color: "#8A3A1F", background: "#FBEDE7", border: "1px solid #F0C9B8" }}>
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={draft.mode === "novo" ? generateCaptions : optimizeCaptions}
                  disabled={genLoading}
data-onboard="generate-btn"
                  style={{ background: LIME, color: GREEN_DEEPER }}
                  className="ls-btn-primary w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60"
                >
                  {genLoading ? <Loader2 size={16} className="animate-spin" /> : draft.mode === "novo" ? <Sparkles size={16} /> : <Wand2 size={16} />}
                  {draft.mode === "novo" ? "Criar legenda" : "Otimizar legenda"}
                  <span className="text-[10px] opacity-60 ml-1">⌘↵</span>
                </button>

                {draft.platforms.includes("youtube") && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: MUTED }}>YouTube · título do vídeo</p>
                    <button
                      disabled={titleLoading}
                      onClick={async () => {
                        if (!draft.topic && !draft.existingCaption) { setError("Descreve o tópico do post antes de gerar o título."); return; }
                        setTitleLoading(true);
                        try {
                          const { text } = await callAI({
                            system: "Você é especialista em SEO para YouTube. Crie um título de até 70 caracteres com a keyword principal no início, clicável sem ser clickbait. Responda SOMENTE com o título, sem aspas, sem explicação.",
                            prompt: `Tópico: ${draft.topic || draft.existingCaption}\nKeywords: ${(draft.keywords || []).filter(k => { const kstr = typeof k === 'object' ? k.kw : k; return draft.keywordSelected?.[kstr.toLowerCase()] !== false; }).map(k => typeof k === 'object' ? k.kw : k).join(", ")}\n\nCrie o título:`,
                            useSearch: false,
                          });
                          const titulo = text.trim().slice(0, 100);
                          setResults((prev) => ({
                            ...(prev || {}),
                            youtube: { legenda: "", hashtags: [], seoScore: 0, toneScore: 0, ...(prev?.youtube || {}), titulo_youtube: titulo },
                          }));
                        } catch(e) {
                          setError(`Não consegui gerar o título: ${e.message}`);
                        } finally {
                          setTitleLoading(false);
                        }
                      }}
                      style={{ background: "#FFFFFF", color: GREEN, borderColor: GREEN }}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2.5 border hover:opacity-80 transition-opacity disabled:opacity-60"
                    >
                      {titleLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                      {titleLoading ? "Gerando título..." : "Criar título do YouTube"}
                    </button>
                  </div>
                )}
              </div>

              {results && (
                <div className="space-y-4">
                  {draft.platforms
                    .filter((p) => results[p] && (results[p].legenda || results[p].titulo_youtube))
                    .map((p) => {
                      const Icon = PLATFORMS.find((pl) => pl.id === p).icon;
                      const r = results[p];
                      const key = `${p}-caption`;
                      return (
                        <div key={p} className="ls-card bg-white border rounded-2xl p-5" style={{ borderColor: BORDER }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: GREEN_DARK }}>
                              <Icon size={16} />
                              {PLATFORMS.find((pl) => pl.id === p).label}
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setResults(prev => ({ ...prev, [`${p}_preview`]: !prev[`${p}_preview`] }))}
                                className="text-xs flex items-center gap-1"
                                style={{ color: results[`${p}_preview`] ? GREEN : MUTED }}
                              >
                                <Eye size={13} />
                                {results[`${p}_preview`] ? "Editar" : "Preview"}
                              </button>
                              <button
                                onClick={() => copyToClipboard(key, `${r.legenda}\n\n${(r.hashtags || []).map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`)}
                                className="ls-side-link flex items-center gap-1 text-xs"
                                style={{ color: MUTED }}
                              >
                                {copiedKey === key ? <Check size={13} /> : <Copy size={13} />}
                                {copiedKey === key ? "Copiado" : "Copiar"}
                              </button>
                            </div>
                          </div>
                          {results[`${p}_preview`] ? (
                            <div
                              className="rounded-lg p-3 text-sm min-h-[100px] leading-relaxed"
                              style={{
                                background: p === "instagram" ? "linear-gradient(135deg,#f9f9f9,#fff)" : p === "linkedin" ? "#f3f6f8" : p === "tiktok" ? "#000" : "#fff",
                                color: p === "tiktok" ? "#fff" : TEXT,
                                border: `1px solid ${BORDER}`,
                                fontFamily: p === "instagram" || p === "tiktok" ? "-apple-system,BlinkMacSystemFont,sans-serif" : "inherit",
                              }}
                            >
                              {renderLegenda(r.legenda)}
                              {(r.hashtags || []).length > 0 && (
                                <div className="mt-2" style={{ color: p === "tiktok" ? "#69C9D0" : "#0a66c2" }}>
                                  {r.hashtags.map(h => `#${h.replace(/^#/, "")}`).join(" ")}
                                </div>
                              )}
                            </div>
                          ) : (
                          <div className="relative">
                            <textarea
                              value={r.legenda}
                              onChange={(e) => onLegendaChange(p, e.target.value)}
                              className={`${inputClass} min-h-[100px]`} style={{ background: "#FFFFFF", color: TEXT, borderColor: BORDER }}
                            />

                          </div>
                          )}
                          {p === "youtube" && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold tracking-wide" style={{ color: MUTED }}>Título (YouTube)</label>
                                <button
                                  onClick={async () => {
                                    const currentTitle = r.titulo_youtube || "";
                                    const { text } = await callAI({
                                      system: "Você é especialista em SEO para YouTube. Otimize ou crie um título de até 70 caracteres com a keyword principal no início, clicável sem ser clickbait. Responda SOMENTE com o título, sem aspas, sem explicação.",
                                      prompt: `Tópico/legenda: ${r.legenda}
Título atual: ${currentTitle || "nenhum"}
Keywords: ${(draft.keywords || []).map(k => typeof k === 'object' ? k.kw : k).join(", ")}

Crie/otimize o título:`,
                                      useSearch: false,
                                    });
                                    setResults((prev) => ({ ...prev, [p]: { ...prev[p], titulo_youtube: text.trim().slice(0, 100) } }));
                                  }}
                                  className="text-[11px] px-2 py-0.5 rounded border"
                                  style={{ borderColor: BORDER, color: MUTED }}
                                >
                                  {r.titulo_youtube ? "Otimizar título" : "Gerar título"}
                                </button>
                              </div>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={r.titulo_youtube || ""}
                                  maxLength={100}
                                  placeholder="Título do vídeo (até 70 caracteres ideais)"
                                  onChange={(e) => setResults((prev) => ({ ...prev, [p]: { ...prev[p], titulo_youtube: e.target.value } }))}
                                  className={`${inputClass} flex-1`}
                                />
                                <button
                                  onClick={() => {
                                    if (!r.titulo_youtube) return;
                                    const current = library[activeBU] || [];
                                    const existing = current.find(x => x.platform === "youtube" && x.titulo_youtube === r.titulo_youtube);
                                    if (existing) {
                                      const updated = current.map(x => x.id === existing.id ? { ...x, destaqueTitle: !x.destaqueTitle } : x);
                                      setLibrary(prev => ({ ...prev, [activeBU]: updated }));
                                      storage.set(`captions:${activeBU}`, JSON.stringify(updated));
                                    } else {
                                      const entry = { id: `${Date.now()}`, platform: "youtube", legenda: r.legenda || "", hashtags: [], titulo_youtube: r.titulo_youtube, topico: draft.topic, presetTitle: activeGenPreset?.title || "", seoScore: r.seoScore || 0, toneScore: r.toneScore || 0, destaque: false, destaqueTitle: true, visibility: "private", savedBy: currentUser?.name || "Anônimo", savedAt: new Date().toISOString() };
                                      const updated = [entry, ...(library[activeBU] || [])];
                                      setLibrary(prev => ({ ...prev, [activeBU]: updated }));
                                      storage.set(`captions:${activeBU}`, JSON.stringify(updated));
                                    }
                                  }}
                                  title="Destacar título"
                                >
                                  <Star size={16} fill={library[activeBU]?.find(x => x.titulo_youtube === r.titulo_youtube)?.destaqueTitle ? LIME : "none"} style={{ color: library[activeBU]?.find(x => x.titulo_youtube === r.titulo_youtube)?.destaqueTitle ? LIME : MUTED }} />
                                </button>
                              </div>
                              <p className="text-[11px] mt-1" style={{ color: (r.titulo_youtube?.length || 0) > 70 ? "#C0402A" : MUTED }}>
                                {r.titulo_youtube?.length || 0}/70 caracteres ideais
                              </p>
                              {r.titulo_youtube && (
                                <button
                                  onClick={() => {
                                    const current = library[activeBU] || [];
                                    // Verifica se já existe entrada salva com esse título
                                    const existing = current.find(x => x.platform === "youtube" && x.titulo_youtube === r.titulo_youtube);
                                    if (existing) {
                                      // Destaca o existente
                                      const updated = current.map(x => x.id === existing.id ? { ...x, destaqueTitle: !x.destaqueTitle } : x);
                                      setLibrary(prev => ({ ...prev, [activeBU]: updated }));
                                      storage.set(`captions:${activeBU}`, JSON.stringify(updated));
                                    } else {
                                      // Salva novo entry só com título
                                      const entry = { id: `${Date.now()}`, platform: "youtube", legenda: r.legenda || "", hashtags: [], titulo_youtube: r.titulo_youtube, topico: draft.topic, presetTitle: activeGenPreset?.title || "", seoScore: r.seoScore || 0, toneScore: r.toneScore || 0, destaque: false, destaqueTitle: true, visibility: "private", savedBy: currentUser?.name || "Anônimo", savedAt: new Date().toISOString() };
                                      const updated = [entry, ...(library[activeBU] || [])];
                                      setLibrary(prev => ({ ...prev, [activeBU]: updated }));
                                      storage.set(`captions:${activeBU}`, JSON.stringify(updated));
                                    }
                                  }}
                                  className="mt-2 flex items-center gap-1.5 text-xs font-medium"
                                  style={{ color: MUTED }}
                                >
                                  <Star size={13} />
                                  Destacar título
                                </button>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {(r.hashtags || []).map((h, i) => (
                              <Chip key={i} tone="accent">
                                #{h.replace(/^#/, "")}
                              </Chip>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t flex-wrap gap-3" style={{ borderColor: BORDER }}>
                            <div className="flex items-center gap-5">
                              <button onClick={() => openScoreModal(p, r)} title="Analisar SEO" className="hover:opacity-75 transition-opacity">
                                <ScoreRing label="SEO" value={r.seoScore} />
                              </button>
                              <button onClick={() => openScoreModal(p, r)} title="Analisar Tom" className="hover:opacity-75 transition-opacity">
                                <ScoreRing label="Tom" value={r.toneScore} />
                              </button>
                              <button onClick={() => openScoreModal(p, r)} title="Analisar Originalidade" className="hover:opacity-75 transition-opacity">
                                <ScoreRing label="Original" value={r.originalScore || 0} color="#7C3AED" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => reanalyzeCaption(p)}
                                disabled={reanalyzing[p]}
                                className="ls-btn-ghost flex items-center gap-1.5 text-xs font-medium border rounded-lg px-2.5 py-1.5 bg-white disabled:opacity-60"
                                style={{ borderColor: BORDER, color: MUTED }}
                              >
                                {reanalyzing[p] ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                                Reanalisar
                              </button>
                              <button
                                onClick={() => saveCaption(p, false)}
                                disabled={savingCaption[p]}
                                className="ls-btn-ghost flex items-center gap-1.5 text-xs font-medium border rounded-lg px-2.5 py-1.5 bg-white disabled:opacity-60"
                                style={savedCaption[p] ? { borderColor: GREEN, color: GREEN } : { borderColor: BORDER, color: MUTED }}
                                title="Salva na biblioteca sem destaque"
                              >
                                {savingCaption[p] ? <Loader2 size={12} className="animate-spin" /> : savedCaption[p] ? <Check size={12} /> : <Bookmark size={12} />}
                                {savingCaption[p] ? "Salvando..." : savedCaption[p] ? "Salvo!" : "Salvar"}
                              </button>
                              <button
                                onClick={() => saveCaption(p, true)}
                                disabled={savingCaption[p]}
                                className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 disabled:opacity-60"
                                style={{ background: starredCaption[p] ? GREEN : LIME_SOFT, color: starredCaption[p] ? "#FFFFFF" : GREEN_DARK, border: `1px solid ${starredCaption[p] ? GREEN : LIME}` }}
                                title="Salva e destaca como referência pra próximas gerações"
                              >
                                {savingCaption[p] ? <Loader2 size={12} className="animate-spin" /> : starredCaption[p] ? <Check size={12} /> : <Star size={12} />}
                                {savingCaption[p] ? "Salvando..." : starredCaption[p] ? "Destacado!" : "Destacar"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {results && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setResults(null);
                      draft.mode === "novo" ? generateCaptions() : optimizeCaptions();
                    }}
                    disabled={genLoading}
                    style={{ background: "#FFFFFF", color: GREEN, borderColor: GREEN }}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2.5 border disabled:opacity-60 hover:opacity-80 transition-opacity"
                  >
                    {genLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Gerar novamente
                  </button>
                  <button
                    onClick={() => {
                      const texto = draft.platforms
                        .filter(p => results[p])
                        .map(p => {
                          const r = results[p];
                          const plat = PLATFORMS.find(pl => pl.id === p)?.label || p;
                          const hashtags = (r.hashtags || []).map(h => `#${h.replace(/^#/, "")}`).join(" ");
                          const titulo = p === "youtube" && r.titulo_youtube ? `Título: ${r.titulo_youtube}\n\n` : "";
                          return `--- ${plat} ---\n${titulo}${r.legenda}\n\n${hashtags}`;
                        })
                        .join("\n\n");
                      navigator.clipboard.writeText(texto).then(() => {
                        setError(""); // limpa erros
                        alert("Todas as legendas copiadas!");
                      });
                    }}
                    style={{ background: "#FFFFFF", color: MUTED, borderColor: BORDER }}
                    className="px-3 flex items-center justify-center rounded-lg border hover:opacity-80 transition-opacity"
                    title="Exportar todas as legendas"
                  >
                    <Download size={16} />
                  </button>
                  </div>
                  <button
                    onClick={() => {
                      setResults(null);
                      setDraft(emptyDraft());
                    }}
                    style={{ borderColor: BORDER, color: MUTED }}
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium rounded-lg py-2 border hover:opacity-80 transition-opacity"
                  >
                    <Plus size={14} />
                    Nova legenda (limpar campos)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>

    {/* Modal data de publicação */}
    {publishDateModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: "#FFFFFF", color: TEXT }}>
          <p className="text-sm font-semibold mb-1" style={{ color: GREEN_DARK }}>Salvar legenda</p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>Dê um nome curto e escolha a data de publicação (opcional).</p>
          <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Nome da legenda</label>
          <input
            type="text"
            value={captionNameInput}
            onChange={e => setCaptionNameInput(e.target.value)}
            placeholder="Ex: Nova campanha BYD, Stories Zarp maio..."
            maxLength={60}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-1"
            style={{ borderColor: BORDER }}
            autoFocus
          />
          <p className="text-[10px] mb-4 text-right" style={{ color: MUTED }}>{captionNameInput.length}/60</p>
          <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Data de publicação <span style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input
            type="date"
            value={publishDateInput}
            onChange={e => setPublishDateInput(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
            style={{ borderColor: BORDER }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setPublishDateModal(null); doSaveCaption(publishDateModal.platformId, publishDateModal.destaque, publishDateInput, captionNameInput); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: GREEN }}
            >
              Salvar
            </button>
            <button
              onClick={() => setPublishDateModal(null)}
              className="px-4 py-2.5 rounded-lg text-sm border"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de troca de rede */}
    {switchNetModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: "#FFFFFF", color: TEXT }}>
          <p className="text-sm font-semibold mb-1" style={{ color: GREEN_DARK }}>Trocar de rede</p>
          <p className="text-sm mb-4" style={{ color: MUTED }}>
            Você tem uma legenda gerada. O que quer fazer antes de trocar?
          </p>
          <div className="space-y-2 mb-4">
            <button
              onClick={() => {
                const toId = switchNetModal.toId;
                // Salva a legenda atual primeiro
                if (results) {
                  const platform = draft.platforms[0];
                  const r = results[platform];
                  if (r) {
                    const entry = { id: `${Date.now()}`, platform, legenda: r.legenda, hashtags: r.hashtags || [], topico: draft.topic, presetTitle: activeGenPreset?.title || "", seoScore: r.seoScore, toneScore: r.toneScore, destaque: false, visibility: "private", savedBy: currentUser?.name || "Anônimo", savedAt: new Date().toISOString() };
                    const current = library[activeBU] || [];
                    const updated = [entry, ...current];
                    setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
                    storage.set(`captions:${activeBU}`, JSON.stringify(updated));
                  }
                }
                setResults(null);
                setSwitchNetModal(null);
                // Pergunta se mantém configurações
                setSwitchNetModal({ toId, phase: "keep" });
              }}
              className="w-full text-sm font-medium rounded-lg py-2.5 text-white"
              style={{ background: GREEN }}
            >
              Salvar legenda e trocar
            </button>
            <button
              onClick={() => {
                const toId = switchNetModal.toId;
                setResults(null);
                setSwitchNetModal({ toId, phase: "keep" });
              }}
              className="w-full text-sm font-medium rounded-lg py-2.5 border"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              Descartar e trocar
            </button>
            <button
              onClick={() => setSwitchNetModal(null)}
              className="w-full text-sm rounded-lg py-2"
              style={{ color: MUTED }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal manter configurações */}
    {switchNetModal?.phase === "keep" && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: "#FFFFFF", color: TEXT }}>
          <p className="text-sm font-semibold mb-1" style={{ color: GREEN_DARK }}>Manter configurações?</p>
          <p className="text-sm mb-4" style={{ color: MUTED }}>
            Quer manter o tópico, palavras-chave, estilo e tom pra gerar a legenda pra nova rede?
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                // Mantém tudo, só troca a rede
                setDraft((d) => ({ ...d, platforms: [switchNetModal.toId] }));
                setSwitchNetModal(null);
              }}
              className="w-full text-sm font-medium rounded-lg py-2.5 text-white"
              style={{ background: GREEN }}
            >
              Sim, manter configurações
            </button>
            <button
              onClick={() => {
                // Limpa tudo e troca a rede
                const newDraft = emptyDraft();
                newDraft.platforms = [switchNetModal.toId];
                setDraft(newDraft);
                setSwitchNetModal(null);
              }}
              className="w-full text-sm font-medium rounded-lg py-2.5 border"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              Não, começar do zero
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Onboarding spotlight */}
    {screen === "workspace" && onboardStep >= 0 && onboardStep < ONBOARDING_STEPS.length && (
      <OnboardingSpotlight
        step={ONBOARDING_STEPS[onboardStep]}
        stepIndex={onboardStep}
        total={ONBOARDING_STEPS.length}
        onNext={() => setOnboardStep(s => s + 1)}
        onPrev={() => setOnboardStep(s => s - 1)}
        onDone={onboardDone}
        isLast={onboardStep === ONBOARDING_STEPS.length - 1}
      />
    )}

    {/* Modal de concessão de acesso de edição */}
    {accessModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: GREEN_DARK }}>Acesso de edição</p>
              <p className="text-[11px]" style={{ color: MUTED }}>{accessModal.presetTitle}</p>
            </div>
            <button onClick={() => setAccessModal(null)}><X size={16} style={{ color: MUTED }} /></button>
          </div>
          <p className="text-xs mb-3" style={{ color: MUTED }}>Selecione quem pode editar este estilo além de você:</p>
          {allUsers.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>Carregando usuários...</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
              {allUsers.filter(u => u.hash !== currentUser?.hash).map(u => {
                const isEditor = (accessModal.editors || []).includes(u.hash);
                return (
                  <label key={u.hash} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={isEditor}
                      onChange={() => {
                        setAccessModal(prev => ({
                          ...prev,
                          editors: isEditor
                            ? prev.editors.filter(h => h !== u.hash)
                            : [...(prev.editors || []), u.hash],
                        }));
                      }}
                    />
                    <div>
                      <p className="text-xs font-medium" style={{ color: TEXT }}>{u.name}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{u.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setAccessModal(null)} className="flex-1 py-2 rounded-lg text-xs border" style={{ borderColor: BORDER, color: MUTED }}>
              Cancelar
            </button>
            <button
              onClick={async () => {
                const preset = buPresets.find(p => p.id === accessModal.presetId);
                if (!preset) return;
                const updated = { ...preset, editors: accessModal.editors || [] };
                // Atualiza local
                setPresets(prev => ({
                  ...prev,
                  [activeBU]: prev[activeBU].map(p => p.id === updated.id ? updated : p),
                }));
                localStorage.setItem(`presets-cache:${activeBU}`, JSON.stringify(
                  buPresets.map(p => p.id === updated.id ? updated : p)
                ));
                // Salva no servidor
                storageAPI({
                  action: "savePreset", bu: activeBU,
                  userHash: currentUser?.hash,
                  userName: currentUser?.name,
                  preset: updated,
                  visibility: updated.visibility || "public",
                }).catch(() => {});
                // Se está editando esse preset, atualiza o formPreset também
                if (formPreset.id === updated.id) setFormPreset(updated);
                setAccessModal(null);
              }}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: GREEN }}
            >
              Salvar acesso
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de análise de scores */}
    {scoreModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: 480, maxWidth: "calc(100vw - 32px)", maxHeight: "85vh" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: GREEN_DARK }}>Análise de qualidade</p>
              <p className="text-[11px]" style={{ color: MUTED }}>{PLATFORMS.find(pl => pl.id === scoreModal.platform)?.label} · clique nos scores pra ver detalhes</p>
            </div>
            <button onClick={() => setScoreModal(null)}><X size={16} style={{ color: MUTED }} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4">
            {scoreModal.loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={24} className="animate-spin" style={{ color: GREEN }} />
                <p className="text-sm" style={{ color: MUTED }}>Analisando a legenda...</p>
              </div>
            )}

            {scoreModal.error && !scoreModal.loading && (
              <p className="text-sm text-center py-8" style={{ color: MUTED }}>{scoreModal.error}</p>
            )}

            {scoreModal.analysis && !scoreModal.loading && (() => {
              const a = scoreModal.analysis;
              const sections = [
                { key: "seo", label: "SEO", score: a.seo?.score, color: "#01652A" },
                { key: "tom", label: "Tom de marca", score: a.tom?.score, color: "#0A66C2" },
                { key: "originalidade", label: "Originalidade", score: a.originalidade?.score, color: "#7C3AED" },
              ];

              return (
                <div className="space-y-5">
                  {a.resumo && (
                    <div className="rounded-xl p-3" style={{ background: "#F6F9F6", borderLeft: `3px solid ${GREEN}` }}>
                      <p className="text-xs leading-relaxed" style={{ color: GREEN_DARK }}>{a.resumo}</p>
                    </div>
                  )}

                  {sections.map(({ key, label, score, color }) => {
                    const data = a[key];
                    if (!data) return null;
                    return (
                      <div key={key} className="border rounded-xl p-4" style={{ borderColor: BORDER }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold" style={{ color }}>{label}</p>
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded-full flex-1 w-24" style={{ background: "#E1E8E2" }}>
                              <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color }}>{score}/100</span>
                          </div>
                        </div>

                        {data.pontos_positivos?.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#166534" }}>✓ O que está bom</p>
                            {data.pontos_positivos.map((p, i) => (
                              <p key={i} className="text-xs leading-relaxed" style={{ color: TEXT }}>· {p}</p>
                            ))}
                          </div>
                        )}

                        {data.pontos_negativos?.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#C0402A" }}>✗ O que está faltando</p>
                            {data.pontos_negativos.map((p, i) => (
                              <p key={i} className="text-xs leading-relaxed" style={{ color: TEXT }}>· {p}</p>
                            ))}
                          </div>
                        )}

                        {data.como_chegar_a_100?.length > 0 && (
                          <div className="mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: MUTED }}>Como chegar a 100</p>
                            {data.como_chegar_a_100.map((p, i) => (
                              <div key={i} className="flex gap-2 mb-1">
                                <span className="text-[10px] font-bold shrink-0" style={{ color }}>{i + 1}.</span>
                                <p className="text-xs leading-relaxed" style={{ color: TEXT }}>{p}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Footer com botão de reanalisar */}
          <div className="px-5 py-3 border-t shrink-0 flex gap-2" style={{ borderColor: BORDER }}>
            <button
              onClick={() => openScoreModal(scoreModal.platform, {
                legenda: scoreModal.legenda,
                hashtags: scoreModal.hashtags,
                seoScore: scoreModal.seoScore,
                toneScore: scoreModal.toneScore,
                originalScore: scoreModal.originalScore,
              })}
              disabled={scoreModal.loading}
              className="flex-1 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              {scoreModal.loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Reanalisar legenda atual
            </button>
            <button onClick={() => setScoreModal(null)} className="px-4 py-2 rounded-lg text-xs border" style={{ borderColor: BORDER, color: MUTED }}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de confirmação de exclusão */}
    {confirmDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
              <Trash2 size={18} style={{ color: "#7F1D1D" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#7F1D1D" }}>Excluir definitivamente?</p>
              <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: MUTED }}>"{confirmDelete.label}"</p>
            </div>
          </div>
          <p className="text-xs mb-4" style={{ color: MUTED }}>Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 py-2.5 rounded-lg text-xs font-medium border"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                deleteCaption(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "#DC2626" }}
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de erro */}
    {errorModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={() => { setErrorModal(""); setError(""); }}
      >
        <div
          className="rounded-2xl p-6 max-w-md w-full shadow-2xl"
          style={{ background: "#FFFFFF", color: TEXT }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle size={22} style={{ color: "#C0402A" }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "#8A3A1F" }}>Algo deu errado</p>
              <p className="text-sm" style={{ color: "#5B3A2F" }}>{errorModal}</p>
            </div>
          </div>
          <button
            onClick={() => { setErrorModal(""); setError(""); }}
            className="w-full text-sm font-medium rounded-lg py-2"
            style={{ background: "#FBEDE7", color: "#8A3A1F" }}
          >
            Fechar
          </button>
        </div>
      </div>
    )}
    {/* Chat assistente flutuante */}
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {chatOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden relative"
          style={{ width: 340, height: 480, borderColor: BORDER }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: GREEN }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
              <div>
                <p className="text-white text-xs font-semibold leading-none">Assistente</p>
                <p className="text-white/60 text-[10px]">Social Studio</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Exportar conversa como .txt
                  const txt = chatMessages.map(m => `${m.role === "user" ? "Você" : "Assistente"}: ${m.content}`).join("\n\n");
                  const blob = new Blob([txt], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `conversa-social-studio-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.txt`;
                  a.click();
                }}
                className="text-white/70 hover:text-white"
                title="Salvar conversa"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => {
                  const nome = currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : "";
                  const initial = [{ role: "assistant", content: `Oi${nome}! 👋 Sou o assistente do Social Studio. Como posso ajudar?` }];
                  setChatMessages(initial);
                  try { localStorage.removeItem(`chat-history:${currentUser?.hash || "anon"}`); } catch {}
                }}
                className="text-white/70 hover:text-white"
                title="Limpar conversa"
              >
                <Trash2 size={14} />
              </button>
              <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal de escolha: continuar ou nova conversa */}
          {chatShowChoice && (
            <div className="absolute inset-0 z-10 flex items-end pb-4 px-3 justify-center"
              style={{ background: "rgba(0,0,0,0.35)", borderRadius: "0 0 16px 16px" }}>
              <div className="bg-white rounded-xl p-4 w-full shadow-lg">
                <p className="text-xs font-semibold mb-1" style={{ color: GREEN_DARK }}>Você tem uma conversa salva</p>
                <p className="text-[11px] mb-3" style={{ color: MUTED }}>Quer continuar de onde parou ou começar uma nova?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChatShowChoice(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ background: GREEN }}
                  >
                    Continuar
                  </button>
                  <button
                    onClick={() => {
                      const msgs = defaultChatMsg(currentUser);
                      setChatMessages(msgs);
                      try { localStorage.removeItem(`chat-history:${currentUser?.hash || "anon"}`); } catch {}
                      setChatShowChoice(false);
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border"
                    style={{ borderColor: BORDER, color: MUTED }}
                  >
                    Nova conversa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ background: "#F6F9F6" }}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="rounded-2xl px-3 py-2 max-w-[85%]"
                  style={msg.role === "user"
                    ? { background: GREEN, color: "#fff", borderBottomRightRadius: 4, fontSize: 11, lineHeight: 1.5 }
                    : { background: "#fff", color: TEXT, borderColor: BORDER, border: `1px solid ${BORDER}`, borderBottomLeftRadius: 4 }}
                >
                  {msg.role === "assistant"
                    ? renderChatMessage(msg.content, (pg) => { setPageWithOnboard(pg); setChatOpen(false); })
                    : <span style={{ fontSize: 11 }}>{msg.content}</span>
                  }
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3 py-2 text-xs flex items-center gap-1.5"
                  style={{ background: "#fff", color: MUTED, border: `1px solid ${BORDER}`, borderBottomLeftRadius: 4 }}>
                  <Loader2 size={11} className="animate-spin" />
                  Digitando...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t flex gap-2 shrink-0" style={{ borderColor: BORDER, background: "#fff" }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
              placeholder="Pergunte sobre a ferramenta..."
              className="flex-1 text-xs border rounded-lg px-3 py-2"
              style={{ borderColor: BORDER, color: TEXT }}
            />
            <button
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="rounded-lg px-3 py-2 text-white disabled:opacity-40 shrink-0"
              style={{ background: GREEN }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => { if (chatOpen) setChatOpen(false); else openChat(); }}
        className="w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        style={{ background: GREEN, boxShadow: "0 4px 20px rgba(1,101,42,0.4)" }}
        data-onboard="chat-btn"
        title="Assistente da ferramenta"
      >
        {chatOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>

    </>
  );
}
