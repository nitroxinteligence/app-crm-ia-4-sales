"use client";

import * as React from "react";
import {
  Calendar,
  FileAudio,
  FileText,
  Hash,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Type,
} from "lucide-react";
import { texto } from "@/lib/idioma";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { supabaseClient } from "@/lib/supabase/client";
import { uploadFileToR2 } from "@/lib/r2/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type QuickReplyItem = {
  id: string;
  titulo: string;
  atalho?: string | null;
  conteudo: string;
  media?: QuickReplyMedia;
};

type VariavelItem = {
  id: string;
  label: string;
  token: string;
  icon: React.ElementType;
};

const variaveisLead: Array<{ id: string; titulo: string; itens: VariavelItem[] }> = [
  {
    id: "lead",
    titulo: "Campos do lead",
    itens: [
      { id: "lead-id", label: "ID do lead", token: "{{lead.id}}", icon: Hash },
      { id: "lead-nome", label: "Nome do lead", token: "{{lead.nome}}", icon: Type },
      { id: "lead-primeiro", label: "Primeiro nome do lead", token: "{{lead.primeiro_nome}}", icon: Type },
      { id: "lead-cep", label: "CEP do lead", token: "{{lead.cep}}", icon: Type },
      { id: "lead-endereco", label: "Endereço do lead", token: "{{lead.endereco}}", icon: Type },
      { id: "lead-bairro", label: "Bairro do lead", token: "{{lead.bairro}}", icon: Type },
      { id: "lead-cidade", label: "Cidade do lead", token: "{{lead.cidade}}", icon: Type },
      { id: "lead-complemento", label: "Complemento do lead", token: "{{lead.complemento}}", icon: Type },
      { id: "lead-estado", label: "Estado do lead", token: "{{lead.estado}}", icon: Type },
    ],
  },
  {
    id: "lead-extra",
    titulo: "Campos adicionais do lead",
    itens: [
      { id: "lead-empresa", label: "Empresa do lead", token: "{{lead.empresa}}", icon: Type },
      { id: "lead-email", label: "Email do lead", token: "{{lead.email}}", icon: Type },
      { id: "lead-telefone", label: "Telefone do lead", token: "{{lead.telefone}}", icon: Type },
      { id: "lead-cpfcnpj", label: "CPF/CNPJ do lead", token: "{{lead.cpf_cnpj}}", icon: Type },
      { id: "lead-site", label: "Site do lead", token: "{{lead.site}}", icon: Type },
      { id: "lead-notas", label: "Notas do lead", token: "{{lead.notas}}", icon: Type },
      { id: "lead-atendente", label: "Atendente do lead", token: "{{lead.atendente}}", icon: Type },
      { id: "lead-instagram", label: "Nome do Instagram", token: "{{lead.instagram}}", icon: Type },
      { id: "lead-origem", label: "Origem do lead", token: "{{lead.origem}}", icon: Type },
      { id: "lead-nascimento", label: "Data de nascimento", token: "{{lead.data_nascimento}}", icon: Calendar },
    ],
  },
];

type QuickReplyMediaFile = {
  id?: string;
  tipo: string;
  nome: string;
  mimeType?: string;
  tamanhoBytes?: number;
  storagePath: string;
  ordem?: number;
};

type QuickReplyMedia = {
  anexos?: QuickReplyMediaFile[];
  audio?: QuickReplyMediaFile | null;
};

const carregarQuickReplies = async (token: string) => {
  const response = await fetch("/api/inbox/quick-replies", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const detalhe = await response.text();
    throw new Error(detalhe || "Falha ao carregar respostas rápidas.");
  }
  const payload = (await response.json()) as { quickReplies?: QuickReplyItem[] };
  return payload.quickReplies ?? [];
};

