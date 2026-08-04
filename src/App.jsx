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
    useEmojis: true,
    useHashtags: true,
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
  async get(key) {
    if (typeof window !== "undefined" && window.storage) {
      try {
        const r = await window.storage.get(key, false);
        return r ? r.value : null;
      } catch (e) {
        return null;
      }
    }
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) {
      try {
        await window.storage.set(key, value, false);
        return;
      } catch (e) {
        /* cai pro localStorage abaixo */
      }
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* storage indisponível, ignora */
    }
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
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeResults(parsed) {
  const out = {};
  Object.keys(parsed || {}).forEach((k) => {
    const r = parsed[k];
    out[k] = {
      ...r,
      legenda: sanitizeDashes(r.legenda),
      hashtags: (r.hashtags || []).map((h) => sanitizeDashes(h)),
    };
  });
  return out;
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
    .ls-mode-tab { transition: background .15s ease, color .15s ease; }
  `}</style>
);

function Chip({ children, onRemove, tone = "default" }) {
  const style =
    tone === "accent"
      ? { background: LIME_SOFT, borderColor: LIME, color: GREEN_DARK }
      : { background: "#FFFFFF", borderColor: BORDER, color: TEXT };
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
          : { background: "#FFFFFF", borderColor: BORDER, color: MUTED }
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

const APP_PASSWORD = "conteudo2026localiza";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    storage.get("app-unlocked").then((v) => {
      if (v === "true") setUnlocked(true);
    });
  }, []);

  const [screen, setScreen] = useState("home");
  const [activeBU, setActiveBU] = useState(null);
  const [page, setPage] = useState("compose");

  const [presets, setPresets] = useState({});
  const [presetsLoaded, setPresetsLoaded] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [formPreset, setFormPreset] = useState(BLANK_PRESET);
  const [titleError, setTitleError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const [library, setLibrary] = useState({});
  const [libraryLoaded, setLibraryLoaded] = useState({});

  const [draft, setDraft] = useState(emptyDraft());
  const [kwLoading, setKwLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [concorrenteInput, setConcorrenteInput] = useState("");
  const [concorrenteTipo, setConcorrenteTipo] = useState("concorrente");
  const [vocabInput, setVocabInput] = useState("");
  const [benchLoading, setBenchLoading] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState({});
  const [savingCaption, setSavingCaption] = useState({});

  const bu = BUS.find((b) => b.id === activeBU);
  const buPresets = (activeBU && presets[activeBU]) || [];
  const buLibrary = (activeBU && library[activeBU]) || [];
  const activeGenPreset = buPresets.find((p) => p.id === draft.presetId) || null;

  const loadPresets = useCallback(async (buId) => {
    try {
      const result = await storage.get(`style-presets:${buId}`);
      const parsed = result ? JSON.parse(result) : [];
      const normalized = Array.isArray(parsed) ? parsed.map(normalizePreset) : [];
      setPresets((prev) => ({ ...prev, [buId]: normalized }));
    } catch (e) {
      setPresets((prev) => ({ ...prev, [buId]: [] }));
    } finally {
      setPresetsLoaded((prev) => ({ ...prev, [buId]: true }));
    }
  }, []);

  const loadLibrary = useCallback(async (buId) => {
    try {
      const result = await storage.get(`captions:${buId}`);
      const parsed = result ? JSON.parse(result) : [];
      setLibrary((prev) => ({ ...prev, [buId]: Array.isArray(parsed) ? parsed : [] }));
    } catch (e) {
      setLibrary((prev) => ({ ...prev, [buId]: [] }));
    } finally {
      setLibraryLoaded((prev) => ({ ...prev, [buId]: true }));
    }
  }, []);

  useEffect(() => {
    if (activeBU && !presetsLoaded[activeBU]) loadPresets(activeBU);
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
  };

  const switchBU = (id) => {
    setActiveBU(id);
    setDraft(emptyDraft());
    setResults(null);
    setError("");
    setEditingId(null);
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

  const savePreset = async () => {
    if (!formPreset.title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setSaving(true);
    try {
      const list = presets[activeBU] || [];
      let updated;
      let savedId;
      if (editingId === "new" || !formPreset.id) {
        savedId = `${Date.now()}`;
        const newPreset = { ...formPreset, id: savedId };
        updated = [...list, newPreset];
      } else {
        savedId = formPreset.id;
        updated = list.map((p) => (p.id === formPreset.id ? formPreset : p));
      }
      await storage.set(`style-presets:${activeBU}`, JSON.stringify(updated));
      setPresets((prev) => ({ ...prev, [activeBU]: updated }));
      setEditingId(savedId);
      setFormPreset(updated.find((p) => p.id === savedId));
      if (!draft.presetId) setDraft((d) => ({ ...d, presetId: savedId }));
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1800);
    } catch (e) {
      setError("Não consegui salvar o estilo agora. Tenta de novo.");
    } finally {
      setSaving(false);
    }
  };

  const deletePreset = async (id) => {
    try {
      const list = presets[activeBU] || [];
      const updated = list.filter((p) => p.id !== id);
      await storage.set(`style-presets:${activeBU}`, JSON.stringify(updated));
      setPresets((prev) => ({ ...prev, [activeBU]: updated }));
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

  const togglePlatform = (id) => {
    setDraft((d) => ({
      ...d,
      platforms: d.platforms.includes(id) ? d.platforms.filter((p) => p !== id) : [...d.platforms, id],
    }));
  };

  const toggleTone = (tag) => {
    setDraft((d) => ({
      ...d,
      toneTags: d.toneTags.includes(tag) ? d.toneTags.filter((t) => t !== tag) : [...d.toneTags, tag],
    }));
  };

  const addKeyword = () => {
    const kw = draft.keywordInput.trim();
    if (!kw) return;
    setDraft((d) => ({ ...d, keywords: [...new Set([...d.keywords, kw])], keywordInput: "" }));
  };

  const removeKeyword = (kw) => {
    setDraft((d) => ({ ...d, keywords: d.keywords.filter((k) => k !== kw) }));
  };

  const toggleKeywordSelected = (kw) => {
    setDraft((d) => {
      const key = kw.toLowerCase();
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
        "Você é um estrategista de conteúdo e SEO para redes sociais no Brasil. Responda SOMENTE com um array JSON de strings, sem markdown, sem explicações, sem texto antes ou depois. Cada string precisa ser uma palavra-chave ou expressão completa e com sentido, do jeito que alguém realmente buscaria ou usaria numa legenda, nunca um termo solto, truncado ou sem contexto.";
      const prompt = `Marca/BU: ${bu.label} (${bu.sub}), do grupo Localiza.\nTópico/conteúdo do post: ${baseTexto}\n\nPesquise na web e sugira palavras-chave relevantes pra esse post, combinando três grupos: (1) as específicas e diretas sobre o tema do post, (2) variações e termos similares/semanticamente relacionados que as pessoas também buscam sobre esse mesmo assunto, e (3) termos mais amplos que conectem o tema à marca ${bu.label} (${bu.sub}), mesmo que não sejam a busca exata. Não se limite ao termo literal do tópico, mas cada sugestão precisa fazer sentido sozinha como expressão completa. Retorne de 8 a 12 palavras-chave em português do Brasil.`;
      const { text } = await callAI({ system, prompt, useSearch: true });
      const kws = extractJSON(text);
      if (Array.isArray(kws)) {
        const termos = kws.map((k) => (typeof k === "string" ? k : k.termo)).filter(Boolean);
        setDraft((d) => ({ ...d, keywords: [...new Set([...d.keywords, ...termos])] }));
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

      // Em vez de pedir pra IA "decidir" pesquisar em vários lugares dentro de
      // uma única chamada (na prática ela faz 1 busca só e desiste), disparamos
      // várias buscas diretas e específicas em paralelo e juntamos os resultados.
      const buscas = [
        `site:localiza.com ${baseTexto}`,
        buQuery !== "site:localiza.com" ? `${buQuery} ${baseTexto}` : null,
        `${baseTexto} Localiza site:instagram.com/localiza OR site:instagram.com/localizameoo`,
        `${baseTexto} Localiza site:youtube.com/user/grupolocaliza OR site:tiktok.com/@voudelocaliza`,
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

      const isOficial = (url) => {
        try {
          const host = new URL(url).hostname.replace(/^www\./, "");
          if (host.includes("localiza")) return true;
          const extras = ["medium.com", "llz.me", "instagram.com", "facebook.com", "linkedin.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "spotify.com"];
          if (!extras.includes(host)) return false;
          // pra domínios genéricos (redes sociais), exige que a URL contenha o perfil oficial
          const u = url.toLowerCase();
          return (
            u.includes("/localiza") ||
            u.includes("grupolocaliza") ||
            u.includes("voudelocaliza") ||
            u.includes("localizabr") ||
            u.includes("localizalabs")
          );
        } catch {
          return false;
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
        .filter((s) => s.url && s.title && isOficial(s.url))
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
    const selectedKeywords = draft.keywords.filter((k) => draft.keywordSelected?.[k.toLowerCase()] !== false);

    const selectedRelated = (draft.relatedContent || []).filter((r) => r.selected);
    const urls = selectedRelated.map((r) => r.url).filter(Boolean);
    const relatedText =
      selectedRelated.length > 0
        ? selectedRelated.map((r) => `${r.rede}: "${r.titulo}", URL: ${r.url} (${r.dica || "sem dica"})`).join("; ")
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
      ? "Pode usar emojis com moderação, coerentes com a plataforma e o tom."
      : "Não use nenhum emoji no texto.";
    const hashtagInstr = draft.useHashtags
      ? 'Gere hashtags relevantes: no máximo 5, mas a quantidade ideal varia por post e por plataforma (pode ser 1, 2, 3, 4 ou 5); não use sempre o mesmo número, decida pela relevância real.'
      : 'Não gere hashtags. Retorne "hashtags": [].';

    const urlInstr =
      urls.length > 0
        ? `Inclua literalmente estas URLs no texto da legenda (não apenas mencione que existe conteúdo relacionado, escreva a URL por extenso em local que fizer sentido, tipo "saiba mais em ${urls[0]}"): ${urls.join(", ")}. Em redes que não aceitam link clicável no corpo (Instagram, TikTok), ainda assim escreva a URL e sinalize "link na bio".`
        : "Nenhuma URL selecionada para incluir.";

    return { p, selectedKeywords, relatedText, vocabTxt, exemplosSalvos, emojiInstr, hashtagInstr, urlInstr };
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
Escreva como se fosse uma pessoa real do time escrevendo, nunca de forma genérica ou robotizada. Evite clichês de texto gerado por IA.
REGRA ABSOLUTA E INEGOCIÁVEL: JAMAIS use travessão (—) em nenhuma parte de nenhuma legenda, em nenhuma hipótese. Use vírgula, ponto ou reformule a frase em vez disso.
Estilo de referência usado: ${ctx.p.title || "nenhum estilo salvo selecionado"}
Regras da marca: ${ctx.p.regras || "nenhuma regra específica definida"}
Eixo editorial: ${ctx.p.eixo || "não definido"}
Fio condutor que toda legenda deve manter: ${ctx.p.fioCondutor || "não definido"}
Vocabulário/expressões preferidas (numeradas por prioridade): ${ctx.vocabTxt}
O que evitar: ${ctx.p.evitar || "nenhuma restrição adicional"}
Insights de benchmark de concorrentes/inspirações (usar como inspiração, nunca citar ou comparar diretamente): ${ctx.p.insights || "nenhum insight coletado"}
Exemplos reais de legendas já aprovadas pelo time para este BU (aprenda o padrão de tom/estrutura, não copie literalmente):
${ctx.exemplosSalvos || "nenhum salvo ainda"}
Exemplos manuais fornecidos no estilo: ${ctx.p.exemplos || "nenhum"}

${ctx.emojiInstr}
${ctx.hashtagInstr}
${ctx.urlInstr}

REGRA OBRIGATÓRIA SOBRE PALAVRAS-CHAVE: as palavras-chave listadas como "Palavras-chave/tópicos de referência" no pedido do usuário DEVEM aparecer, de forma literal e natural (sem soar forçado, sem virar lista), no texto de cada legenda, adaptando apenas para caber gramaticalmente na frase. Se houver mais de uma palavra-chave, distribua entre o corpo da legenda; pode repetir a mais importante mais de uma vez se fizer sentido. Isso é o que garante uma nota alta de "seoScore".

Para cada plataforma, avalie a legenda gerada em "seoScore" (0-100, uso literal das keywords prioritárias e hashtags) e "toneScore" (0-100, aderência a regras/tom/eixo/fio condutor). Seja criterioso: se uma keyword selecionada não aparecer no texto, o seoScore deve ser baixo.

Responda SOMENTE com um objeto JSON válido, sem markdown, no formato:
{"plataforma_id": {"legenda": "...", "hashtags": ["...", "..."], "seoScore": 0, "toneScore": 0}}
Use exatamente os ids de plataforma fornecidos como chaves.`;

      const prompt = `Tópico do post: ${draft.topic}
Objetivo do post: ${draft.objective}
Tom de voz específico deste post: ${draft.toneTags.length ? draft.toneTags.join(", ") : "seguir o tom geral do estilo selecionado"}
Palavras-chave/tópicos de referência: ${ctx.selectedKeywords.length ? ctx.selectedKeywords.join(", ") : "nenhuma definida"}
Conteúdos relacionados selecionados: ${ctx.relatedText}
Plataformas solicitadas: ${draft.platforms.join(", ")}

Notas por plataforma:
${draft.platforms.map((pl) => `- ${pl}: ${platformNotes[pl]}`).join("\n")}

Crie a legenda do zero pra cada plataforma solicitada.`;

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
Sua tarefa é OTIMIZAR uma legenda que já existe, não criar do zero. Preserve a mensagem central e a voz original o máximo possível, mas melhore o uso de palavras-chave (SEO), a aderência ao tom/regras da marca abaixo, e ajuste emojis/hashtags/extensão conforme as instruções.
Evite clichês de texto gerado por IA.
REGRA ABSOLUTA E INEGOCIÁVEL: JAMAIS use travessão (—) em nenhuma parte de nenhuma legenda, em nenhuma hipótese. Se a legenda original tiver travessão, remova e reescreva com vírgula, ponto ou outra construção.
Estilo de referência usado: ${ctx.p.title || "nenhum estilo salvo selecionado"}
Regras da marca: ${ctx.p.regras || "nenhuma regra específica definida"}
Eixo editorial: ${ctx.p.eixo || "não definido"}
Fio condutor: ${ctx.p.fioCondutor || "não definido"}
Vocabulário/expressões preferidas (numeradas por prioridade): ${ctx.vocabTxt}
O que evitar: ${ctx.p.evitar || "nenhuma restrição adicional"}
Exemplos reais de legendas já aprovadas pelo time (aprenda o padrão, não copie literalmente):
${ctx.exemplosSalvos || "nenhum salvo ainda"}

${ctx.emojiInstr}
${ctx.hashtagInstr}
${ctx.urlInstr}

REGRA OBRIGATÓRIA SOBRE PALAVRAS-CHAVE: as palavras-chave listadas como "Palavras-chave a priorizar" no pedido do usuário DEVEM aparecer, de forma literal e natural (sem soar forçado, sem virar lista), no texto de cada legenda otimizada, adaptando apenas para caber gramaticalmente na frase. Se a legenda original não tiver essas palavras, insira-as reescrevendo a frase onde fizer sentido.

Para cada plataforma, avalie a legenda otimizada em "seoScore" (0-100, uso literal das keywords prioritárias) e "toneScore" (0-100 cada). Seja criterioso: se uma keyword selecionada não aparecer no texto, o seoScore deve ser baixo.

Responda SOMENTE com um objeto JSON válido, sem markdown, no formato:
{"plataforma_id": {"legenda": "...", "hashtags": ["...", "..."], "seoScore": 0, "toneScore": 0}}
Use exatamente os ids de plataforma fornecidos como chaves.`;

      const prompt = `Legenda atual a ser otimizada: """${draft.existingCaption}"""
Objetivo do post: ${draft.objective}
Tom de voz específico: ${draft.toneTags.length ? draft.toneTags.join(", ") : "seguir o tom geral do estilo selecionado"}
Palavras-chave a priorizar: ${ctx.selectedKeywords.length ? ctx.selectedKeywords.join(", ") : "nenhuma definida"}
Conteúdos relacionados selecionados: ${ctx.relatedText}
Plataformas solicitadas: ${draft.platforms.join(", ")}

Notas por plataforma:
${draft.platforms.map((pl) => `- ${pl}: ${platformNotes[pl]}`).join("\n")}

Adapte e otimize a legenda acima pra cada plataforma solicitada.`;

      const { text } = await callAI({ system, prompt, useSearch: false });
      const parsed = sanitizeResults(extractJSON(text));
      setResults(parsed);
    } catch (e) {
      setError("Não consegui otimizar a legenda agora. Tenta de novo em instantes.");
    } finally {
      setGenLoading(false);
    }
  };

  const reanalyzeCaption = async (platformId) => {
    const r = results?.[platformId];
    if (!r) return;
    setReanalyzing((prev) => ({ ...prev, [platformId]: true }));
    setError("");
    try {
      const selectedKeywords = draft.keywords.filter((k) => draft.keywordSelected?.[k.toLowerCase()] !== false);
      const p = activeGenPreset || BLANK_PRESET;
      const system =
        'Você é um analista de SEO e brand voice. Responda SOMENTE com um objeto JSON no formato {"seoScore": 0, "toneScore": 0}, sem markdown. Notas de 0 a 100, seja criterioso.';
      const prompt = `Legenda (rede: ${platformId}): """${r.legenda}"""
Hashtags: ${(r.hashtags || []).join(", ")}
Palavras-chave prioritárias: ${selectedKeywords.join(", ") || "nenhuma definida"}
Regras da marca: ${p.regras || "nenhuma definida"}
Tom de voz geral: ${p.tomGeral || "não definido"}
Eixo editorial: ${p.eixo || "não definido"}
Fio condutor: ${p.fioCondutor || "não definido"}

Avalie "seoScore" e "toneScore".`;
      const { text } = await callAI({ system, prompt, useSearch: false });
      const scores = extractJSON(text);
      setResults((prev) => ({
        ...prev,
        [platformId]: { ...prev[platformId], seoScore: scores.seoScore, toneScore: scores.toneScore },
      }));
    } catch (e) {
      setError("Não consegui reanalisar essa legenda agora. Tenta de novo em instantes.");
    } finally {
      setReanalyzing((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  const saveCaption = async (platformId, destaque) => {
    const r = results?.[platformId];
    if (!r || !activeBU) return;
    setSavingCaption((prev) => ({ ...prev, [platformId]: true }));
    try {
      const entry = {
        id: `${Date.now()}`,
        platform: platformId,
        legenda: r.legenda,
        hashtags: r.hashtags || [],
        topico: draft.mode === "otimizar" ? draft.existingCaption.slice(0, 80) : draft.topic,
        presetTitle: activeGenPreset?.title || "",
        seoScore: r.seoScore,
        toneScore: r.toneScore,
        destaque: !!destaque,
        savedAt: new Date().toISOString(),
      };
      const current = library[activeBU] || [];
      const updated = [entry, ...current];
      await storage.set(`captions:${activeBU}`, JSON.stringify(updated));
      setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
    } catch (e) {
      setError("Não consegui salvar essa legenda agora.");
    } finally {
      setSavingCaption((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  const toggleDestaque = async (id) => {
    const current = library[activeBU] || [];
    const updated = current.map((c) => (c.id === id ? { ...c, destaque: !c.destaque } : c));
    await storage.set(`captions:${activeBU}`, JSON.stringify(updated));
    setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
  };

  const deleteCaption = async (id) => {
    const current = library[activeBU] || [];
    const updated = current.filter((c) => c.id !== id);
    await storage.set(`captions:${activeBU}`, JSON.stringify(updated));
    setLibrary((prev) => ({ ...prev, [activeBU]: updated }));
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

  const inputClass = "ls-input w-full text-sm border rounded-lg px-3 py-2.5 bg-white";

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
                <button
                  key={b.id}
                  onClick={() => enterBU(b.id)}
                  className="ls-bu-row group w-full flex items-center gap-5 px-5 sm:px-7 py-5 text-left"
                  style={{ borderBottom: i < BUS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
                >
                  <span style={{ color: "rgba(255,255,255,0.28)" }} className="ls-bu-number flex items-center justify-center shrink-0 w-12">
                    <ArrowRight size={26} strokeWidth={1.75} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-white font-semibold text-lg leading-tight">{b.label}</span>
                    <span className="block text-white/50 text-sm mt-0.5">{b.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- WORKSPACE ----------
  return (
    <div translate="no" className="min-h-screen flex flex-col md:flex-row notranslate" style={{ background: BG, color: TEXT, fontFamily: "system-ui, sans-serif" }}>
      <GlobalStyle />
      <aside className="w-full md:w-64 md:shrink-0 flex flex-col relative" style={{ background: `linear-gradient(180deg, ${GREEN} 0%, ${GREEN_DEEPER} 100%)` }}>
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
            onClick={() => setPage("compose")}
            className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "compose" ? "active" : "text-white/85"}`}
          >
            <FileEdit size={15} />
            Nova legenda
          </button>
          <button
            onClick={() => {
              setPage("style");
              if (!editingId) {
                if (buPresets.length > 0) selectPresetForEdit(buPresets[0]);
                else startNewPreset();
              }
            }}
            className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "style" ? "active" : "text-white/85"}`}
          >
            <Settings2 size={15} />
            Estilo geral da marca
          </button>
          <button
            onClick={() => setPage("library")}
            className={`ls-nav-item w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-sm font-medium ${page === "library" ? "active" : "text-white/85"}`}
          >
            <Bookmark size={15} />
            Legendas salvas
          </button>
        </nav>

        <div className="mt-auto px-6 py-6">
          <p className="text-white/45 text-[10px] font-semibold uppercase tracking-wider mb-2.5">Outras BUs</p>
          <div className="space-y-1.5">
            {BUS.filter((b) => b.id !== activeBU).map((b) => (
              <button key={b.id} onClick={() => switchBU(b.id)} className="ls-side-link block w-full text-left text-white/70 text-xs py-0.5">
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-8 py-4" style={{ borderColor: BORDER }}>
          <p className="text-[11px] font-medium tracking-wide" style={{ color: MUTED }}>
            {bu.label}
          </p>
          <h2 className="text-lg font-semibold">
            {page === "compose" ? "Nova legenda" : page === "style" ? "Estilo geral da marca" : "Legendas salvas"}
          </h2>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          {page === "style" && (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
              <div>
                <button
                  onClick={startNewPreset}
                  className="ls-btn-ghost w-full flex items-center justify-center gap-1.5 text-xs font-medium border rounded-lg py-2 mb-3 bg-white"
                  style={{ borderColor: BORDER, color: MUTED }}
                >
                  <Plus size={14} />
                  Novo estilo
                </button>
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
                      value={formPreset.regras}
                      onChange={(e) => updateFormField("regras", e.target.value)}
                      placeholder="Ex: não citar concorrentes pelo nome, não comparar diretamente com X, mencionar Y só de forma informativa..."
                      className={`${inputClass} min-h-[72px]`}
                    />
                  </Field>

                  <Field label="Eixo editorial">
                    <textarea
                      value={formPreset.eixo}
                      onChange={(e) => updateFormField("eixo", e.target.value)}
                      placeholder="Ex: liberdade, mobilidade sem burocracia, praticidade no dia a dia..."
                      className={`${inputClass} min-h-[56px]`}
                    />
                  </Field>

                  <Field label="Fio condutor">
                    <textarea
                      value={formPreset.fioCondutor}
                      onChange={(e) => updateFormField("fioCondutor", e.target.value)}
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
                          <li key={i} className="flex items-center gap-2 text-sm rounded-lg border px-3 py-1.5" style={{ borderColor: BORDER, background: "#FAFCFA" }}>
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
                    <div className="flex gap-2">
                      <input
                        value={vocabInput}
                        onChange={(e) => setVocabInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addVocab();
                          }
                        }}
                        placeholder="Digite uma expressão e aperte Enter"
                        className={`${inputClass} flex-1`}
                      />
                      <button onClick={addVocab} className="ls-btn-ghost px-3 rounded-lg border bg-white" style={{ borderColor: BORDER, color: MUTED }} aria-label="Adicionar">
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
                        value={formPreset.insights}
                        onChange={(e) => updateFormField("insights", e.target.value)}
                        className={`${inputClass} min-h-[120px]`}
                      />
                    )}
                  </div>

                  <Field label="Tom de voz geral">
                    <textarea
                      value={formPreset.tomGeral}
                      onChange={(e) => updateFormField("tomGeral", e.target.value)}
                      placeholder="Ex: próximo, confiante, sem ser informal demais..."
                      className={`${inputClass} min-h-[64px]`}
                    />
                  </Field>

                  <Field label="O que evitar">
                    <textarea
                      value={formPreset.evitar}
                      onChange={(e) => updateFormField("evitar", e.target.value)}
                      placeholder="Termos, tons ou construções a evitar"
                      className={`${inputClass} min-h-[56px]`}
                    />
                  </Field>

                  <Field label="Exemplos de legendas (opcional)">
                    <textarea
                      value={formPreset.exemplos}
                      onChange={(e) => updateFormField("exemplos", e.target.value)}
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

                  <button
                    onClick={savePreset}
                    disabled={saving}
                    style={{ background: GREEN }}
                    className="w-full flex items-center justify-center gap-2 text-white text-sm font-medium rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : showSaved ? <Check size={14} /> : null}
                    {showSaved ? "Estilo salvo" : editingId === "new" ? "Salvar novo estilo" : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {page === "library" && (
            <div>
              <p className="text-sm mb-6" style={{ color: MUTED }}>
                Legendas salvas de {bu.label}. As destacadas (⭐) têm mais peso como exemplo pra próxima geração.
              </p>
              {buLibrary.length === 0 ? (
                <p className="text-sm" style={{ color: MUTED }}>
                  Nenhuma legenda salva ainda. Na tela "Nova legenda", depois de gerar, use os botões "Salvar" ou "Destacar".
                </p>
              ) : (
                <div className="space-y-3">
                  {buLibrary.map((c) => {
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
                            <button onClick={() => toggleDestaque(c.id)} aria-label="Destacar">
                              <Star size={16} fill={c.destaque ? LIME : "none"} style={{ color: c.destaque ? LIME : MUTED }} />
                            </button>
                            <button onClick={() => deleteCaption(c.id)} aria-label="Excluir">
                              <Trash2 size={14} style={{ color: "#8A3A1F" }} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: TEXT }}>
                          {c.legenda}
                        </p>
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
                  onClick={() => setDraft((d) => ({ ...d, mode: "otimizar" }))}
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
                          onClick={() => togglePlatform(p.id)}
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
                            <div className="flex items-center gap-3">
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noreferrer" className="ls-side-link flex items-center gap-1 text-xs" style={{ color: GREEN }}>
                                  Abrir
                                  <ExternalLink size={11} />
                                </a>
                              )}
                              <button
                                onClick={() => toggleRelatedSelected(i)}
                                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                                style={item.selected ? { background: GREEN, color: "#FFFFFF" } : { background: "#FFFFFF", color: MUTED, border: `1px solid ${BORDER}` }}
                              >
                                {item.selected && <Check size={11} />}
                                {item.selected ? "Incluído na legenda" : "Incluir na legenda"}
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
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: TEXT }}>
                    <input type="checkbox" checked={draft.useEmojis} onChange={(e) => setDraft((d) => ({ ...d, useEmojis: e.target.checked }))} />
                    <Smile size={15} style={{ color: MUTED }} />
                    Usar emojis
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: TEXT }}>
                    <input type="checkbox" checked={draft.useHashtags} onChange={(e) => setDraft((d) => ({ ...d, useHashtags: e.target.checked }))} />
                    <Hash size={15} style={{ color: MUTED }} />
                    Incluir hashtags
                  </label>
                </div>
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
                    {draft.keywords.map((kw) => {
                      const selected = draft.keywordSelected?.[kw.toLowerCase()] !== false;
                      return (
                        <span
                          key={kw}
                          style={{ background: selected ? LIME_SOFT : "#FFFFFF", borderColor: selected ? LIME : BORDER, color: selected ? GREEN_DARK : MUTED }}
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
                  style={{ background: LIME, color: GREEN_DEEPER }}
                  className="ls-btn-primary w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60"
                >
                  {genLoading ? <Loader2 size={16} className="animate-spin" /> : draft.mode === "novo" ? <Sparkles size={16} /> : <Wand2 size={16} />}
                  {draft.mode === "novo" ? "Criar legenda" : "Otimizar legenda"}
                </button>
              </div>

              {results && (
                <div className="space-y-4">
                  {draft.platforms
                    .filter((p) => results[p])
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
                            <button
                              onClick={() => copyToClipboard(key, `${r.legenda}\n\n${(r.hashtags || []).map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`)}
                              className="ls-side-link flex items-center gap-1 text-xs"
                              style={{ color: MUTED }}
                            >
                              {copiedKey === key ? <Check size={13} /> : <Copy size={13} />}
                              {copiedKey === key ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                          <textarea
                            value={r.legenda}
                            onChange={(e) => setResults((prev) => ({ ...prev, [p]: { ...prev[p], legenda: e.target.value } }))}
                            className={`${inputClass} min-h-[100px]`}
                          />
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {(r.hashtags || []).map((h, i) => (
                              <Chip key={i} tone="accent">
                                #{h.replace(/^#/, "")}
                              </Chip>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t flex-wrap gap-3" style={{ borderColor: BORDER }}>
                            <div className="flex items-center gap-5">
                              <ScoreRing label="Otimização SEO" value={r.seoScore} />
                              <ScoreRing label="Tom da marca" value={r.toneScore} />
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
                                style={{ borderColor: BORDER, color: MUTED }}
                              >
                                <Bookmark size={12} />
                                Salvar
                              </button>
                              <button
                                onClick={() => saveCaption(p, true)}
                                disabled={savingCaption[p]}
                                className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 disabled:opacity-60"
                                style={{ background: LIME_SOFT, color: GREEN_DARK, border: `1px solid ${LIME}` }}
                              >
                                <Star size={12} />
                                Destacar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
