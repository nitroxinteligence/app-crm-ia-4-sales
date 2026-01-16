"use client";

import * as React from "react";
import {
  BadgeCheck,
  Ban,
  Bot,
  Check,
  Clock,
  Download,
  FileText,
  ImageIcon,
  Pause,
  Play,
  MoreHorizontal,
  Mic,
  OctagonAlert,
  Paperclip,
  PauseCircle,
  Search,
  Send,
  Settings,
  Smile,
  Sparkles,
  StickyNote,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User,
  UserPlus,
  Trash2,
  List,
  CheckCircle2,
  X,
  ChevronsUpDown,
  Plus,
} from "lucide-react";
import data from "@emoji-mart/data";
import type { ConversaInbox, MensagemInbox } from "@/lib/types";
import { supabaseClient } from "@/lib/supabase/client";
import { getR2SignedUrl } from "@/lib/r2/browser";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const iniciaisMensagem = (nome: string) =>
  nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type EmojiMartData = {
  emojis: Record<
    string,
    {
      id: string;
      name: string;
      keywords?: string[];
      skins?: Array<{ native?: string }>;
    }
  >;
  categories?: Array<{
    id: string;
    name: string;
    emojis: string[];
  }>;
};

const emojiData = data as EmojiMartData;

const normalizarTipoAnexo = (tipo?: string, nome?: string) => {
  const raw = (tipo ?? "").toLowerCase();
  if (["imagem", "image", "photo"].includes(raw)) return "imagem";
  if (["video"].includes(raw)) return "video";
  if (["audio"].includes(raw)) return "audio";
  if (["sticker", "figurinha"].includes(raw)) return "sticker";
  if (["pdf", "document", "documento"].includes(raw)) return "documento";
  if (nome?.toLowerCase().endsWith(".pdf")) return "documento";
  return "arquivo";
};

const isTextoGenerico = (texto: string) => {
  const normalizado = texto.trim().toLowerCase();
  return (
    normalizado === "midia recebida" ||
    normalizado === "video recebido" ||
    normalizado === "mensagem de audio" ||
    normalizado === "documento recebido" ||
    normalizado === "mensagem recebida"
  );
};

const formatarRespostaPreview = (resposta?: MensagemInbox["resposta"]) => {
  if (!resposta) return "";
  if (resposta.conteudo) return resposta.conteudo;
  const tipo = resposta.tipo?.toLowerCase();
  if (tipo === "imagem") return "Imagem";
  if (tipo === "video") return "Vídeo";
  if (tipo === "audio") return "Áudio";
  if (tipo === "sticker") return "Sticker";
  if (tipo === "documento" || tipo === "pdf") return "Documento";
  if (tipo === "visualizacao_unica") {
    return "Visualize este conteúdo em seu WhatsApp Mobile";
  }
  return "Mensagem";
};

const formatarDataMensagem = (valor?: string) => {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  const agora = new Date();
  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diffDias = Math.round(
    (inicioHoje.getTime() - inicioData.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Ontem";

  return data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
};

const urlRegex = /(?:https?:\/\/|www\.)[^\s]+/gi;
const corPadraoTag = "#94a3b8";

const normalizarUrl = (valor: string) =>
  valor.startsWith("http://") || valor.startsWith("https://")
    ? valor
    : `https://${valor}`;

const parseWhatsAppMarkdown = (texto: string) => {
  if (!texto) return [];
  const output: React.ReactNode[] = [];
  let restante = texto;
  const patterns = [
    { type: "code", regex: /```([\s\S]+?)```/ },
    { type: "bold", regex: /\*([^*]+)\*/ },
    { type: "italic", regex: /_([^_]+)_/ },
    { type: "strike", regex: /~([^~]+)~/ },
  ];

  while (restante) {
    let nextMatch: {
      type: string;
      match: RegExpMatchArray;
      index: number;
    } | null = null;

    for (const pattern of patterns) {
      const match = restante.match(pattern.regex);
      if (!match || match.index === undefined) continue;
      if (!nextMatch || match.index < nextMatch.index) {
        nextMatch = { type: pattern.type, match, index: match.index };
      }
    }

    if (!nextMatch) {
      output.push(restante);
      break;
    }

    if (nextMatch.index > 0) {
      output.push(restante.slice(0, nextMatch.index));
    }

    const value = nextMatch.match[1] ?? "";
    if (nextMatch.type === "bold") {
      output.push(<strong key={`b-${output.length}`}>{value}</strong>);
    } else if (nextMatch.type === "italic") {
      output.push(<em key={`i-${output.length}`}>{value}</em>);
    } else if (nextMatch.type === "strike") {
      output.push(<del key={`s-${output.length}`}>{value}</del>);
    } else if (nextMatch.type === "code") {
      output.push(
        <code
          key={`c-${output.length}`}
          className="rounded bg-foreground/10 px-1 py-0.5 text-[12px]"
        >
          {value}
        </code>
      );
    }

    restante = restante.slice(
      nextMatch.index + nextMatch.match[0].length
    );
  }

  return output;
};

const renderTextoComLinks = (texto: string) => {
  const matches = Array.from(texto.matchAll(urlRegex));
  if (!matches.length) {
    return parseWhatsAppMarkdown(texto);
  }

  const resultado: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const raw = match[0] ?? "";
    const end = start + raw.length;
    if (start > lastIndex) {
      const trecho = texto.slice(lastIndex, start);
      if (trecho) {
        resultado.push(
          <React.Fragment key={`t-${index}`}>
            {parseWhatsAppMarkdown(trecho)}
          </React.Fragment>
        );
      }
    }

    let link = raw;
    let suffix = "";
    const suffixMatch = raw.match(/([).,!?]+)$/);
    if (suffixMatch) {
      suffix = suffixMatch[1] ?? "";
      link = raw.slice(0, -suffix.length);
    }

    resultado.push(
      <a
        key={`l-${index}`}
        href={normalizarUrl(link)}
        target="_blank"
        rel="noreferrer"
        className="break-all underline underline-offset-2"
      >
        {link}
      </a>
    );

    if (suffix) {
      resultado.push(
        <React.Fragment key={`s-${index}`}>{suffix}</React.Fragment>
      );
    }

    lastIndex = end;
  });

  if (lastIndex < texto.length) {
    const restante = texto.slice(lastIndex);
    if (restante) {
      resultado.push(
        <React.Fragment key={`t-end`}>
          {parseWhatsAppMarkdown(restante)}
        </React.Fragment>
      );
    }
  }

  return resultado;
};