export function VisaoRespostasRapidasConfiguracoes() {
  const { idioma, workspace } = useAutenticacao();
  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );
  const [busca, setBusca] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [dialogExcluir, setDialogExcluir] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [respostas, setRespostas] = React.useState<QuickReplyItem[]>([]);
  const [respostaExcluir, setRespostaExcluir] =
    React.useState<QuickReplyItem | null>(null);
  const [formTitulo, setFormTitulo] = React.useState("");
  const [formAtalho, setFormAtalho] = React.useState("");
  const [formConteudo, setFormConteudo] = React.useState("");
  const [tipoResposta, setTipoResposta] = React.useState<"texto" | "audio">("texto");
  const [anexos, setAnexos] = React.useState<File[]>([]);
  const [audio, setAudio] = React.useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = React.useState<string | null>(
    null
  );
  const [gravandoAudio, setGravandoAudio] = React.useState(false);
  const [respostaEmEdicao, setRespostaEmEdicao] = React.useState<QuickReplyItem | null>(null);
  const [buscaVariavel, setBuscaVariavel] = React.useState("");
  const [grupoVariavel, setGrupoVariavel] = React.useState(variaveisLead[0]?.id ?? "");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const tiposArquivosAceitos = React.useMemo(
    () => [
      "image/*",
      "video/*",
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    []
  );

  const respostasFiltradas = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return respostas;
    return respostas.filter((item) => {
      return (
        item.titulo.toLowerCase().includes(termo) ||
        item.conteudo.toLowerCase().includes(termo) ||
        (item.atalho ?? "").toLowerCase().includes(termo)
      );
    });
  }, [busca, respostas]);

  const atalhoNormalizado = formAtalho.trim();
  const atalhoValido = /^\/\S+$/.test(atalhoNormalizado);

  const variaveisFiltradas = React.useMemo(() => {
    const termo = buscaVariavel.trim().toLowerCase();
    const grupo = variaveisLead.find((item) => item.id === grupoVariavel);
    if (!grupo) return [];
    if (!termo) return grupo.itens;
    return grupo.itens.filter((item) =>
      item.label.toLowerCase().includes(termo)
    );
  }, [buscaVariavel, grupoVariavel]);

  const inserirVariavel = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormConteudo((atual) => `${atual}${token}`);
      return;
    }
    const start = textarea.selectionStart ?? formConteudo.length;
    const end = textarea.selectionEnd ?? formConteudo.length;
    const novo =
      formConteudo.slice(0, start) + token + formConteudo.slice(end);
    setFormConteudo(novo);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + token.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const carregar = React.useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setCarregando(false);
      return;
    }
    try {
      const lista = await carregarQuickReplies(token);
      setRespostas(lista);
    } catch (error) {
      setErro((error as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [t]);

  React.useEffect(() => {
    void carregar();
  }, [carregar]);

  React.useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  React.useEffect(() => {
    if (tipoResposta === "audio") {
      setAnexos([]);
      return;
    }
    if (tipoResposta === "texto") {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      setAudioPreviewUrl(null);
      setAudio(null);
      setGravandoAudio(false);
    }
  }, [tipoResposta]);

  const handleSelecionarArquivos = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    const allowedMimes = new Set(
      tiposArquivosAceitos.filter((item) => !item.endsWith("/*"))
    );
    const allowedExt = new Set(["pdf", "csv", "xls", "xlsx", "doc", "docx"]);
    const aceitos: File[] = [];
    const rejeitados: File[] = [];
    files.forEach((file) => {
      const type = file.type || "";
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const permitido =
        type.startsWith("image/") ||
        type.startsWith("video/") ||
        allowedMimes.has(type) ||
        allowedExt.has(ext);
      if (permitido) {
        aceitos.push(file);
      } else {
        rejeitados.push(file);
      }
    });
    if (rejeitados.length) {
      setErro(
        t(
          "Alguns arquivos foram ignorados. Tipos permitidos: imagens, vídeos, PDF, CSV, Excel, Word.",
          "Some files were ignored. Allowed: images, videos, PDF, CSV, Excel, Word."
        )
      );
    } else {
      setErro(null);
    }
    if (aceitos.length) {
      setAnexos((atual) => [...(atual ?? []), ...aceitos]);
    }
  };

  const iniciarGravacao = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStreamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        audioChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type });
      setAudio(file);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      setAudioPreviewUrl(URL.createObjectURL(file));
      stream.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    };
    recorder.start();
    setGravandoAudio(true);
  };

  const pararGravacao = () => {
    mediaRecorderRef.current?.stop();
    setGravandoAudio(false);
  };

  const limparFormulario = () => {
    setFormTitulo("");
    setFormAtalho("");
    setFormConteudo("");
    setTipoResposta("texto");
    setAnexos([]);
    setAudio(null);
    setGravandoAudio(false);
    setAudioPreviewUrl(null);
    setRespostaEmEdicao(null);
  };

  const abrirEditar = (item: QuickReplyItem) => {
    setRespostaEmEdicao(item);
    setFormTitulo(item.titulo);
    setFormAtalho(item.atalho ?? "");
    setFormConteudo(item.conteudo);

    // Check if it's audio (basic check based on content or media)
    const hasAudio = item.media?.audio;
    setTipoResposta(hasAudio ? "audio" : "texto");

    // Note: We cannot easily restore file inputs or audio blobs from URLs for re-upload
    // So for now, editing media might be limited or require re-uploading if changing
    // But basic text editing should work fine.

    setDialogAberto(true);
  };

  const handleSalvar = async () => {
    if (!formTitulo.trim() || (tipoResposta !== "audio" && !formConteudo.trim())) {
      setErro(t("Preencha nome e conteúdo.", "Fill name and content."));
      return;
    }
    if (!atalhoValido) {
      setErro(
        t(
          "Informe um atalho válido começando com /, sem espaços.",
          "Provide a valid shortcut starting with / and no spaces."
        )
      );
      return;
    }
    if (tipoResposta === "audio" && !audio) {
      setErro(t("Grave um áudio antes de salvar.", "Record an audio first."));
      return;
    }
    if (!workspace.id) {
      setErro(t("Workspace não encontrado.", "Workspace not found."));
      return;
    }
    setErro(null);
    setSalvando(true);
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setSalvando(false);
      return;
    }
    const conteudoFinal = tipoResposta === "audio" ? "Áudio" : formConteudo.trim();

    if (respostaEmEdicao) {
      // UPDATE (PUT)
      const response = await fetch("/api/inbox/quick-replies", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: respostaEmEdicao.id,
          titulo: formTitulo.trim(),
          atalho: atalhoNormalizado,
          conteudo: conteudoFinal,
        }),
      });

      if (!response.ok) {
        const detalhe = await response.text();
        setErro(detalhe || t("Falha ao atualizar resposta rápida.", "Failed to update."));
        setSalvando(false);
        return;
      }

      // Update local state directly
      const payload = (await response.json()) as { quickReply?: QuickReplyItem };
      if (payload.quickReply) {
        setRespostas((atual) =>
          atual.map(r => r.id === payload.quickReply!.id ? payload.quickReply! : r)
        );
        limparFormulario();
        setDialogAberto(false);
      }
      setSalvando(false);
      return;
    }

    // CREATE (POST)
    const response = await fetch("/api/inbox/quick-replies", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titulo: formTitulo.trim(),
        atalho: atalhoNormalizado,
        conteudo: conteudoFinal,
      }),
    });
    if (!response.ok) {
      const detalhe = await response.text();
      setErro(detalhe || t("Falha ao salvar resposta rápida.", "Failed to save."));
      setSalvando(false);
      return;
    }
    const payload = (await response.json()) as { quickReply?: QuickReplyItem };
    if (payload.quickReply) {
      const replyId = payload.quickReply.id;
      const mediaUploads: Array<{
        tipo: string;
        nome: string;
        mimeType?: string;
        tamanhoBytes?: number;
        storagePath: string;
        ordem?: number;
      }> = [];

      const normalizeTipo = (file: File, isAudio = false) => {
        if (isAudio || file.type.startsWith("audio")) return "audio";
        if (file.type.startsWith("image")) return "imagem";
        if (file.type.startsWith("video")) return "video";
        if (file.type.includes("pdf")) return "documento";
        return "arquivo";
      };

      try {
        const uploadTasks: Promise<void>[] = [];
        if (tipoResposta !== "audio") {
          anexos.forEach((file, index) => {
            const storagePath = `${workspace.id}/quick-replies/${replyId}/${crypto.randomUUID()}-${file.name}`;
            mediaUploads.push({
              tipo: normalizeTipo(file),
              nome: file.name,
              mimeType: file.type || undefined,
              tamanhoBytes: file.size || undefined,
              storagePath,
              ordem: index,
            });
            uploadTasks.push(
              uploadFileToR2({
                token,
                bucket: "inbox-attachments",
                key: storagePath,
                file,
              })
            );
          });
        }

        if (audio) {
          const storagePath = `${workspace.id}/quick-replies/${replyId}/${crypto.randomUUID()}-${audio.name}`;
          mediaUploads.push({
            tipo: "audio",
            nome: audio.name,
            mimeType: audio.type || undefined,
            tamanhoBytes: audio.size || undefined,
            storagePath,
            ordem: 0,
          });
          uploadTasks.push(
            uploadFileToR2({
              token,
              bucket: "inbox-attachments",
              key: storagePath,
              file: audio,
            })
          );
        }

        if (uploadTasks.length) {
          await Promise.all(uploadTasks);
          const mediaResponse = await fetch("/api/inbox/quick-replies/media", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quickReplyId: replyId,
              items: mediaUploads,
            }),
          });
          if (!mediaResponse.ok) {
            const detalhe = await mediaResponse.text();
            throw new Error(
              detalhe || t("Falha ao salvar anexos.", "Failed to save media.")
            );
          }
        }

        await carregar();
        limparFormulario();
        setDialogAberto(false);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : t("Falha ao salvar anexos.", "Failed to save media.")
        );
      }
    }
    setSalvando(false);
  };

  const abrirExcluir = (item: QuickReplyItem) => {
    setRespostaExcluir(item);
    setDialogExcluir(true);
  };

  const handleExcluir = async () => {
    if (!respostaExcluir) return;
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/inbox/quick-replies", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: respostaExcluir.id }),
    });
    if (response.ok) {
      setRespostas((atual) =>
        atual.filter((item) => item.id !== respostaExcluir.id)
      );
      setDialogExcluir(false);
      setRespostaExcluir(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Respostas rápidas</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Crie respostas rápidas para usar no inbox com /.",
              "Create quick replies to use in the inbox with /."
            )}
          </p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <Plus className="h-4 w-4" />
          Criar
        </Button>
      </div>

      <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-white dark:bg-neutral-950 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Pesquisar..."
                className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {respostasFiltradas.length} resultados
            </span>
          </div>

          <div className="space-y-3">
            {carregando && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`quick-reply-skeleton-${index}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-white dark:bg-neutral-950 px-4 py-3"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
              </div>
            )}
            {!carregando && respostasFiltradas.length === 0 && (
              <div className="rounded-md border border-dashed border-border/60 p-6 text-sm text-muted-foreground bg-white dark:bg-neutral-950">
                {t("Nenhuma resposta rápida cadastrada.", "No quick replies yet.")}
              </div>
            )}
            {respostasFiltradas.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-white dark:bg-neutral-950 px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{item.titulo}</p>
                    {item.atalho && (
                      <span className="text-[11px] text-muted-foreground">
                        {item.atalho}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.conteudo}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => abrirEditar(item)}
                          aria-label="Editar resposta rápida"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => abrirExcluir(item)}
                          aria-label="Excluir resposta rápida"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={(open) => {
        setDialogAberto(open);
        if (!open) limparFormulario();
      }}>
        <DialogContent className="max-w-3xl p-0">
          <div className="flex max-h-[85vh] flex-col overflow-hidden">
            <DialogHeader className="border-b border-border/60 px-6 py-4">
              <DialogTitle>{respostaEmEdicao ? "Editar resposta rápida" : "Nova resposta rápida"}</DialogTitle>
              <DialogDescription>
                {respostaEmEdicao ? "Edite os detalhes da sua resposta." : "Crie respostas reutilizáveis com textos e mídias."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Nome</label>
                    <Input
                      value={formTitulo}
                      onChange={(event) => setFormTitulo(event.target.value)}
                      placeholder="Nova mensagem"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Atalho</label>
                    <Input
                      value={formAtalho}
                      onChange={(event) => setFormAtalho(event.target.value)}
                      placeholder="/exemplo"
                    />
                    <p
                      className={`text-[11px] ${atalhoNormalizado.length > 0 && !atalhoValido
                        ? "text-destructive"
                        : "text-muted-foreground"
                        }`}
                    >
                      Use / seguido do atalho, sem espaços. Ex: /boas-vindas
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Tabs
                      value={tipoResposta}
                      onValueChange={(valor) =>
                        setTipoResposta(valor as "texto" | "audio")
                      }
                    >
                      <TabsList>
                        <TabsTrigger value="texto">Texto</TabsTrigger>
                        <TabsTrigger value="audio">Áudio</TabsTrigger>
                      </TabsList>
                      <TabsContent value="audio" className="mt-3 space-y-3">
                        <p className="text-[11px] text-muted-foreground">
                          Áudio não permite mensagem nem arquivos adicionais.
                        </p>
                        {!gravandoAudio && !audio && (
                          <Button variant="outline" size="sm" onClick={iniciarGravacao}>
                            <Mic className="mr-2 h-4 w-4" />
                            Gravar áudio
                          </Button>
                        )}

                        {gravandoAudio && (
                          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <span>Gravando áudio...</span>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={pararGravacao}
                              >
                                <FileAudio className="mr-2 h-4 w-4" />
                                Parar
                              </Button>
                            </div>
                          </div>
                        )}

                        {audio && (
                          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <audio
                                controls
                                src={audioPreviewUrl ?? ""}
                                className="h-8 w-full sm:max-w-[380px]"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (audioPreviewUrl) {
                                    URL.revokeObjectURL(audioPreviewUrl);
                                  }
                                  setAudioPreviewUrl(null);
                                  setAudio(null);
                                }}
                                aria-label="Remover áudio"
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  {tipoResposta !== "audio" && (
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Arquivos</label>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <label htmlFor="quick-reply-arquivos" className="cursor-pointer">
                            <Paperclip className="mr-2 h-4 w-4" />
                            Selecionar
                          </label>
                        </Button>
                        <input
                          id="quick-reply-arquivos"
                          type="file"
                          accept={tiposArquivosAceitos.join(",")}
                          multiple
                          className="hidden"
                          onChange={handleSelecionarArquivos}
                        />
                      </div>
                      {anexos?.length ? (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {anexos.map((arquivo, index) => (
                            <span
                              key={`${arquivo.name}-${index}`}
                              className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-1"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="max-w-[200px] truncate">
                                {arquivo.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setAnexos((atual) =>
                                    atual.filter((_, itemIndex) => itemIndex !== index)
                                  )
                                }
                                className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                                aria-label="Remover arquivo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Nenhum arquivo selecionado.
                        </p>
                      )}
                    </div>
                  )}

                  {tipoResposta !== "audio" && (
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Mensagem</label>
                      <Textarea
                        ref={textareaRef}
                        value={formConteudo}
                        onChange={(event) => setFormConteudo(event.target.value)}
                        placeholder="Crie sua nova mensagem"
                        className="min-h-[120px]"
                      />
                    </div>
                  )}
                </div>

                {tipoResposta !== "audio" && (
                  <Card className="border-border/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Expressões do lead</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        value={buscaVariavel}
                        onChange={(event) => setBuscaVariavel(event.target.value)}
                        placeholder="Pesquisar..."
                        className="h-8"
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {variaveisLead.map((grupo) => (
                            <button
                              key={grupo.id}
                              type="button"
                              onClick={() => setGrupoVariavel(grupo.id)}
                              className={`rounded-md border border-border/60 px-2 py-1 ${grupoVariavel === grupo.id
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted/30"
                                }`}
                            >
                              {grupo.titulo}
                            </button>
                          ))}
                        </div>
                        <ScrollArea className="h-[240px] pr-2">
                          <div className="space-y-1 text-xs">
                            {variaveisFiltradas.map((item) => {
                              const Icon = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => inserirVariavel(item.token)}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/40"
                                >
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span>{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {t(
                          "Essas variáveis serão preenchidas automaticamente pelo lead do WhatsApp.",
                          "These variables will be filled automatically by the WhatsApp lead."
                        )}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-4">
              <Button variant="ghost" onClick={() => setDialogAberto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={
                  salvando ||
                  !formTitulo.trim() ||
                  (tipoResposta !== "audio" && !formConteudo.trim()) ||
                  !atalhoValido ||
                  (tipoResposta === "audio" && !audio)
                }
              >
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir resposta rápida?</DialogTitle>
            <DialogDescription>
              Esta ação remove a resposta rápida e suas mídias associadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDialogExcluir(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