function EmojiPickerPadrao({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const [busca, setBusca] = React.useState("");
  const categorias = React.useMemo(() => {
    return (emojiData.categories ?? []).filter((categoria) => {
      return Array.isArray(categoria.emojis) && categoria.emojis.length > 0;
    });
  }, []);
  const [categoriaAtiva, setCategoriaAtiva] = React.useState(
    categorias[0]?.id ?? ""
  );

  React.useEffect(() => {
    if (!categoriaAtiva && categorias.length > 0) {
      setCategoriaAtiva(categorias[0].id);
    }
  }, [categoriaAtiva, categorias]);

  const emojiLista = React.useMemo(() => {
    return Object.values(emojiData.emojis ?? {})
      .map((emoji) => {
        const native = emoji.skins?.[0]?.native;
        if (!native) return null;
        return {
          id: emoji.id,
          name: emoji.name,
          keywords: emoji.keywords ?? [],
          native,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        name: string;
        keywords: string[];
        native: string;
      }>;
  }, []);

  const emojisFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo) {
      return emojiLista.filter((emoji) => {
        return (
          emoji.name.toLowerCase().includes(termo) ||
          emoji.id.toLowerCase().includes(termo) ||
          emoji.keywords.some((keyword) =>
            keyword.toLowerCase().includes(termo)
          )
        );
      });
    }

    if (!categoriaAtiva) return emojiLista;
    const categoria = categorias.find((item) => item.id === categoriaAtiva);
    if (!categoria) return emojiLista;
    const ids = new Set(categoria.emojis);
    return emojiLista.filter((emoji) => ids.has(emoji.id));
  }, [busca, categoriaAtiva, categorias, emojiLista]);

  return (
    <div className="flex h-[340px] w-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar emoji"
            className="h-7 border-0 bg-transparent p-0 text-[12px] focus-visible:ring-0"
          />
        </div>
      </div>
      {categorias.length > 0 && (
        <div className="flex gap-1 overflow-x-auto border-b border-border/40 px-2 py-1">
          {categorias.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              onClick={() => setCategoriaAtiva(categoria.id)}
              className={cn(
                "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition",
                categoriaAtiva === categoria.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {categoria.name}
            </button>
          ))}
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-8 gap-1 p-2">
          {emojisFiltrados.map((emoji) => (
            <button
              key={emoji.id}
              type="button"
              onClick={() => onSelect(emoji.native)}
              title={emoji.name}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[18px] transition hover:bg-muted/60"
            >
              {emoji.native}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

const baixarArquivo = async (url?: string | null, nome?: string) => {
  if (!url) return;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Falha ao baixar arquivo.");
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = nome ?? "arquivo";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.warn("Falha ao baixar arquivo.", error);
  }
};

const formatarDuracao = (valor: number) => {
  if (!Number.isFinite(valor) || valor <= 0) return "0:00";
  const minutos = Math.floor(valor / 60);
  const segundos = Math.floor(valor % 60);
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
};

const OPUS_RECORDER_SRC =
  "https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/OpusMediaRecorder.umd.js";
const OPUS_WORKER_SRC =
  "https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/encoderWorker.umd.js";
const OPUS_OGG_WASM =
  "https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/OggOpusEncoder.wasm";
const OPUS_WEBM_WASM =
  "https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/WebMOpusEncoder.wasm";

let opusMediaRecorderPromise:
  | Promise<{
    recorder: unknown;
    workerOptions: {
      OggOpusEncoderWasmPath: string;
      WebMOpusEncoderWasmPath: string;
    };
  }>
  | null = null;
let consoleAssertPatched = false;

const carregarScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Documento indisponivel."));
      return;
    }
    const existente = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );
    if (existente?.dataset.carregado === "true") {
      resolve();
      return;
    }
    const script = existente ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.carregado = "true";
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Falha ao carregar dependencia de audio."));
    if (!existente) {
      document.body.appendChild(script);
    }
  });

const garantirConsoleAssertSeguro = () => {
  if (consoleAssertPatched || typeof console === "undefined") return;
  console.assert = (condition?: boolean, ...args: unknown[]) => {
    if (condition) return;
    const safeArgs = args.map((item) => {
      if (typeof item === "string") return item;
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    });
    console.warn(...safeArgs);
  };
  consoleAssertPatched = true;
};

const carregarOpusMediaRecorder = () => {
  if (opusMediaRecorderPromise) return opusMediaRecorderPromise;
  opusMediaRecorderPromise = (async () => {
    garantirConsoleAssertSeguro();
    await carregarScript(OPUS_RECORDER_SRC);
    await carregarScript(OPUS_WORKER_SRC);
    const recorder = (window as typeof window & {
      OpusMediaRecorder?: unknown;
    }).OpusMediaRecorder;
    if (!recorder) {
      throw new Error("Polyfill de audio nao carregado.");
    }
    return {
      recorder,
      workerOptions: {
        OggOpusEncoderWasmPath: OPUS_OGG_WASM,
        WebMOpusEncoderWasmPath: OPUS_WEBM_WASM,
      },
    };
  })();
  return opusMediaRecorderPromise;
};

function AudioPlayer({
  src,
  enviada,
  label,
}: {
  src: string;
  enviada?: boolean;
  label?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = React.useState(false);
  const [tempoAtual, setTempoAtual] = React.useState(0);
  const [duracao, setDuracao] = React.useState(0);
  const [velocidade, setVelocidade] = React.useState(1);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoaded = () => {
      setDuracao(audio.duration || 0);
    };
    const handleTime = () => {
      setTempoAtual(audio.currentTime || 0);
    };
    const handleEnded = () => {
      setTocando(false);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (tocando) {
      audio.pause();
      setTocando(false);
      return;
    }
    audio.play().then(() => setTocando(true)).catch(() => undefined);
  };

  const handleDownload = () => {
    void baixarArquivo(src, label ?? "audio");
  };

  const handleChangeSpeed = () => {
    const next = velocidade === 1 ? 1.5 : velocidade === 1.5 ? 2 : 1;
    setVelocidade(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duracao) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duracao;
  };

  const progresso = duracao ? Math.min((tempoAtual / duracao) * 100, 100) : 0;

  return (
    <div
      className={cn(
        "w-full min-w-[360px] max-w-[640px] rounded-md px-3 py-2",
        enviada ? "bg-primary-foreground/10" : "bg-foreground/5"
      )}
    >
      {label && (
        <div className="mb-1 truncate text-[10px] uppercase tracking-wide opacity-70">
          {label}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            enviada ? "bg-primary-foreground/20" : "bg-foreground/10"
          )}
          aria-label={tocando ? "Pausar audio" : "Reproduzir audio"}
        >
          {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="min-w-[220px] flex-1">
          <div
            className={cn(
              "h-1.5 w-full cursor-pointer rounded-full",
              enviada ? "bg-primary-foreground/30" : "bg-foreground/15"
            )}
            onClick={handleSeek}
          >
            <div
              className={cn(
                "h-full rounded-full",
                enviada ? "bg-primary-foreground/80" : "bg-foreground/60"
              )}
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide opacity-80">
            <span>{formatarDuracao(tempoAtual)}</span>
            <span>{formatarDuracao(duracao)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleChangeSpeed}
            className={cn(
              "rounded-full px-2 py-1 text-[10px] font-semibold",
              enviada
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-foreground/10 text-foreground"
            )}
            aria-label="Velocidade de reprodução"
          >
            {velocidade}x
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              enviada ? "bg-primary-foreground/20" : "bg-foreground/10"
            )}
            aria-label="Baixar audio"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

function VideoPlayer({
  src,
}: {
  src: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [tocando, setTocando] = React.useState(false);
  const [tempoAtual, setTempoAtual] = React.useState(0);
  const [duracao, setDuracao] = React.useState(0);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const handleLoaded = () => {
      setDuracao(video.duration || 0);
    };
    const handleTime = () => {
      setTempoAtual(video.currentTime || 0);
    };
    const handleEnded = () => {
      setTocando(false);
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("timeupdate", handleTime);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("timeupdate", handleTime);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handleToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (tocando) {
      video.pause();
      setTocando(false);
      return;
    }
    video.play().then(() => setTocando(true)).catch(() => undefined);
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duracao) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    video.currentTime = ratio * duracao;
  };

  const progresso = duracao ? Math.min((tempoAtual / duracao) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          src={src}
          className="max-h-[70vh] w-full"
          onClick={handleToggle}
        />
        {!tocando && (
          <button
            type="button"
            onClick={handleToggle}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label="Reproduzir video"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80">
              <Play className="h-5 w-5 text-foreground" />
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
          aria-label={tocando ? "Pausar video" : "Reproduzir video"}
        >
          {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          <div
            className="h-1.5 w-full cursor-pointer rounded-full bg-muted"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>{formatarDuracao(tempoAtual)}</span>
            <span>{formatarDuracao(duracao)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type TagOpcao = { id: string; nome: string; cor?: string | null };
type MembroOpcao = {
  id: string;
  userId: string;
  nome: string;
  email: string;
  atual?: boolean;
};
type QuickReplyOpcao = {
  id: string;
  titulo: string;
  atalho: string;
  conteudo: string;
};
type TemplateWhatsapp = {
  id: string;
  nome: string;
  idioma: string;
  categoria: string;
  status: string;
};
type MidiaPreview = {
  tipo: "imagem" | "video";
  url: string;
  nome?: string;
};

type ChatConversaProps = {
  conversa: ConversaInbox | null;
  contatoAberto?: boolean;
  aoAlternarContato?: () => void;
  aoAlterarStatus?: (id: string, status: StatusConversa) => void;
  aoAtualizarConversa?: () => void;
  aoAtualizarTags?: (conversationId: string, tags: string[]) => void;
  aoCarregarMaisMensagens?: () => void;
};

export function ChatConversa(props: ChatConversaProps) {
  if (!props.conversa) {
    return (
      <section className="flex h-[calc(100vh-96px)] min-h-0 flex-col items-center justify-center rounded-[6px] border border-dashed border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        Selecione uma conversa para visualizar o chat.
      </section>
    );
  }

  return <ChatConversaConteudo {...props} conversa={props.conversa} />;
}

function ChatConversaConteudo({
  conversa,
  contatoAberto,
  aoAlternarContato,
  aoAlterarStatus,
  aoAtualizarConversa,
  aoAtualizarTags,
  aoCarregarMaisMensagens,
}: Omit<ChatConversaProps, "conversa"> & { conversa: ConversaInbox }) {
  const [dialogTagAberto, setDialogTagAberto] = React.useState(false);
  const [dialogTransferirAberto, setDialogTransferirAberto] = React.useState(false);
  const [dialogNotaAberto, setDialogNotaAberto] = React.useState(false);
  const [dialogDealAberto, setDialogDealAberto] = React.useState(false);
  const [dialogTarefaAberto, setDialogTarefaAberto] = React.useState(false);
  const [dialogSpamAberto, setDialogSpamAberto] = React.useState(false);
  const [dialogBloquearAberto, setDialogBloquearAberto] = React.useState(false);
  const [mensagemAtual, setMensagemAtual] = React.useState("");
  const [erroEnvio, setErroEnvio] = React.useState<string | null>(null);
  const [enviosPendentes, setEnviosPendentes] = React.useState(0);
  const enviando = enviosPendentes > 0;
  const [erroAcao, setErroAcao] = React.useState<string | null>(null);
  const [carregandoAcoes, setCarregandoAcoes] = React.useState(false);
  const [transferirSelecionado, setTransferirSelecionado] = React.useState("");
  const [notaInterna, setNotaInterna] = React.useState("");
  const [dealTitulo, setDealTitulo] = React.useState("");
  const [dealValor, setDealValor] = React.useState("");
  const [tarefaTitulo, setTarefaTitulo] = React.useState("");
  const [tarefaDataHora, setTarefaDataHora] = React.useState("");
  const [dialogQuickReplyAberto, setDialogQuickReplyAberto] =
    React.useState(false);
  const [dialogTemplateAberto, setDialogTemplateAberto] =
    React.useState(false);
  const [erroQuickReply, setErroQuickReply] = React.useState<string | null>(null);
  const [erroTemplate, setErroTemplate] = React.useState<string | null>(null);
  const [salvandoQuickReply, setSalvandoQuickReply] = React.useState(false);
  const [removendoQuickReplyId, setRemovendoQuickReplyId] =
    React.useState<string | null>(null);
  const [gravandoAudio, setGravandoAudio] = React.useState(false);
  const [audioPausado, setAudioPausado] = React.useState(false);
  const [audioGravado, setAudioGravado] = React.useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = React.useState<string | null>(
    null
  );
  const [tempoGravacao, setTempoGravacao] = React.useState(0);
  const [duracaoAudio, setDuracaoAudio] = React.useState(0);
  const [erroAudio, setErroAudio] = React.useState<string | null>(null);

  const fecharTodosDialogs = React.useCallback(() => {
    setDialogTagAberto(false);
    setDialogTransferirAberto(false);
    setDialogNotaAberto(false);
    setDialogDealAberto(false);
    setDialogTarefaAberto(false);
    setDialogSpamAberto(false);
    setDialogBloquearAberto(false);
    setDialogQuickReplyAberto(false);
    setDialogTemplateAberto(false);
  }, []);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const gravacaoTimerRef = React.useRef<number | null>(null);
  const gravacaoInicioRef = React.useRef<number | null>(null);
  const gravacaoAcumuladaRef = React.useRef(0);
  const descartarGravacaoRef = React.useRef(false);
  const enviarAudioAoFinalizarRef = React.useRef(false);
  const [enviandoTemplate, setEnviandoTemplate] = React.useState(false);
  const [novoQuickReplyTitulo, setNovoQuickReplyTitulo] = React.useState("");
  const [novoQuickReplyAtalho, setNovoQuickReplyAtalho] = React.useState("");
  const [novoQuickReplyConteudo, setNovoQuickReplyConteudo] =
    React.useState("");
  const [tagsDisponiveis, setTagsDisponiveis] = React.useState<TagOpcao[]>([]);
  const [membrosDisponiveis, setMembrosDisponiveis] = React.useState<
    MembroOpcao[]
  >([]);
  const [quickReplies, setQuickReplies] = React.useState<QuickReplyOpcao[]>([]);
  const [templatesWhatsapp, setTemplatesWhatsapp] = React.useState<
    TemplateWhatsapp[]
  >([]);
  const [agenteAtivo, setAgenteAtivo] = React.useState(false);
  const [agentePausadoMotivo, setAgentePausadoMotivo] = React.useState<string | null>(
    null
  );
  const [buscaQuickReply, setBuscaQuickReply] = React.useState("");
  const [buscaTag, setBuscaTag] = React.useState("");
  const [quickReplyPopoverAberto, setQuickReplyPopoverAberto] =
    React.useState(false);
  const [arquivosSelecionados, setArquivosSelecionados] = React.useState<File[]>(
    []
  );
  const [midiaAberta, setMidiaAberta] = React.useState<MidiaPreview | null>(
    null
  );
  const [zoomImagem, setZoomImagem] = React.useState(1);
  const inputArquivoRef = React.useRef<HTMLInputElement>(null);
  const envioAtivo =
    mensagemAtual.trim().length > 0 ||
    arquivosSelecionados.length > 0 ||
    Boolean(audioGravado);
  const iniciais = conversa.contato.nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isGrupo =
    conversa.contato.isGrupo ||
    (conversa.contato.telefone ?? "").includes("@g.us");
  const templatesDisponiveis = React.useMemo(
    () =>
      templatesWhatsapp.filter((item) => {
        const status = item.status?.toLowerCase();
        return status === "aprovado" || status === "approved";
      }),
    [templatesWhatsapp]
  );
  const coresTags = React.useMemo(() => {
    const mapa = new Map<string, string>();
    tagsDisponiveis.forEach((tag) => {
      const chave = tag.nome.trim().toLowerCase();
      if (!chave) return;
      mapa.set(chave, tag.cor ?? corPadraoTag);
    });
    return mapa;
  }, [tagsDisponiveis]);
  const corDaTag = React.useCallback(
    (nome: string) => {
      const chave = nome.trim().toLowerCase();
      if (!chave) return corPadraoTag;
      return coresTags.get(chave) ?? corPadraoTag;
    },
    [coresTags]
  );
  const quickRepliesFiltradas = React.useMemo(() => {
    const termo = buscaQuickReply.trim().toLowerCase();
    if (!termo) return quickReplies;
    return quickReplies.filter((item) => {
      return (
        item.titulo.toLowerCase().includes(termo) ||
        item.conteudo.toLowerCase().includes(termo) ||
        (item.atalho ?? "").toLowerCase().includes(termo)
      );
    });
  }, [buscaQuickReply, quickReplies]);
  const [variaveisTemplate, setVariaveisTemplate] = React.useState("");
  const scrollAreaRef = React.useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = React.useRef(true);
  const ajusteScrollRef = React.useRef<{ altura: number; topo: number } | null>(
    null
  );
  const abrirMidia = React.useCallback((midia: MidiaPreview) => {
    setMidiaAberta(midia);
    setZoomImagem(1);
  }, []);
  const mensagensComData = React.useMemo(() => {
    const itens: Array<
      | { type: "date"; label: string; key: string }
      | { type: "message"; mensagem: MensagemInbox }
    > = [];
    let ultimoLabel = "";
    conversa.mensagens.forEach((mensagem, index) => {
      const label = formatarDataMensagem(mensagem.dataHora) ?? "";
      if (label && label !== ultimoLabel) {
        itens.push({
          type: "date",
          label,
          key: `date-${label}-${index}`,
        });
        ultimoLabel = label;
      }
      itens.push({ type: "message", mensagem });
    });
    return itens;
  }, [conversa.mensagens]);
  const enviarMensagem = React.useCallback(
    async (texto: string, arquivos: File[]) => {
      const temAnexos = arquivos.length > 0;
      const { data } = await supabaseClient.auth.getSession();
      let accessToken = data.session?.access_token ?? null;
      if (!accessToken) {
        const refresh = await supabaseClient.auth.refreshSession();
        accessToken = refresh.data.session?.access_token ?? null;
      }
      if (!accessToken) {
        return { ok: false, erro: "Sessao expirada. Faça login novamente." };
      }

      let response: Response;
      if (temAnexos) {
        const formData = new FormData();
        formData.append("conversationId", conversa.id);
        if (texto) {
          formData.append("message", texto);
        }
        arquivos.forEach((file) => {
          formData.append("files", file);
        });
        response = await fetch("/api/inbox/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });
      } else {
        response = await fetch("/api/inbox/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: conversa.id,
            message: texto,
          }),
        });
      }

      if (!response.ok) {
        const detalhe = await response.text().catch(() => "");
        return { ok: false, erro: detalhe || "Falha ao enviar mensagem." };
      }

      return { ok: true };
    },
    [conversa.id]
  );

  const limparAudioGravado = React.useCallback(
    (options?: { revogarUrl?: boolean }) => {
      const revogar = options?.revogarUrl !== false;
      if (revogar && audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      setAudioPreviewUrl(null);
      setAudioGravado(null);
      setDuracaoAudio(0);
      setTempoGravacao(0);
    },
    [audioPreviewUrl]
  );

  const enviarArquivoAudio = React.useCallback(
    async (arquivo: File, limparAoEnviar = false) => {
      setEnviosPendentes((atual) => atual + 1);
      setErroEnvio(null);
      const previewBackup = audioPreviewUrl;
      const audioBackup = audioGravado;
      const duracaoBackup = duracaoAudio;
      const tempoBackup = tempoGravacao;
      try {
        if (limparAoEnviar) {
          limparAudioGravado({ revogarUrl: false });
        }
        const resultado = await enviarMensagem("", [arquivo]);
        if (!resultado.ok) {
          setErroEnvio(resultado.erro ?? "Falha ao enviar mensagem.");
          if (limparAoEnviar) {
            setAudioPreviewUrl(previewBackup);
            setAudioGravado(audioBackup);
            setDuracaoAudio(duracaoBackup);
            setTempoGravacao(tempoBackup);
          }
          return;
        }
        if (limparAoEnviar) {
          limparAudioGravado({ revogarUrl: true });
        }
        aoAtualizarConversa?.();
      } catch (error) {
        setErroEnvio(
          error instanceof Error ? error.message : "Falha ao enviar mensagem."
        );
        if (limparAoEnviar) {
          setAudioPreviewUrl(previewBackup);
          setAudioGravado(audioBackup);
          setDuracaoAudio(duracaoBackup);
          setTempoGravacao(tempoBackup);
        }
      } finally {
        setEnviosPendentes((atual) => Math.max(0, atual - 1));
      }
    },
    [
      aoAtualizarConversa,
      audioGravado,
      audioPreviewUrl,
      duracaoAudio,
      enviarMensagem,
      limparAudioGravado,
      tempoGravacao,
    ]
  );

  const handleEnviar = React.useCallback(async () => {
    if (!envioAtivo) return;
    setErroEnvio(null);

    const texto = mensagemAtual.trim();
    const anexos = [
      ...arquivosSelecionados,
      ...(audioGravado ? [audioGravado] : []),
    ];
    if (!texto && anexos.length === 0) return;

    const textoBackup = mensagemAtual;
    const arquivosBackup = arquivosSelecionados;
    const previewBackup = audioPreviewUrl;
    const audioBackup = audioGravado;
    const duracaoBackup = duracaoAudio;
    const tempoBackup = tempoGravacao;

    setMensagemAtual("");
    setArquivosSelecionados([]);
    if (audioGravado) {
      limparAudioGravado({ revogarUrl: false });
    }
    if (inputArquivoRef.current) {
      inputArquivoRef.current.value = "";
    }
    setEnviosPendentes((atual) => atual + 1);

    try {
      const resultado = await enviarMensagem(texto, anexos);
      if (!resultado.ok) {
        setErroEnvio(resultado.erro ?? "Falha ao enviar mensagem.");
        setMensagemAtual(textoBackup);
        setArquivosSelecionados(arquivosBackup);
        if (audioBackup) {
          setAudioPreviewUrl(previewBackup);
          setAudioGravado(audioBackup);
          setDuracaoAudio(duracaoBackup);
          setTempoGravacao(tempoBackup);
        }
        return;
      }

      if (audioBackup) {
        limparAudioGravado({ revogarUrl: true });
      }
      aoAtualizarConversa?.();
    } catch {
      setErroEnvio("Falha ao enviar mensagem.");
      setMensagemAtual(textoBackup);
      setArquivosSelecionados(arquivosBackup);
      if (audioBackup) {
        setAudioPreviewUrl(previewBackup);
        setAudioGravado(audioBackup);
        setDuracaoAudio(duracaoBackup);
        setTempoGravacao(tempoBackup);
      }
    } finally {
      setEnviosPendentes((atual) => Math.max(0, atual - 1));
    }
  }, [
    arquivosSelecionados,
    audioGravado,
    aoAtualizarConversa,
    envioAtivo,
    mensagemAtual,
    enviarMensagem,
    limparAudioGravado,
    audioPreviewUrl,
    duracaoAudio,
    tempoGravacao,
  ]);

  const getViewport = React.useCallback(() => {
    return scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLDivElement | null;
  }, []);

  const solicitarMaisMensagens = React.useCallback(() => {
    if (!aoCarregarMaisMensagens) return;
    const viewport = getViewport();
    if (!viewport) return;
    ajusteScrollRef.current = {
      altura: viewport.scrollHeight,
      topo: viewport.scrollTop,
    };
    aoCarregarMaisMensagens();
  }, [aoCarregarMaisMensagens, getViewport]);

  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const handleScroll = () => {
      const distance =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldStickToBottomRef.current = distance < 80;
    };

    viewport.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [getViewport]);

  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const handleScroll = () => {
      if (viewport.scrollTop > 80) return;
      if (conversa.mensagensCarregando) return;
      if (conversa.mensagensHasMais === false) return;
      if (ajusteScrollRef.current) return;
      solicitarMaisMensagens();
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [
    conversa.mensagensCarregando,
    conversa.mensagensHasMais,
    getViewport,
    solicitarMaisMensagens,
  ]);

  React.useEffect(() => {
    shouldStickToBottomRef.current = true;
  }, [conversa.id]);

  React.useLayoutEffect(() => {
    const viewport = getViewport();
    if (!viewport || !shouldStickToBottomRef.current) return;
    requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
  }, [conversa.id, conversa.mensagens.length, getViewport]);

  React.useLayoutEffect(() => {
    const viewport = getViewport();
    const ajuste = ajusteScrollRef.current;
    if (!viewport || !ajuste) return;
    const diff = viewport.scrollHeight - ajuste.altura;
    viewport.scrollTop = ajuste.topo + diff;
    ajusteScrollRef.current = null;
  }, [conversa.mensagens.length, getViewport]);
  const handleSelecionarEmoji = React.useCallback((emoji: string) => {
    setMensagemAtual((atual) => `${atual}${emoji}`);
  }, []);

  const handleSelecionarArquivos = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (!files.length) return;
      setArquivosSelecionados((atual) => [...atual, ...files]);
      event.target.value = "";
    },
    []
  );

  const handleRemoverArquivo = React.useCallback((index: number) => {
    setArquivosSelecionados((atual) =>
      atual.filter((_, atualIndex) => atualIndex !== index)
    );
  }, []);

  const [previewArquivos, setPreviewArquivos] = React.useState<
    Array<{
      id: string;
      url: string;
      nome: string;
      tipo: "imagem" | "video" | "audio" | "documento" | "arquivo";
      extensao?: string;
    }>
  >([]);

  React.useEffect(() => {
    const detectarTipo = (arquivo: File) => {
      if (arquivo.type.startsWith("image/")) return "imagem" as const;
      if (arquivo.type.startsWith("video/")) return "video" as const;
      if (arquivo.type.startsWith("audio/")) return "audio" as const;
      if (
        arquivo.type.includes("pdf") ||
        arquivo.name.toLowerCase().endsWith(".pdf")
      ) {
        return "documento" as const;
      }
      return "arquivo" as const;
    };

    const novos = arquivosSelecionados.map((arquivo, index) => {
      const extensao = arquivo.name.split(".").pop();
      return {
        id: `${arquivo.name}-${arquivo.size}-${index}`,
        url: URL.createObjectURL(arquivo),
        nome: arquivo.name,
        tipo: detectarTipo(arquivo),
        extensao,
      };
    });

    setPreviewArquivos(novos);
    return () => {
      novos.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [arquivosSelecionados]);

  const iniciarTimerGravacao = React.useCallback(() => {
    gravacaoInicioRef.current = Date.now();
    if (gravacaoTimerRef.current) {
      window.clearInterval(gravacaoTimerRef.current);
    }
    gravacaoTimerRef.current = window.setInterval(() => {
      const inicio = gravacaoInicioRef.current ?? Date.now();
      const total =
        gravacaoAcumuladaRef.current + (Date.now() - inicio);
      setTempoGravacao(Math.floor(total / 1000));
    }, 250);
  }, []);

  const pararTimerGravacao = React.useCallback(() => {
    if (gravacaoTimerRef.current) {
      window.clearInterval(gravacaoTimerRef.current);
      gravacaoTimerRef.current = null;
    }
    if (gravacaoInicioRef.current) {
      gravacaoAcumuladaRef.current +=
        Date.now() - gravacaoInicioRef.current;
      gravacaoInicioRef.current = null;
    }
  }, []);

  const limparStreamAudio = React.useCallback(() => {
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
  }, []);

  const iniciarGravacaoAudio = React.useCallback(async () => {
    if (gravandoAudio) return;
    setErroAudio(null);
    limparAudioGravado();
    descartarGravacaoRef.current = false;
    enviarAudioAoFinalizarRef.current = false;
    gravacaoAcumuladaRef.current = 0;
    setTempoGravacao(0);
    try {
      if (
        typeof MediaRecorder === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setErroAudio("Gravação de áudio não suportada neste navegador.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const tiposPreferidos = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];
      const suportaOgg =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/ogg;codecs=opus");
      const tipoSuportado = tiposPreferidos.find((tipo) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(tipo)
      );
      let recorder: MediaRecorder;
      if (suportaOgg) {
        recorder = new MediaRecorder(
          stream,
          tipoSuportado ? { mimeType: tipoSuportado } : undefined
        );
      } else {
        const { recorder: OpusMediaRecorder, workerOptions } =
          await carregarOpusMediaRecorder();
        const RecorderCtor = OpusMediaRecorder as unknown as {
          new(...args: unknown[]): MediaRecorder;
        };
        recorder = new RecorderCtor(
          stream,
          { mimeType: "audio/ogg;codecs=opus" },
          workerOptions
        );
      }
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        pararTimerGravacao();
        setGravandoAudio(false);
        setAudioPausado(false);
        limparStreamAudio();
        if (descartarGravacaoRef.current) {
          audioChunksRef.current = [];
          descartarGravacaoRef.current = false;
          return;
        }
        const mimeTypeRaw = recorder.mimeType || "audio/webm";
        const mimeType = mimeTypeRaw.split(";")[0]?.trim() || mimeTypeRaw;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        if (blob.size === 0) {
          setErroAudio("Falha ao gravar áudio.");
          return;
        }
        const extensao = mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("mpeg")
            ? "mp3"
            : "webm";
        const arquivo = new File(
          [blob],
          `audio-${Date.now()}.${extensao}`,
          { type: mimeType }
        );
        const enviarAutomatico = enviarAudioAoFinalizarRef.current;
        enviarAudioAoFinalizarRef.current = false;
        if (enviarAutomatico) {
          void enviarArquivoAudio(arquivo, false);
          return;
        }
        const url = URL.createObjectURL(blob);
        setAudioGravado(arquivo);
        setAudioPreviewUrl(url);
        setDuracaoAudio(Math.floor(gravacaoAcumuladaRef.current / 1000));
      };

      recorder.start();
      setGravandoAudio(true);
      setAudioPausado(false);
      iniciarTimerGravacao();
    } catch (error) {
      setErroAudio(
        error instanceof Error
          ? error.message
          : "Permissão de microfone negada."
      );
      limparStreamAudio();
    }
  }, [
    gravandoAudio,
    enviarArquivoAudio,
    limparAudioGravado,
    limparStreamAudio,
    iniciarTimerGravacao,
    pararTimerGravacao,
    carregarOpusMediaRecorder,
  ]);

  const pausarGravacaoAudio = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    setAudioPausado(true);
    pararTimerGravacao();
  }, [pararTimerGravacao]);

  const retomarGravacaoAudio = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    setAudioPausado(false);
    iniciarTimerGravacao();
  }, [iniciarTimerGravacao]);

  const finalizarGravacaoAudio = React.useCallback((enviar?: boolean) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    enviarAudioAoFinalizarRef.current = Boolean(enviar);
    recorder.stop();
  }, []);

  const descartarGravacaoAudio = React.useCallback(() => {
    descartarGravacaoRef.current = true;
    enviarAudioAoFinalizarRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      limparStreamAudio();
    }
    setGravandoAudio(false);
    setAudioPausado(false);
    gravacaoAcumuladaRef.current = 0;
    setTempoGravacao(0);
  }, [limparStreamAudio]);

  const enviarAudioGravado = React.useCallback(async () => {
    if (!audioGravado) return;
    void enviarArquivoAudio(audioGravado, true);
  }, [audioGravado, enviarArquivoAudio]);

  React.useEffect(() => {
    return () => {
      descartarGravacaoRef.current = true;
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      limparStreamAudio();
      if (gravacaoTimerRef.current) {
        window.clearInterval(gravacaoTimerRef.current);
      }
    };
  }, [limparStreamAudio]);

  React.useEffect(() => {
    descartarGravacaoRef.current = true;
    enviarAudioAoFinalizarRef.current = false;
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    limparStreamAudio();
    setGravandoAudio(false);
    setAudioPausado(false);
    limparAudioGravado();
  }, [conversa.id, limparAudioGravado, limparStreamAudio]);

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const obterUrlAnexo = React.useCallback(
    async (storagePath: string) => {
      const token = await obterToken();
      if (!token) return null;
      try {
        return await getR2SignedUrl(token, {
          action: "download",
          bucket: "inbox-attachments",
          key: storagePath,
          expiresIn: 60 * 60 * 24 * 7,
        });
      } catch {
        return null;
      }
    },
    [obterToken]
  );

  React.useEffect(() => {
    if (!conversa) return;
    let ativo = true;

    const carregarAcoes = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) return;
      const token = data.session.access_token;
      setCarregandoAcoes(true);

      const [tagsResult, membrosResp, quickResp, templatesResp] =
        await Promise.all([
          supabaseClient.from("tags").select("id, nome, cor").order("nome"),
          fetch("/api/settings/team", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/inbox/quick-replies", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          conversa.canal === "whatsapp"
            ? fetch("/api/inbox/whatsapp/templates", {
              headers: { Authorization: `Bearer ${token}` },
            })
            : Promise.resolve(null),
        ]);

      if (!ativo) return;

      if (!tagsResult.error) {
        setTagsDisponiveis((tagsResult.data ?? []) as TagOpcao[]);
      }

      if (membrosResp.ok) {
        const payload = (await membrosResp.json()) as {
          members?: MembroOpcao[];
        };
        const membros = payload.members ?? [];
        setMembrosDisponiveis(membros);
        const atual = membros.find((membro) => membro.atual)?.userId;
        const primeiro = membros[0]?.userId ?? "";
        setTransferirSelecionado((valor) => valor || atual || primeiro);
      } else {
        setMembrosDisponiveis([]);
      }

      if (quickResp.ok) {
        const payload = (await quickResp.json()) as {
          quickReplies?: QuickReplyOpcao[];
        };
        setQuickReplies(payload.quickReplies ?? []);
      }

      if (templatesResp?.ok) {
        const payload = (await templatesResp.json()) as {
          templates?: TemplateWhatsapp[];
        };
        setTemplatesWhatsapp(payload.templates ?? []);
      } else {
        setTemplatesWhatsapp([]);
      }

      setCarregandoAcoes(false);
    };

    carregarAcoes().catch(() => setCarregandoAcoes(false));

    return () => {
      ativo = false;
    };
  }, [conversa, conversa?.canal]);

  React.useEffect(() => {
    let ativo = true;

    const carregarAgenteAtivo = async () => {
      const { data, error } = await supabaseClient
        .from("agent_conversation_state")
        .select("pausado, pausado_motivo, agent_id, agents(status)")
        .eq("conversation_id", conversa.id);

      if (!ativo) return;
      if (error) {
        setAgenteAtivo(false);
        setAgentePausadoMotivo(null);
        return;
      }

      const registros = data ?? [];
      const ativoEncontrado = registros.some((registro) => {
        const pausado = Boolean(registro.pausado);
        const agents = registro.agents as { status?: string } | { status?: string }[] | null;
        const status =
          Array.isArray(agents) ? agents[0]?.status : agents?.status;
        return !pausado && status === "ativo";
      });
      setAgenteAtivo(ativoEncontrado);
      if (!ativoEncontrado) {
        const primeiroPausado = registros.find((registro) => registro.pausado);
        setAgentePausadoMotivo(
          (primeiroPausado?.pausado_motivo as string | null) ?? null
        );
      } else {
        setAgentePausadoMotivo(null);
      }
    };

    carregarAgenteAtivo();

    return () => {
      ativo = false;
    };
  }, [conversa.id]);

  const labelPausaAgente = React.useMemo(() => {
    if (!agentePausadoMotivo) return null;
    const mapa: Record<string, string> = {
      modo_atendimento_humano: "Modo atendimento humano",
      humano_respondeu: "Humano respondeu",
      tag_pause: "Tag de pausa",
      stage_pause: "Etapa de pausa",
      no_consent: "Sem consentimento",
      no_credits: "Sem créditos",
      agent_inactive: "Agente inativo",
      channel_not_supported: "Canal nao suportado",
    };
    return mapa[agentePausadoMotivo] ?? "Agente pausado";
  }, [agentePausadoMotivo]);

  const handleTransferir = React.useCallback(async () => {
    if (!transferirSelecionado) return;
    const token = await obterToken();
    if (!token) {
      setErroAcao("Sessao expirada.");
      return;
    }
    setCarregandoAcoes(true);
    setErroAcao(null);

    const response = await fetch(
      `/api/inbox/conversations/${conversa.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ownerId: transferirSelecionado }),
      }
    );

    if (!response.ok) {
      const detalhe = await response.text().catch(() => "");
      setErroAcao(detalhe || "Falha ao transferir conversa.");
      setCarregandoAcoes(false);
      return;
    }

    setDialogTransferirAberto(false);
    setCarregandoAcoes(false);
  }, [conversa.id, obterToken, transferirSelecionado]);

  const handleMarcarPendente = React.useCallback(async () => {
    const token = await obterToken();
    if (!token) return;
    await fetch(`/api/inbox/conversations/${conversa.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "pendente" }),
    });
  }, [conversa.id, obterToken]);

  const handleSalvarNota = React.useCallback(async () => {
    if (!notaInterna.trim()) return;
    const token = await obterToken();
    if (!token) {
      setErroAcao("Sessao expirada.");
      return;
    }
    setCarregandoAcoes(true);
    setErroAcao(null);

    const response = await fetch("/api/inbox/notes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: conversa.id,
        content: notaInterna,
      }),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => "");
      setErroAcao(detalhe || "Falha ao salvar nota.");
      setCarregandoAcoes(false);
      return;
    }

    setNotaInterna("");
    setDialogNotaAberto(false);
    setCarregandoAcoes(false);
  }, [conversa.id, notaInterna, obterToken]);

  const handleCriarDeal = React.useCallback(async () => {
    if (!dealTitulo.trim()) return;
    const token = await obterToken();
    if (!token) {
      setErroAcao("Sessao expirada.");
      return;
    }
    setCarregandoAcoes(true);
    setErroAcao(null);

    const response = await fetch("/api/inbox/deals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: conversa.id,
        title: dealTitulo,
        value: dealValor,
      }),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => "");
      setErroAcao(detalhe || "Falha ao criar negocio.");
      setCarregandoAcoes(false);
      return;
    }

    setDealTitulo("");
    setDealValor("");
    setDialogDealAberto(false);
    setCarregandoAcoes(false);
  }, [conversa.id, dealTitulo, dealValor, obterToken]);

  const handleCriarTarefa = React.useCallback(async () => {
    if (!tarefaTitulo.trim() || !tarefaDataHora) return;
    const token = await obterToken();
    if (!token) {
      setErroAcao("Sessao expirada.");
      return;
    }

    const [data, hora] = tarefaDataHora.split("T");
    if (!data || !hora) {
      setErroAcao("Data invalida.");
      return;
    }

    setCarregandoAcoes(true);
    setErroAcao(null);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titulo: tarefaTitulo,
        data,
        hora,
        relacionamentoTipo: "conversa",
        relacionamentoNome: conversa.contato.nome,
      }),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => "");
      setErroAcao(detalhe || "Falha ao criar tarefa.");
      setCarregandoAcoes(false);
      return;
    }

    setTarefaTitulo("");
    setTarefaDataHora("");
    setDialogTarefaAberto(false);
    setCarregandoAcoes(false);
  }, [conversa.contato.nome, conversa.id, obterToken, tarefaDataHora, tarefaTitulo]);

  const handleMarcarSpam = React.useCallback(async () => {
    if (!aoAlterarStatus) return;
    setCarregandoAcoes(true);
    await aoAlterarStatus(conversa.id, "spam");
    setDialogSpamAberto(false);
    setCarregandoAcoes(false);
  }, [aoAlterarStatus, conversa.id]);

  const handleToggleTag = React.useCallback(
    async (tagName: string) => {
      const nomeNormalizado = tagName.trim().toLowerCase();
      if (!nomeNormalizado) return;

      const tagEncontrada = tagsDisponiveis.find(
        (tag) => tag.nome.trim().toLowerCase() === nomeNormalizado
      );
      if (!tagEncontrada) {
        setErroAcao("Tag nao encontrada.");
        return;
      }

      const tagsAtuais = conversa.tags ?? [];
      const removendo = tagsAtuais.some(
        (tag) => tag.trim().toLowerCase() === nomeNormalizado
      );

      const token = await obterToken();
      if (!token) {
        setErroAcao("Sessao expirada.");
        return;
      }

      setCarregandoAcoes(true);
      setErroAcao(null);

      const response = await fetch("/api/inbox/tags", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversa.id,
          tagIds: [tagEncontrada.id],
          action: removendo ? "remove" : "add",
        }),
      });

      if (!response.ok) {
        const detalhe = await response.text().catch(() => "");
        setErroAcao(detalhe || "Falha ao atualizar tag.");
        setCarregandoAcoes(false);
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { tags?: string[] }
        | null;
      if (payload?.tags) {
        aoAtualizarTags?.(conversa.id, payload.tags);
      } else {
        aoAtualizarConversa?.();
      }
      setCarregandoAcoes(false);
      setBuscaTag("");
    },
    [
      conversa.id,
      conversa.tags,
      tagsDisponiveis,
      obterToken,
      aoAtualizarConversa,
      aoAtualizarTags,
    ]
  );

  const handleBloquear = React.useCallback(async () => {
    const token = await obterToken();
    if (!token) {
      setErroAcao("Sessao expirada.");
      return;
    }
    setCarregandoAcoes(true);
    setErroAcao(null);

    const response = await fetch("/api/inbox/block", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ conversationId: conversa.id }),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => "");
      setErroAcao(detalhe || "Falha ao bloquear contato.");
      setCarregandoAcoes(false);
      return;
    }

    setDialogBloquearAberto(false);
    setCarregandoAcoes(false);
  }, [conversa.id, obterToken]);

  const handleCriarQuickReply = React.useCallback(async () => {
    if (!novoQuickReplyTitulo.trim() || !novoQuickReplyConteudo.trim()) return;
    const token = await obterToken();
    if (!token) {
      setErroQuickReply("Sessao expirada.");
      return;
    }
    setSalvandoQuickReply(true);
    setErroQuickReply(null);

    const response = await fetch("/api/inbox/quick-replies", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titulo: novoQuickReplyTitulo,
        atalho: novoQuickReplyAtalho,
        conteudo: novoQuickReplyConteudo,
      }),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => "");
      setErroQuickReply(detalhe || "Falha ao salvar resposta rápida.");
      setSalvandoQuickReply(false);
      return;
    }

    const payload = (await response.json()) as { quickReply?: QuickReplyOpcao };
    if (payload.quickReply) {
      setQuickReplies((atual) => [...atual, payload.quickReply as QuickReplyOpcao]);
    }
    setNovoQuickReplyTitulo("");
    setNovoQuickReplyAtalho("");
    setNovoQuickReplyConteudo("");
    setSalvandoQuickReply(false);
  }, [
    novoQuickReplyAtalho,
    novoQuickReplyConteudo,
    novoQuickReplyTitulo,
    obterToken,
  ]);

  const handleExcluirQuickReply = React.useCallback(
    async (id: string) => {
      const token = await obterToken();
      if (!token) {
        setErroQuickReply("Sessao expirada.");
        return;
      }
      setRemovendoQuickReplyId(id);
      setErroQuickReply(null);

      try {
        const response = await fetch("/api/inbox/quick-replies", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const detalhe = await response.text().catch(() => "");
          throw new Error(
            detalhe || "Falha ao excluir resposta rápida."
          );
        }

        setQuickReplies((atual) => atual.filter((item) => item.id !== id));
      } catch (error) {
        setErroQuickReply(
          error instanceof Error
            ? error.message
            : "Falha ao excluir resposta rápida."
        );
      } finally {
        setRemovendoQuickReplyId(null);
      }
    },
    [obterToken]
  );

  const handleEnviarTemplate = React.useCallback(
    async (template: TemplateWhatsapp) => {
      const token = await obterToken();
      if (!token) {
        setErroTemplate("Sessao expirada.");
        return;
      }
      const variables = variaveisTemplate
        .split("\n")
        .map((valor) => valor.trim())
        .filter(Boolean);
      setEnviandoTemplate(true);
      setErroTemplate(null);

      const response = await fetch("/api/inbox/whatsapp/send-template", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversa.id,
          templateName: template.nome,
          language: template.idioma,
          variables: variables.length ? variables : undefined,
        }),
      });

      if (!response.ok) {
        const detalhe = await response.text().catch(() => "");
        setErroTemplate(detalhe || "Falha ao enviar template.");
        setEnviandoTemplate(false);
        return;
      }

      setDialogTemplateAberto(false);
      setVariaveisTemplate("");
      setEnviandoTemplate(false);
    },
    [conversa.id, obterToken, variaveisTemplate]
  );

  return (
    <TooltipProvider>
      <section className="flex h-[calc(100vh-56px)] min-h-0 flex-col overflow-hidden rounded-[6px] border border-border/50 bg-card/70">
        <div className="border-b border-border/50 bg-background/70 px-5 py-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                className={cn(
                  "h-10 w-10",
                  conversa.canal === "whatsapp" && "ring-2 ring-emerald-500/30"
                )}
              >
                {conversa.contato.avatarUrl && (
                  <AvatarImage
                    src={conversa.contato.avatarUrl}
                    alt={conversa.contato.nome}
                  />
                )}
                <AvatarFallback>{iniciais}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[17px] font-semibold tracking-tight">
                  {conversa.contato.nome}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {isGrupo && (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2.5 text-[11px]"
                    >
                      Grupo
                    </Badge>
                  )}
                  {conversa.tags.map((tag) => {
                    const corTag = corDaTag(tag);
                    return (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="gap-1 rounded-full border px-2.5 text-[11px] text-white"
                        style={{ backgroundColor: corTag, borderColor: corTag }}
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    );
                  })}
                  {conversa.modoAtendimentoHumano ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2.5 text-[11px]"
                    >
                      Atendimento humano
                    </Badge>
                  ) : agenteAtivo ? (
                    <Badge className="gap-1 rounded-full px-2.5 text-[11px]">
                      <Bot className="h-3 w-3" />
                      Agente ativo
                    </Badge>
                  ) : (
                    labelPausaAgente && (
                      <Badge
                        variant="outline"
                        className="gap-1 rounded-full px-2.5 text-[11px]"
                      >
                        <PauseCircle className="h-3 w-3" />
                        {labelPausaAgente}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isGrupo && (
                <>
                  {conversa.status === "aberta" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-[6px] border-0 bg-emerald-500/10 text-emerald-700 shadow-none hover:bg-emerald-500/15 hover:text-emerald-700"
                      onClick={() => aoAlterarStatus?.(conversa.id, "resolvida")}
                    >
                      <Check className="h-4 w-4" />
                      Resolver
                    </Button>
                  ) : conversa.status === "pendente" || conversa.status === "spam" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-[6px] border-0 bg-blue-500/10 text-blue-700 shadow-none hover:bg-blue-500/15 hover:text-blue-700"
                      onClick={() => aoAlterarStatus?.(conversa.id, "aberta")}
                    >
                      <Play className="h-4 w-4" />
                      Iniciar conversa
                    </Button>
                  ) : null}
                </>
              )}
              {!isGrupo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={aoAlternarContato}
                      aria-label={
                        contatoAberto
                          ? "Fechar painel do contato"
                          : "Abrir painel do contato"
                      }
                      className="rounded-[6px] bg-background/80 shadow-none hover:bg-muted/70"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {contatoAberto ? "Fechar contato" : "Abrir contato"}
                  </TooltipContent>
                </Tooltip>
              )}
              {!isGrupo && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Abrir ações"
                          className="rounded-[6px] bg-background/80 shadow-none hover:bg-muted/70"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Ações do chat</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Ações da conversa</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        setErroAcao(null);
                        fecharTodosDialogs();
                        setDialogTagAberto(true);
                      }}
                    >
                      <Tag className="mr-2 h-4 w-4" />
                      Gerenciar tags
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setErroAcao(null);
                        fecharTodosDialogs();
                        setDialogTransferirAberto(true);
                      }}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Transferir
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setErroAcao(null);
                        fecharTodosDialogs();
                        setDialogNotaAberto(true);
                      }}
                    >
                      <StickyNote className="mr-2 h-4 w-4" />
                      Nota interna
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void handleMarcarPendente()}>
                      <Clock className="mr-2 h-4 w-4" />
                      Marcar pendente
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Criar</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() => {
                        setErroAcao(null);
                        fecharTodosDialogs();
                        setDialogDealAberto(true);
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Criar negócio
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setErroAcao(null);
                        fecharTodosDialogs();
                        setDialogTarefaAberto(true);
                      }}
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      Criar tarefa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Segurança</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() => {
                        setErroAcao(null);
                        fecharTodosDialogs();
                        setDialogSpamAberto(true);
                      }}
                    >
                      {conversa.status === 'spam' ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Desmarcar spam
                        </>
                      ) : (
                        <>
                          <OctagonAlert className="mr-2 h-4 w-4" />
                          Marcar spam
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setErroAcao(null);
                        fecharTodosDialogs();
                        setDialogBloquearAberto(true);
                      }}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Bloquear contato
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        <Dialog
          open={dialogTransferirAberto}
          onOpenChange={setDialogTransferirAberto}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir conversa</DialogTitle>
              <DialogDescription>
                Selecione o novo responsável pela conversa.
              </DialogDescription>
            </DialogHeader>
            {membrosDisponiveis.length ? (
              <Select
                value={transferirSelecionado}
                onValueChange={setTransferirSelecionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  {membrosDisponiveis.map((membro) => (
                    <SelectItem key={membro.userId} value={membro.userId}>
                      {membro.nome || membro.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum membro encontrado.
              </p>
            )}
            {erroAcao && <p className="text-xs text-destructive">{erroAcao}</p>}
            <DialogFooter>
              <Button
                onClick={handleTransferir}
                disabled={!transferirSelecionado || carregandoAcoes}
              >
                Transferir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogNotaAberto} onOpenChange={setDialogNotaAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nota interna</DialogTitle>
              <DialogDescription>
                Visível apenas para a equipe.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={notaInterna}
              onChange={(event) => setNotaInterna(event.target.value)}
              placeholder="Adicionar nota interna"
              className="min-h-[120px]"
            />
            {erroAcao && <p className="text-xs text-destructive">{erroAcao}</p>}
            <DialogFooter>
              <Button
                onClick={handleSalvarNota}
                disabled={!notaInterna.trim() || carregandoAcoes}
              >
                Salvar nota
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogDealAberto} onOpenChange={setDialogDealAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar negócio</DialogTitle>
              <DialogDescription>
                Gere uma oportunidade a partir desta conversa.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input
                value={dealTitulo}
                onChange={(event) => setDealTitulo(event.target.value)}
                placeholder="Nome do negócio"
              />
              <Input
                value={dealValor}
                onChange={(event) => setDealValor(event.target.value)}
                placeholder="Valor estimado"
              />
              {erroAcao && <p className="text-xs text-destructive">{erroAcao}</p>}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCriarDeal}
                disabled={!dealTitulo.trim() || carregandoAcoes}
              >
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogTarefaAberto} onOpenChange={setDialogTarefaAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar tarefa</DialogTitle>
              <DialogDescription>
                Programe um follow-up com o contato.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input
                value={tarefaTitulo}
                onChange={(event) => setTarefaTitulo(event.target.value)}
                placeholder="Título da tarefa"
              />
              <Input
                type="datetime-local"
                value={tarefaDataHora}
                onChange={(event) => setTarefaDataHora(event.target.value)}
                placeholder="Data e hora"
              />
              {erroAcao && <p className="text-xs text-destructive">{erroAcao}</p>}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCriarTarefa}
                disabled={!tarefaTitulo.trim() || !tarefaDataHora || carregandoAcoes}
              >
                Criar tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogSpamAberto} onOpenChange={setDialogSpamAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{conversa.status === 'spam' ? "Desmarcar spam" : "Marcar como spam"}</DialogTitle>
              <DialogDescription>
                {conversa.status === 'spam'
                  ? "A conversa voltará para a caixa de entrada."
                  : "Esta conversa será movida para a aba de spam."}
              </DialogDescription>
            </DialogHeader>
            {erroAcao && <p className="text-xs text-destructive">{erroAcao}</p>}
            <DialogFooter>
              <Button
                variant={conversa.status === 'spam' ? "default" : "destructive"}
                onClick={() => {
                  if (conversa.status === 'spam') {
                    // Logic to unspam (move to aberta)
                    aoAlterarStatus?.(conversa.id, 'aberta');
                    setDialogSpamAberto(false);
                  } else {
                    handleMarcarSpam();
                  }
                }}
                disabled={carregandoAcoes}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogBloquearAberto} onOpenChange={setDialogBloquearAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bloquear contato</DialogTitle>
              <DialogDescription>
                O contato não poderá iniciar novas conversas.
              </DialogDescription>
            </DialogHeader>
            {erroAcao && <p className="text-xs text-destructive">{erroAcao}</p>}
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleBloquear}
                disabled={carregandoAcoes}
              >
                Bloquear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogTagAberto} onOpenChange={setDialogTagAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2">
                {conversa.tags.length > 0 ? (
                  conversa.tags.map((tag) => {
                    const corTag = corDaTag(tag);
                    return (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="gap-1 border pr-1.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: corTag, borderColor: corTag }}
                      >
                        {tag}
                        <button
                          onClick={() => handleToggleTag(tag)}
                          className="ml-1 rounded-full p-0.5 text-white/90 hover:bg-white/15"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                ) : (
                  <p className="py-2 text-sm italic text-muted-foreground">
                    Nenhuma tag selecionada.
                  </p>
                )}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 justify-between px-3 text-xs w-full max-w-[240px]">
                    Adicionar tag...
                    <Plus className="ml-2 h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-2" align="start">
                  <div className="mb-2 px-1">
                    <Input
                      placeholder="Buscar tag..."
                      className="h-8 text-xs focus-visible:ring-1"
                      value={buscaTag}
                      onChange={(e) => setBuscaTag(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1 p-1">
                      {tagsDisponiveis
                        .filter((t) =>
                          !conversa.tags.includes(t.nome) &&
                          t.nome.toLowerCase().includes(buscaTag.toLowerCase())
                        )
                        .map((tag) => (
                          <div
                            key={tag.id}
                            className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleToggleTag(tag.nome)}
                          >
                            <span>{tag.nome}</span>
                            <Plus className="h-3 w-3 opacity-50" />
                          </div>
                        ))}
                      {tagsDisponiveis.filter((t) => !conversa.tags.includes(t.nome) && t.nome.toLowerCase().includes(buscaTag.toLowerCase())).length === 0 && (
                        <p className="px-2 py-2 text-center text-xs text-muted-foreground">
                          Nenhuma tag encontrada.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              {erroAcao && (
                <p className="text-xs text-destructive">{erroAcao}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogQuickReplyAberto}
          onOpenChange={setDialogQuickReplyAberto}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respostas rápidas</DialogTitle>
              <DialogDescription>
                Reaproveite respostas frequentes no atendimento.
              </DialogDescription>
            </DialogHeader>
            {quickReplies.length ? (
              <div className="space-y-2">
                {quickReplies.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        Atalho: {item.atalho || "--"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.conteudo}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setMensagemAtual(item.conteudo);
                          setDialogQuickReplyAberto(false);
                        }}
                      >
                        Usar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleExcluirQuickReply(item.id)}
                        disabled={removendoQuickReplyId === item.id}
                        aria-label="Excluir resposta rápida"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma resposta rápida cadastrada.
              </p>
            )}
            <Separator />
            <div className="grid gap-2">
              <Input
                value={novoQuickReplyTitulo}
                onChange={(event) => setNovoQuickReplyTitulo(event.target.value)}
                placeholder="Título da resposta rápida"
              />
              <Input
                value={novoQuickReplyAtalho}
                onChange={(event) => setNovoQuickReplyAtalho(event.target.value)}
                placeholder="Atalho (opcional)"
              />
              <Textarea
                value={novoQuickReplyConteudo}
                onChange={(event) => setNovoQuickReplyConteudo(event.target.value)}
                placeholder="Conteúdo da resposta"
                className="min-h-[110px]"
              />
              {erroQuickReply && (
                <p className="text-xs text-destructive">{erroQuickReply}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCriarQuickReply}
                disabled={
                  salvandoQuickReply ||
                  !novoQuickReplyTitulo.trim() ||
                  !novoQuickReplyConteudo.trim()
                }
              >
                Salvar resposta rápida
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogTemplateAberto}
          onOpenChange={setDialogTemplateAberto}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Templates WhatsApp</DialogTitle>
              <DialogDescription>
                Envie templates aprovados para mensagens fora da janela de 24h.
              </DialogDescription>
            </DialogHeader>
            {conversa.canal === "whatsapp" && (
              <div className="grid gap-2">
                <p className="text-xs font-medium">Variáveis do template</p>
                <Textarea
                  value={variaveisTemplate}
                  onChange={(event) => setVariaveisTemplate(event.target.value)}
                  placeholder="Uma variável por linha"
                  className="min-h-[90px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  {"Use a ordem esperada pelo template ({{1}}, {{2}}, {{3}}...)."}
                </p>
              </div>
            )}
            {conversa.canal !== "whatsapp" ? (
              <p className="text-xs text-muted-foreground">
                Templates estao disponiveis apenas no WhatsApp.
              </p>
            ) : templatesDisponiveis.length ? (
              <div className="space-y-2">
                {templatesDisponiveis.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{template.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.idioma} • {template.categoria}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEnviarTemplate(template)}
                      disabled={enviandoTemplate}
                    >
                      Enviar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum template encontrado.
              </p>
            )}
            {erroTemplate && (
              <p className="text-xs text-destructive">{erroTemplate}</p>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(midiaAberta)}
          onOpenChange={(open) => {
            if (!open) {
              setMidiaAberta(null);
            }
          }}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>{midiaAberta?.nome ?? "Visualização"}</DialogTitle>
            </DialogHeader>
            {midiaAberta?.tipo === "imagem" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() =>
                        setZoomImagem((valor) => Math.min(valor + 0.2, 3))
                      }
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() =>
                        setZoomImagem((valor) => Math.max(valor - 0.2, 0.6))
                      }
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setZoomImagem(1)}
                      aria-label="Reset zoom"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  {midiaAberta?.url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        void baixarArquivo(midiaAberta.url, midiaAberta.nome)
                      }
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </Button>
                  )}
                </div>
                <div className="max-h-[70vh] overflow-auto rounded-lg border border-border/40 bg-black/5 p-4">
                  <img
                    src={midiaAberta?.url ?? ""}
                    alt={midiaAberta?.nome ?? "Imagem"}
                    className="mx-auto select-none"
                    style={{
                      transform: `scale(${zoomImagem})`,
                      transformOrigin: "center center",
                    }}
                  />
                </div>
              </div>
            ) : midiaAberta?.tipo === "video" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Reprodução personalizada
                  </span>
                  {midiaAberta?.url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        void baixarArquivo(midiaAberta.url, midiaAberta.nome)
                      }
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </Button>
                  )}
                </div>
                {midiaAberta?.url && <VideoPlayer src={midiaAberta.url} />}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <div
          ref={scrollAreaRef}
          className="flex-1 min-h-0 bg-gradient-to-b from-background via-background to-muted/30"
        >
          <ScrollArea className="h-full px-6 py-5">
            <div className="space-y-4 pb-10">
              {mensagensComData.map((item) =>
                item.type === "date" ? (
                  <div
                    key={item.key}
                    className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {item.label}
                  </div>
                ) : (
                  <MensagemChat
                    key={item.mensagem.id}
                    mensagem={item.mensagem}
                    isGrupo={conversa.contato.isGrupo}
                    avatarContato={conversa.contato.avatarUrl}
                    avatarEquipe={conversa.avatarCanal}
                    nomeContato={conversa.contato.nome}
                    nomeEquipe={conversa.nomeCanal ?? "Equipe"}
                    aoAbrirMidia={abrirMidia}
                    obterUrlAnexo={obterUrlAnexo}
                  />
                )
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-border/50 bg-background/70 p-4 backdrop-blur-sm">
          <div className="relative rounded-[6px] border border-border/40 bg-transparent px-3 pb-12 pt-3 shadow-none">
            <Textarea
              value={mensagemAtual}
              onChange={(event) => setMensagemAtual(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleEnviar();
                }
              }}
              placeholder='Shift + Enter para uma nova linha. "/" para frase rápida.'
              className="min-h-[110px] max-h-[180px] resize-none overflow-y-auto border-0 bg-transparent p-0 pb-12 pr-12 text-[13px] leading-relaxed shadow-none focus-visible:ring-0"
            />
            {(gravandoAudio || audioGravado) && (
              <div className="mt-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                {gravandoAudio ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span>{audioPausado ? "Gravação pausada" : "Gravando áudio"}</span>
                      <span className="tabular-nums">{formatarDuracao(tempoGravacao)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          audioPausado ? retomarGravacaoAudio() : pausarGravacaoAudio()
                        }
                        aria-label={audioPausado ? "Retomar gravação" : "Pausar gravação"}
                        className="h-8 w-8 rounded-full"
                      >
                        {audioPausado ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => finalizarGravacaoAudio(true)}
                        className="h-8"
                      >
                        Finalizar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={descartarGravacaoAudio}
                        aria-label="Descartar gravação"
                        className="h-8 w-8 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-3">
                      <audio
                        src={audioPreviewUrl ?? undefined}
                        controls
                        className="h-8 w-full"
                      />
                      <span className="text-xs text-muted-foreground">
                        {formatarDuracao(duracaoAudio)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={enviarAudioGravado}
                        disabled={enviando}
                      >
                        Enviar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => limparAudioGravado()}
                        aria-label="Descartar áudio"
                        className="h-8 w-8 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {erroAudio && (
              <p className="mt-2 text-xs text-destructive">{erroAudio}</p>
            )}
            {previewArquivos.length > 0 && (
              <div className="mt-3 grid gap-2 pb-6 sm:grid-cols-3">
                {previewArquivos.map((arquivo, index) => (
                  <div
                    key={arquivo.id}
                    className="group relative overflow-hidden rounded-md border border-border/50 bg-muted/20"
                  >
                    {arquivo.tipo === "imagem" && (
                      <img
                        src={arquivo.url}
                        alt={arquivo.nome}
                        className="h-24 w-full object-cover"
                      />
                    )}
                    {arquivo.tipo === "video" && (
                      <div className="relative h-24 w-full bg-black">
                        <video
                          className="h-24 w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        >
                          <source src={arquivo.url} />
                        </video>
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80">
                            <Play className="h-4 w-4 text-foreground" />
                          </span>
                        </span>
                      </div>
                    )}
                    {arquivo.tipo === "audio" && (
                      <div className="flex h-24 flex-col items-center justify-center gap-1 px-3 text-[11px] text-muted-foreground">
                        <Mic className="h-4 w-4" />
                        Áudio anexado
                      </div>
                    )}
                    {(arquivo.tipo === "documento" ||
                      arquivo.tipo === "arquivo") && (
                        <div className="flex h-24 flex-col items-center justify-center gap-1 px-3 text-[11px] text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="uppercase tracking-wide">
                            {arquivo.extensao ?? "Arquivo"}
                          </span>
                        </div>
                      )}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleRemoverArquivo(index)}
                      aria-label="Remover anexo"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <Popover
                open={quickReplyPopoverAberto}
                onOpenChange={(valor) => {
                  setQuickReplyPopoverAberto(valor);
                  if (!valor) setBuscaQuickReply("");
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Inserir emoji"
                        className="rounded-full hover:bg-muted/60"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Emojis</TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="start"
                  className="w-[340px] overflow-hidden p-0"
                >
                  <EmojiPickerPadrao onSelect={handleSelecionarEmoji} />
                </PopoverContent>
              </Popover>

              <input
                ref={inputArquivoRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,audio/*,application/pdf,text/plain,text/csv,application/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleSelecionarArquivos}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => inputArquivoRef.current?.click()}
                    aria-label="Anexar arquivo"
                    className="rounded-full hover:bg-muted/60"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anexar arquivo</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Ditado de áudio"
                    onClick={iniciarGravacaoAudio}
                    disabled={gravandoAudio || Boolean(audioGravado)}
                    className="rounded-full hover:bg-muted/60"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Áudio</TooltipContent>
              </Tooltip>

              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Respostas rápidas"
                        className="h-8 gap-2 rounded-full px-3 text-[11px] hover:bg-muted/60"
                      >
                        <Settings className="h-4 w-4" />
                        Respostas rápidas
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Respostas rápidas</TooltipContent>
                </Tooltip>
                <PopoverContent align="start" className="w-[320px] p-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={buscaQuickReply}
                        onChange={(event) => setBuscaQuickReply(event.target.value)}
                        placeholder="Buscar respostas rápidas"
                        className="h-7 border-0 bg-transparent p-0 text-[12px] focus-visible:ring-0"
                      />
                    </div>
                    <ScrollArea className="h-[180px] pr-2">
                      {quickRepliesFiltradas.length ? (
                        <div className="space-y-1">
                          {quickRepliesFiltradas.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setMensagemAtual(item.conteudo);
                                setQuickReplyPopoverAberto(false);
                              }}
                              className="w-full rounded-md border border-transparent px-2 py-2 text-left text-xs transition hover:border-border/70 hover:bg-muted/50"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">
                                  {item.titulo}
                                </span>
                                {item.atalho && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.atalho}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                {item.conteudo}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma resposta rápida encontrada.
                        </p>
                      )}
                    </ScrollArea>
                    <Separator />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setQuickReplyPopoverAberto(false);
                        fecharTodosDialogs();
                        setDialogQuickReplyAberto(true);
                      }}
                    >
                      Nova resposta rápida
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={handleEnviar}
                  disabled={!envioAtivo}
                  aria-label="Enviar mensagem"
                  className="absolute bottom-2 right-2 h-9 w-9 rounded-[6px] shadow-none"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar</TooltipContent>
            </Tooltip>
            {erroEnvio && (
              <p className="mt-2 text-xs text-destructive">{erroEnvio}</p>
            )}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

function MensagemChat({
  mensagem,
  isGrupo,
  avatarContato,
  avatarEquipe,
  nomeContato,
  nomeEquipe,
  aoAbrirMidia,
  obterUrlAnexo,
}: {
  mensagem: MensagemInbox;
  isGrupo?: boolean;
  avatarContato?: string;
  avatarEquipe?: string;
  nomeContato: string;
  nomeEquipe: string;
  aoAbrirMidia?: (midia: MidiaPreview) => void;
  obterUrlAnexo?: (storagePath: string) => Promise<string | null>;
}) {
  const enviada = mensagem.autor !== "contato";
  const alinhamento = enviada ? "items-end" : "items-start";
  const bolha = enviada
    ? "bg-primary text-primary-foreground shadow-none"
    : "bg-muted/60 text-foreground border border-border/40";
  const metaPadding = enviada ? "pr-9" : "pl-9";
  const avatarUrl = enviada
    ? mensagem.senderAvatarUrl ?? avatarEquipe
    : isGrupo
      ? mensagem.senderAvatarUrl ?? "/avatars/contato-placeholder.svg"
      : avatarContato;
  const avatarNome = enviada
    ? mensagem.senderNome ?? nomeEquipe
    : isGrupo
      ? mensagem.senderNome ?? "Participante"
      : nomeContato;
  const exibirNomeParticipante = Boolean(isGrupo && !enviada);
  const textoMensagem = mensagem.conteudo.trim();
  const metaLabel = enviada
    ? mensagem.senderNome ?? nomeEquipe
    : exibirNomeParticipante
      ? mensagem.senderNome ?? "Participante"
      : null;
  const [anexos, setAnexos] = React.useState<
    Array<{
      id: string;
      url: string | null;
      nome: string;
      tipo: string;
      tipoNormalizado: string;
      tamanhoBytes?: number;
    }>
  >([]);

  React.useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      if (!mensagem.anexos?.length) {
        setAnexos([]);
        return;
      }

      const resultado = await Promise.all(
        mensagem.anexos.map(async (anexo, index) => {
          let signedUrl: string | null = null;
          signedUrl = obterUrlAnexo
            ? await obterUrlAnexo(anexo.storagePath)
            : null;
          const nomeFallback = anexo.storagePath.split("/").pop() ?? "arquivo";
          const nome = nomeFallback;
          return {
            id: anexo.id ?? `${index}`,
            url: signedUrl,
            nome,
            tipo: anexo.tipo,
            tipoNormalizado: normalizarTipoAnexo(anexo.tipo, nome),
            tamanhoBytes: anexo.tamanhoBytes,
          };
        })
      );

      if (ativo) {
        setAnexos(resultado);
      }
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, [mensagem.anexos, mensagem.conteudo, obterUrlAnexo]);

  const anexosImagem = anexos.filter(
    (anexo) => anexo.tipoNormalizado === "imagem"
  );
  const anexosVideo = anexos.filter(
    (anexo) => anexo.tipoNormalizado === "video"
  );
  const anexosSticker = anexos.filter(
    (anexo) => anexo.tipoNormalizado === "sticker"
  );
  const anexosAudio = anexos.filter(
    (anexo) => anexo.tipoNormalizado === "audio"
  );
  const anexosDocumentos = anexos.filter((anexo) =>
    ["documento", "arquivo"].includes(anexo.tipoNormalizado)
  );
  const conteudoEhNomeArquivo =
    anexos.length > 0 &&
    textoMensagem.length > 0 &&
    !textoMensagem.includes(" ") &&
    /\.[a-z0-9]{2,6}$/i.test(textoMensagem);
  const mostrarTexto =
    textoMensagem.length > 0 &&
    (mensagem.tipo === "texto" || !isTextoGenerico(textoMensagem)) &&
    !conteudoEhNomeArquivo;
  const somenteAudio =
    anexosAudio.length > 0 &&
    anexosImagem.length === 0 &&
    anexosVideo.length === 0 &&
    anexosSticker.length === 0 &&
    anexosDocumentos.length === 0 &&
    !mostrarTexto;
  const respostaNome = mensagem.resposta
    ? mensagem.resposta.senderNome ||
    (mensagem.resposta.autor
      ? mensagem.resposta.autor === "equipe"
        ? nomeEquipe
        : nomeContato
      : null)
    : null;
  const respostaPreview = formatarRespostaPreview(mensagem.resposta);
  const mostrarFallbackSemAnexo =
    anexos.length === 0 &&
    mensagem.tipo !== "texto" &&
    !isTextoGenerico(textoMensagem);
  const iconMap: Record<string, React.ElementType> = {
    imagem: ImageIcon,
    pdf: FileText,
    audio: Mic,
  };

  return (
    <div className={cn("flex flex-col gap-1", alinhamento)}>
      <div
        className={cn(
          "flex items-center gap-2 text-[11px] text-muted-foreground",
          enviada ? "justify-end text-right" : "justify-start",
          metaPadding
        )}
      >
        {metaLabel && (
          <span className="font-medium text-foreground/70">{metaLabel}</span>
        )}
        <span className="text-[10px] uppercase tracking-wide">
          {mensagem.horario}
        </span>
      </div>
      <div
        className={cn(
          "flex items-end gap-2",
          enviada ? "flex-row-reverse justify-start" : "justify-start"
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={avatarNome} />}
          <AvatarFallback>{iniciaisMensagem(avatarNome)}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "max-w-[85%] break-words rounded-[6px] px-3.5 py-2.5 text-[13px] leading-relaxed sm:max-w-[80%]",
            somenteAudio ? "min-w-[360px] sm:min-w-[420px]" : null,
            enviada ? "rounded-br-md" : "rounded-bl-md",
            bolha
          )}
        >
          {mensagem.resposta && (
            <div
              className={cn(
                "mb-2 rounded-md border-l-2 px-2 py-1 text-[11px]",
                enviada
                  ? "border-primary-foreground/50 bg-primary-foreground/10 text-primary-foreground/80"
                  : "border-foreground/30 bg-background/60 text-foreground/70"
              )}
            >
              {respostaNome && (
                <div className="font-medium text-foreground/80">
                  {respostaNome}
                </div>
              )}
              <div>{respostaPreview}</div>
            </div>
          )}

          {(anexosImagem.length > 0 ||
            anexosVideo.length > 0 ||
            anexosSticker.length > 0) && (
              <div className="space-y-2">
                {anexosImagem.map((anexo) =>
                  anexo.url ? (
                    <button
                      key={anexo.id}
                      type="button"
                      onClick={() =>
                        aoAbrirMidia?.({
                          tipo: "imagem",
                          url: anexo.url ?? "",
                          nome: anexo.nome,
                        })
                      }
                      className="block w-full max-w-[260px] rounded-md cursor-zoom-in"
                    >
                      <img
                        src={anexo.url}
                        alt={anexo.nome}
                        loading="lazy"
                        className="max-h-60 w-full rounded-md object-cover"
                      />
                    </button>
                  ) : (
                    <div key={anexo.id} className="text-xs">
                      Imagem indisponível
                    </div>
                  )
                )}
                {anexosVideo.map((anexo) =>
                  anexo.url ? (
                    <button
                      key={anexo.id}
                      type="button"
                      onClick={() =>
                        aoAbrirMidia?.({
                          tipo: "video",
                          url: anexo.url ?? "",
                          nome: anexo.nome,
                        })
                      }
                      className="block w-full max-w-[260px] rounded-md cursor-pointer"
                    >
                      <div className="relative overflow-hidden rounded-md bg-black">
                        <video
                          className="pointer-events-none max-h-64 w-full"
                          muted
                          playsInline
                          preload="metadata"
                        >
                          <source src={anexo.url} />
                        </video>
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
                            <Play className="h-4 w-4 text-foreground" />
                          </span>
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div key={anexo.id} className="text-xs">
                      Vídeo indisponível
                    </div>
                  )
                )}
                {anexosSticker.map((anexo) =>
                  anexo.url ? (
                    <img
                      key={anexo.id}
                      src={anexo.url}
                      alt="Sticker"
                      loading="lazy"
                      className="max-h-40 w-full max-w-[180px] object-contain"
                    />
                  ) : (
                    <div key={anexo.id} className="text-xs">
                      Sticker indisponível
                    </div>
                  )
                )}
              </div>
            )}

          {anexosAudio.length > 0 && (
            <div className="space-y-2">
              {anexosAudio.map((anexo) =>
                anexo.url ? (
                  <AudioPlayer
                    key={anexo.id}
                    src={anexo.url}
                    enviada={enviada}
                    label={anexo.nome}
                  />
                ) : (
                  <div key={anexo.id} className="text-xs">
                    Áudio indisponível
                  </div>
                )
              )}
            </div>
          )}

          {anexosDocumentos.length > 0 && (
            <div className="space-y-2 text-xs">
              {anexosDocumentos.map((anexo) => (
                <div
                  key={anexo.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border/40 px-2 py-2",
                    enviada
                      ? "bg-primary-foreground/10 text-primary-foreground"
                      : "bg-background/70 text-foreground"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  {(() => {
                    const extensao = anexo.nome.split(".").pop();
                    const rotulo =
                      anexo.tipoNormalizado === "documento"
                        ? "Documento"
                        : "Arquivo";
                    const texto = extensao
                      ? `${rotulo} ${extensao.toUpperCase()}`
                      : rotulo;
                    return anexo.url ? (
                      <a
                        href={anexo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate underline-offset-2 hover:underline"
                      >
                        {texto}
                      </a>
                    ) : (
                      <span className="truncate">{texto}</span>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}

          {mostrarTexto && (
            <p
              className={cn(
                "whitespace-pre-wrap break-words [hyphens:auto] [word-break:break-word]",
                anexos.length > 0 || mensagem.resposta ? "mt-2" : undefined
              )}
            >
              {renderTextoComLinks(mensagem.conteudo)}
            </p>
          )}

          {mostrarFallbackSemAnexo && (
            <div className="flex items-center gap-2 text-xs">
              {React.createElement(iconMap[mensagem.tipo] ?? Paperclip, {
                className: "h-4 w-4",
              })}
              <span>{mensagem.conteudo}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
