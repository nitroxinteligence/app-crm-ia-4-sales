"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronsRight,
  Clock,
  FilePlus,
  Filter,
  ListChecks,
  Pencil,
  Link2,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import type {
  RelacionamentoTarefa,
  StatusTarefa,
  TarefaCalendario,
  TipoTarefa,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const LIMITE_INICIAL = 24;
const SYNC_INTERVAL_MS = 60_000;

const tiposLabel: Record<TipoTarefa, string> = {
  ligacao: "Ligação",
  reuniao: "Reunião",
  "follow-up": "Follow-up",
  email: "Email",
  outro: "Outro",
};

const statusLabel: Record<StatusTarefa, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
};

const statusEventoLabel: Record<string, string> = {
  confirmed: "Confirmado",
  tentative: "Pendente",
  cancelled: "Cancelado",
};

const coresEvento = [
  { id: "1", label: "Lavanda", hex: "#a4bdfc" },
  { id: "2", label: "Sálvia", hex: "#7ae7bf" },
  { id: "3", label: "Uva", hex: "#dbadff" },
  { id: "4", label: "Flamingo", hex: "#ff887c" },
  { id: "5", label: "Banana", hex: "#fbd75b" },
  { id: "6", label: "Tangerina", hex: "#ffb878" },
  { id: "7", label: "Pavão", hex: "#46d6db" },
  { id: "8", label: "Grafite", hex: "#e1e1e1" },
  { id: "9", label: "Mirtilo", hex: "#5484ed" },
  { id: "10", label: "Manjericão", hex: "#51b749" },
  { id: "11", label: "Tomate", hex: "#dc2127" },
];

const periodosDisponiveis = [30, 60, 90];

const relacionamentoLabel: Record<RelacionamentoTarefa, string> = {
  lead: "Lead",
  deal: "Negócio",
  conversa: "Conversa",
  outro: "Outro",
};

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const horariosDisponiveis = Array.from({ length: 24 * 60 }, (_, index) => {
  const hora = String(Math.floor(index / 60)).padStart(2, "0");
  const minuto = String(index % 60).padStart(2, "0");
  return `${hora}:${minuto}`;
});

const formatarDataCurta = (dataISO: string) =>
  new Date(dataISO).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

const formatarDataCurtaLocal = (data: Date) =>
  data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

const formatarChaveLocal = (data: Date) => data.toLocaleDateString("en-CA");

const formatarDataInput = (data: Date) =>
  data.toLocaleDateString("en-CA");

const formatarDataSelecionada = (dataISO: string) =>
  new Date(`${dataISO}T00:00:00`).toLocaleDateString("pt-BR");

const formatarHoraLocal = (data: Date) =>
  `${String(data.getHours()).padStart(2, "0")}:${String(
    data.getMinutes()
  ).padStart(2, "0")}`;

const formatarDataLonga = (data: string | Date) => {
  const base = typeof data === "string" ? new Date(data) : data;
  return base.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatarDiaSemana = (dataISO: string) =>
  new Date(dataISO).toLocaleDateString("pt-BR", { weekday: "short" });

const formatarDiaSemanaLocal = (data: Date) =>
  data.toLocaleDateString("pt-BR", { weekday: "short" });

const formatarHoraCurta = (dataISO: string) => {
  const data = new Date(dataISO);
  return `${String(data.getHours()).padStart(2, "0")}:${String(
    data.getMinutes()
  ).padStart(2, "0")}`;
};

const obterDiaMes = (dataISO: string) => new Date(dataISO).getDate();
const obterMesAno = (dataISO: string) =>
  new Date(dataISO).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const obterCorEvento = (colorId?: string | null) =>
  coresEvento.find((cor) => cor.id === colorId)?.hex ?? null;

const hexParaRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(sanitized)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const value = parseInt(sanitized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const obterEstiloEvento = (colorId?: string | null) => {
  const cor = obterCorEvento(colorId);
  if (!cor) return undefined;
  return {
    backgroundColor: hexParaRgba(cor, 0.28),
    borderColor: hexParaRgba(cor, 0.55),
  } as React.CSSProperties;
};

const obterEstiloBordaEvento = (colorId?: string | null) => {
  const cor = obterCorEvento(colorId);
  if (!cor) return undefined;
  return { borderLeftColor: cor } as React.CSSProperties;
};

type EventoCalendario = {
  id: string;
  titulo: string;
  descricao?: string | null;
  localizacao?: string | null;
  status?: string | null;
  startAt: string;
  endAt?: string | null;
  isAllDay: boolean;
  meetLink?: string | null;
  htmlLink?: string | null;
  colorId?: string | null;
  organizer?: { email?: string; displayName?: string } | null;
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }> | null;
};

const formatarPeriodoEvento = (evento: EventoCalendario) => {
  if (evento.isAllDay) {
    return `${formatarDataLonga(evento.startAt)} · Dia inteiro`;
  }
  const data = formatarDataLonga(evento.startAt);
  const inicio = formatarHoraCurta(evento.startAt);
  const fim = evento.endAt ? formatarHoraCurta(evento.endAt) : "";
  return fim ? `${data} · ${inicio} - ${fim}` : `${data} · ${inicio}`;
};

const normalizarHorario = (valor: string) => {
  if (horariosDisponiveis.includes(valor)) return valor;
  const [hora, minuto] = valor.split(":");
  const horaNum = Number(hora);
  const minutoNum = Number(minuto);
  if (!Number.isFinite(horaNum) || !Number.isFinite(minutoNum)) {
    return "09:00";
  }
  const total = Math.min(Math.max(horaNum * 60 + minutoNum, 0), 1439);
  const horaNormalizada = String(Math.floor(total / 60)).padStart(2, "0");
  const minutoNormalizado = String(total % 60).padStart(2, "0");
  return `${horaNormalizada}:${minutoNormalizado}`;
};

type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

const DatePickerField = ({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Selecione uma data",
}: DatePickerFieldProps) => {
  const dataSelecionada = value ? new Date(`${value}T00:00:00`) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {value ? formatarDataSelecionada(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
        <Calendar
          mode="single"
          selected={dataSelecionada}
          onSelect={(date) => {
            if (!date) return;
            onChange(formatarDataInput(date));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

type TimeSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const TimeSelect = ({ id, value, onChange, disabled }: TimeSelectProps) => {
  const horarioSelecionado = normalizarHorario(value);
  return (
    <Select
      value={horarioSelecionado}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="h-9 w-full" aria-label="Horário">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
        {horariosDisponiveis.map((opcao) => (
          <SelectItem key={opcao} value={opcao}>
            {opcao}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const CalendarioMesSkeleton = () => (
  <Card>
    <CardContent className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-[6px]" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={`mes-header-${index}`} className="h-3 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton
            key={`mes-cell-${index}`}
            className="h-[112px] w-full rounded-[6px]"
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

const CalendarioSemanaSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }, (_, index) => (
      <Card key={`semana-${index}`}>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-6 w-10 rounded-[6px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-[6px]" />
            <Skeleton className="h-10 w-[90%] rounded-[6px]" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const CalendarioDiaSkeleton = () => (
  <Card>
    <CardContent className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-10 rounded-[6px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-[6px]" />
        <Skeleton className="h-12 w-[92%] rounded-[6px]" />
        <Skeleton className="h-12 w-[88%] rounded-[6px]" />
      </div>
    </CardContent>
  </Card>
);

const CalendarioPeriodoSkeleton = () => (
  <Card>
    <CardContent className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-6 w-20 rounded-[6px]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={`periodo-${index}`}
            className="space-y-3 rounded-[6px] border border-border/60 bg-background/70 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-10 rounded-[6px]" />
            </div>
            <Skeleton className="h-10 w-full rounded-[6px]" />
            <Skeleton className="h-10 w-[94%] rounded-[6px]" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const TarefasSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }, (_, index) => (
      <div
        key={`tarefa-${index}`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-background/80 p-3 text-sm"
      >
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded-[6px]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-[6px]" />
          <Skeleton className="h-5 w-16 rounded-[6px]" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-[6px]" />
          <Skeleton className="h-8 w-8 rounded-[6px]" />
        </div>
      </div>
    ))}
  </div>
);

type StatusGoogleCalendar = {
  connected: boolean;
  status?: string;
  lastSyncedAt?: string | null;
  channelExpiresAt?: string | null;
};

export function VisaoCalendario() {
  const [tarefas, setTarefas] = React.useState<TarefaCalendario[]>([]);
  const [eventos, setEventos] = React.useState<EventoCalendario[]>([]);
  const [abaAtiva, setAbaAtiva] = React.useState("mes");
  const [periodoDias, setPeriodoDias] = React.useState(60);
  const [popoverPeriodoAberto, setPopoverPeriodoAberto] = React.useState(false);
  const [carregandoEventos, setCarregandoEventos] = React.useState(false);
  const [carregandoTarefas, setCarregandoTarefas] = React.useState(false);
  const [erroEventos, setErroEventos] = React.useState<string | null>(null);
  const [erroTarefas, setErroTarefas] = React.useState<string | null>(null);
  const [statusGoogle, setStatusGoogle] = React.useState<StatusGoogleCalendar | null>(null);
  const [dialogEventoAberto, setDialogEventoAberto] = React.useState(false);
  const [eventoEditando, setEventoEditando] = React.useState<EventoCalendario | null>(null);
  const [dialogDetalheAberto, setDialogDetalheAberto] = React.useState(false);
  const [eventoSelecionado, setEventoSelecionado] =
    React.useState<EventoCalendario | null>(null);
  const [dialogCancelarAberto, setDialogCancelarAberto] = React.useState(false);
  const [eventoCancelando, setEventoCancelando] = React.useState<EventoCalendario | null>(
    null
  );
  const [novoEvento, setNovoEvento] = React.useState({
    titulo: "",
    descricao: "",
    localizacao: "",
    data: new Date().toISOString().slice(0, 10),
    horaInicio: "09:00",
    horaFim: "10:00",
    diaInteiro: false,
    corId: "padrao",
    criarMeet: false,
    removerMeet: false,
  });
  const [busca, setBusca] = React.useState("");
  const [filtroTipo, setFiltroTipo] = React.useState<TipoTarefa | "todos">(
    "todos"
  );
  const [filtroResponsavel, setFiltroResponsavel] = React.useState("todos");
  const [filtroStatus, setFiltroStatus] = React.useState<StatusTarefa | "todos">(
    "pendente"
  );
  const [limite, setLimite] = React.useState(LIMITE_INICIAL);
  const [dialogNovaAberto, setDialogNovaAberto] = React.useState(false);
  const [dialogConcluidasAberto, setDialogConcluidasAberto] = React.useState(false);
  const [tarefaEditando, setTarefaEditando] = React.useState<TarefaCalendario | null>(
    null
  );
  const [dialogExcluirTarefaAberto, setDialogExcluirTarefaAberto] =
    React.useState(false);
  const [tarefaExcluindo, setTarefaExcluindo] =
    React.useState<TarefaCalendario | null>(null);
  const [novaTarefa, setNovaTarefa] = React.useState({
    titulo: "",
    tipo: "ligacao" as TipoTarefa,
    tipoOutro: "",
    data: new Date().toISOString().slice(0, 10),
    hora: "09:00",
    responsavel: "",
    relacionamentoTipo: "nenhum" as "nenhum" | RelacionamentoTarefa,
    relacionamentoNome: "",
  });
  const [responsavelAtual, setResponsavelAtual] = React.useState<string | null>(
    null
  );
  const syncEmAndamento = React.useRef(false);

  const tarefasConcluidas = React.useMemo(() => {
    return tarefas
      .filter((tarefa) => tarefa.status === "concluida")
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [tarefas]);

  const responsaveis = React.useMemo(() => {
    const todos = new Set(tarefas.map((tarefa) => tarefa.responsavel));
    if (responsavelAtual) {
      todos.add(responsavelAtual);
    }
    return ["todos", ...Array.from(todos)];
  }, [responsavelAtual, tarefas]);

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const carregarStatusGoogle = React.useCallback(async () => {
    const token = await obterToken();
    if (!token) {
      setStatusGoogle({ connected: false, status: "desconectado" });
      return;
    }

    const response = await fetch("/api/integrations/google/status", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setStatusGoogle({ connected: false, status: "erro" });
      return;
    }

    const payload = (await response.json()) as StatusGoogleCalendar;
    setStatusGoogle(payload);
  }, [obterToken]);

  const carregarEventos = React.useCallback(async () => {
    if (!statusGoogle?.connected) {
      setEventos([]);
      setCarregandoEventos(false);
      return;
    }

    const token = await obterToken();
    if (!token) {
      setErroEventos("Sessão expirada.");
      return;
    }

    setCarregandoEventos(true);
    setErroEventos(null);

    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999);
    const fimPeriodo = new Date(agora);
    fimPeriodo.setDate(fimPeriodo.getDate() + periodoDias - 1);
    fimPeriodo.setHours(23, 59, 59, 999);
    const fim = fimPeriodo.getTime() > fimMes.getTime() ? fimPeriodo : fimMes;

    const params = new URLSearchParams({
      from: inicio.toISOString(),
      to: fim.toISOString(),
    });

    const response = await fetch(`/api/calendar/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const message = await response.text();
      setErroEventos(message || "Falha ao carregar agenda.");
      setCarregandoEventos(false);
      return;
    }

    const payload = (await response.json()) as {
      connected: boolean;
      events: EventoCalendario[];
    };

    setEventos(payload.events ?? []);
    setCarregandoEventos(false);
  }, [obterToken, periodoDias, statusGoogle?.connected]);

  const sincronizarEventos = React.useCallback(async () => {
    if (!statusGoogle?.connected || syncEmAndamento.current) return;
    const token = await obterToken();
    if (!token) return;
    syncEmAndamento.current = true;
    try {
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      syncEmAndamento.current = false;
    }
    void carregarEventos();
  }, [carregarEventos, obterToken, statusGoogle?.connected]);

  const carregarTarefas = React.useCallback(async () => {
    const token = await obterToken();
    if (!token) {
      setErroTarefas("Sessão expirada.");
      return;
    }

    setCarregandoTarefas(true);
    setErroTarefas(null);

    const response = await fetch("/api/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const message = await response.text();
      setErroTarefas(message || "Falha ao carregar tarefas.");
      setCarregandoTarefas(false);
      return;
    }

    const payload = (await response.json()) as { tasks: TarefaCalendario[] };
    setTarefas(payload.tasks ?? []);
    const responsavel = payload.tasks?.[0]?.responsavel ?? "Você";
    setResponsavelAtual(responsavel);
    setNovaTarefa((atual) => ({
      ...atual,
      responsavel: responsavel,
    }));
    setCarregandoTarefas(false);
  }, [obterToken]);

  React.useEffect(() => {
    void carregarStatusGoogle();
    void carregarTarefas();
  }, [carregarStatusGoogle, carregarTarefas]);

  React.useEffect(() => {
    void carregarEventos();
  }, [carregarEventos]);

  React.useEffect(() => {
    if (!statusGoogle?.connected) return;
    void sincronizarEventos();
    const interval = window.setInterval(() => {
      void sincronizarEventos();
    }, SYNC_INTERVAL_MS);
    const handleFocus = () => {
      void sincronizarEventos();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [statusGoogle?.connected, sincronizarEventos]);

  const handleConectarGoogle = async () => {
    setCarregandoEventos(true);
    setErroEventos(null);
    const token = await obterToken();
    if (!token) {
      setErroEventos("Sessão expirada.");
      setCarregandoEventos(false);
      return;
    }

    const response = await fetch("/api/integrations/google/connect", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const message = await response.text();
      setErroEventos(message || "Falha ao iniciar conexão.");
      setCarregandoEventos(false);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setErroEventos("URL de conexão não retornada.");
      setCarregandoEventos(false);
    }
  };

  const handleDesconectarGoogle = async () => {
    const token = await obterToken();
    if (!token) {
      setErroEventos("Sessão expirada.");
      return;
    }

    await fetch("/api/integrations/google/disconnect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    setStatusGoogle({ connected: false, status: "desconectado" });
    setEventos([]);
  };

  const handleAbrirNovoEvento = () => {
    setEventoEditando(null);
    setNovoEvento({
      titulo: "",
      descricao: "",
      localizacao: "",
      data: new Date().toISOString().slice(0, 10),
      horaInicio: "09:00",
      horaFim: "10:00",
      diaInteiro: false,
      corId: "padrao",
      criarMeet: false,
      removerMeet: false,
    });
    setDialogEventoAberto(true);
  };

  const handleEditarEvento = (evento: EventoCalendario) => {
    const dataInicio = new Date(evento.startAt);
    const dataFim = evento.endAt ? new Date(evento.endAt) : dataInicio;
    setEventoEditando(evento);
    setNovoEvento({
      titulo: evento.titulo,
      descricao: evento.descricao ?? "",
      localizacao: evento.localizacao ?? "",
      data: formatarDataInput(dataInicio),
      horaInicio: normalizarHorario(formatarHoraLocal(dataInicio)),
      horaFim: normalizarHorario(formatarHoraLocal(dataFim)),
      diaInteiro: evento.isAllDay,
      corId: evento.colorId ?? "padrao",
      criarMeet: false,
      removerMeet: false,
    });
    setDialogEventoAberto(true);
  };

  const handleAbrirDetalhesEvento = (evento: EventoCalendario) => {
    setEventoSelecionado(evento);
    setDialogDetalheAberto(true);
  };

  const handleEditarDetalhes = () => {
    if (!eventoSelecionado) return;
    setDialogDetalheAberto(false);
    handleEditarEvento(eventoSelecionado);
  };

  const handleSalvarEvento = async () => {
    if (!novoEvento.titulo.trim()) return;
    if (!novoEvento.data) {
      setErroEventos("Selecione uma data para o evento.");
      return;
    }

    const token = await obterToken();
    if (!token) {
      setErroEventos("Sessão expirada.");
      return;
    }

    const horaInicio = novoEvento.diaInteiro
      ? "00:00"
      : normalizarHorario(novoEvento.horaInicio);
    const horaFim = novoEvento.diaInteiro
      ? "00:00"
      : normalizarHorario(novoEvento.horaFim);

    const startDate = novoEvento.diaInteiro
      ? new Date(`${novoEvento.data}T00:00:00`)
      : new Date(`${novoEvento.data}T${horaInicio}:00`);
    const endDate = novoEvento.diaInteiro
      ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      : new Date(`${novoEvento.data}T${horaFim}:00`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setErroEventos("Horário inválido. Confira data e horas.");
      return;
    }

    if (!novoEvento.diaInteiro && endDate.getTime() <= startDate.getTime()) {
      setErroEventos("O horário de término precisa ser após o início.");
      return;
    }

    const startAt = startDate.toISOString();
    const endAt = endDate.toISOString();

    const payload: Record<string, unknown> = {
      titulo: novoEvento.titulo.trim(),
      descricao: novoEvento.descricao,
      localizacao: novoEvento.localizacao,
      startAt,
      endAt,
      isAllDay: novoEvento.diaInteiro,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (novoEvento.corId !== "padrao") {
      payload.colorId = novoEvento.corId;
    } else if (eventoEditando) {
      payload.colorId = null;
    }

    if (novoEvento.removerMeet) {
      payload.removerMeet = true;
    } else if (novoEvento.criarMeet) {
      payload.criarMeet = true;
    }

    const endpoint = eventoEditando
      ? `/api/calendar/events/${eventoEditando.id}`
      : "/api/calendar/events";
    const method = eventoEditando ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      setErroEventos(message || "Falha ao salvar evento.");
      return;
    }

    setDialogEventoAberto(false);
    setEventoEditando(null);
    void carregarEventos();
  };

  const handleCancelarEvento = (evento: EventoCalendario) => {
    setEventoCancelando(evento);
    setDialogCancelarAberto(true);
  };

  const handleConfirmarCancelamento = async () => {
    if (!eventoCancelando) {
      setDialogCancelarAberto(false);
      return;
    }

    const token = await obterToken();
    if (!token) {
      setErroEventos("Sessão expirada.");
      return;
    }

    const response = await fetch(`/api/calendar/events/${eventoCancelando.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const message = await response.text();
      setErroEventos(message || "Falha ao cancelar evento.");
      return;
    }

    setDialogCancelarAberto(false);
    setEventoCancelando(null);
    void carregarEventos();
  };

  const tarefasFiltradas = React.useMemo(() => {
    return tarefas.filter((tarefa) => {
      if (filtroTipo !== "todos" && tarefa.tipo !== filtroTipo) {
        return false;
      }
      if (filtroResponsavel !== "todos" && tarefa.responsavel !== filtroResponsavel) {
        return false;
      }
      if (filtroStatus !== "todos" && tarefa.status !== filtroStatus) {
        return false;
      }
      if (!busca) return true;
      const termo = busca.toLowerCase();
      return (
        tarefa.titulo.toLowerCase().includes(termo) ||
        tarefa.responsavel.toLowerCase().includes(termo) ||
        (tarefa.relacionamentoNome ?? "").toLowerCase().includes(termo) ||
        (tarefa.tipoOutro ?? "").toLowerCase().includes(termo)
      );
    });
  }, [busca, filtroResponsavel, filtroStatus, filtroTipo, tarefas]);

  const tarefasVisiveis = tarefasFiltradas.slice(0, limite);
  const temMais = tarefasFiltradas.length > tarefasVisiveis.length;

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const alvo = event.currentTarget;
      const chegouNoFim =
        alvo.scrollTop + alvo.clientHeight >= alvo.scrollHeight - 80;
      if (chegouNoFim && temMais) {
        setLimite((atual) => Math.min(atual + 20, tarefasFiltradas.length));
      }
    },
    [tarefasFiltradas.length, temMais]
  );

  const eventosPorDia = React.useMemo(() => {
    const atual = new Date();
    const mes = atual.getMonth();
    const ano = atual.getFullYear();
    const eventosOrdenados = eventos
      .filter((evento) => {
        const data = new Date(evento.startAt);
        return data.getMonth() === mes && data.getFullYear() === ano;
      })
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
    return eventosOrdenados.reduce<Record<number, EventoCalendario[]>>(
      (acc, evento) => {
        const data = new Date(evento.startAt);
        const dia = data.getDate();
        acc[dia] = acc[dia] ? [...acc[dia], evento] : [evento];
        return acc;
      },
      {}
    );
  }, [eventos]);

  const eventosSemana = React.useMemo(() => {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - hoje.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + index);
      const dataISO = data.toISOString();
      const eventosDia = eventos
        .filter((evento) => isSameDay(new Date(evento.startAt), data))
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
      return {
        dataISO,
        eventos: eventosDia,
      };
    });
  }, [eventos]);

  const eventosDiaAtual = React.useMemo(() => {
    const hoje = new Date();
    return eventos
      .filter((evento) => isSameDay(new Date(evento.startAt), hoje))
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
  }, [eventos]);

  const intervaloPeriodo = React.useMemo(() => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + periodoDias - 1);
    fim.setHours(23, 59, 59, 999);
    return { inicio, fim };
  }, [periodoDias]);

  const eventosPeriodo = React.useMemo(() => {
    const filtrados = eventos
      .filter((evento) => {
        const data = new Date(evento.startAt);
        return data >= intervaloPeriodo.inicio && data <= intervaloPeriodo.fim;
      })
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );

    const agrupados = new Map<string, EventoCalendario[]>();
    filtrados.forEach((evento) => {
      const chave = formatarChaveLocal(new Date(evento.startAt));
      const lista = agrupados.get(chave) ?? [];
      lista.push(evento);
      agrupados.set(chave, lista);
    });

    return Array.from(agrupados.entries())
      .sort(
        (a, b) =>
          new Date(`${a[0]}T00:00:00`).getTime() -
          new Date(`${b[0]}T00:00:00`).getTime()
      )
      .map(([dataISO, itens]) => ({
        dataISO,
        eventos: itens.sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
      }));
  }, [eventos, intervaloPeriodo]);

  const totalEventosPeriodo = React.useMemo(
    () =>
      eventosPeriodo.reduce((total, dia) => total + dia.eventos.length, 0),
    [eventosPeriodo]
  );

  const diasNoMes = React.useMemo(() => {
    const atual = new Date();
    return new Date(atual.getFullYear(), atual.getMonth() + 1, 0).getDate();
  }, []);

  const handleAtualizarStatusTarefa = async (
    id: string,
    novoStatus: StatusTarefa
  ) => {
    const token = await obterToken();
    if (!token) {
      setErroTarefas("Sessão expirada.");
      return;
    }

    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: novoStatus }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErroTarefas(message || "Falha ao atualizar tarefa.");
      return;
    }

    setTarefas((atual) =>
      atual.map((tarefa) =>
        tarefa.id === id ? { ...tarefa, status: novoStatus } : tarefa
      )
    );
  };

  const handleAbrirNovaTarefa = () => {
    setTarefaEditando(null);
    setNovaTarefa((atual) => ({
      ...atual,
      titulo: "",
      tipo: "ligacao",
      tipoOutro: "",
      data: new Date().toISOString().slice(0, 10),
      hora: "09:00",
      responsavel: responsavelAtual ?? responsaveis.find((item) => item !== "todos") ?? "",
      relacionamentoTipo: "nenhum",
      relacionamentoNome: "",
    }));
    setDialogNovaAberto(true);
  };

  const handleAbrirEditarTarefa = (tarefa: TarefaCalendario) => {
    const data = new Date(tarefa.data);
    const dataISO = new Date(
      data.getFullYear(),
      data.getMonth(),
      data.getDate()
    )
      .toISOString()
      .slice(0, 10);
    setTarefaEditando(tarefa);
    setNovaTarefa({
      titulo: tarefa.titulo,
      tipo: tarefa.tipo,
      tipoOutro: tarefa.tipoOutro ?? "",
      data: dataISO,
      hora: tarefa.hora || formatarHoraCurta(tarefa.data),
      responsavel: tarefa.responsavel,
      relacionamentoTipo: tarefa.relacionamentoTipo ?? "nenhum",
      relacionamentoNome: tarefa.relacionamentoNome ?? "",
    });
    setDialogNovaAberto(true);
  };

  const handleSalvarTarefa = async () => {
    if (!novaTarefa.titulo.trim()) {
      return;
    }

    const token = await obterToken();
    if (!token) {
      setErroTarefas("Sessão expirada.");
      return;
    }

    const payload = {
      titulo: novaTarefa.titulo.trim(),
      tipo: novaTarefa.tipo,
      tipoOutro: novaTarefa.tipo === "outro" ? novaTarefa.tipoOutro : "",
      data: novaTarefa.data,
      hora: novaTarefa.hora,
      relacionamentoTipo: novaTarefa.relacionamentoTipo,
      relacionamentoNome:
        novaTarefa.relacionamentoTipo !== "nenhum"
          ? novaTarefa.relacionamentoNome
          : "",
    };

    const endpoint = tarefaEditando
      ? `/api/tasks/${tarefaEditando.id}`
      : "/api/tasks";
    const method = tarefaEditando ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      setErroTarefas(message || "Falha ao salvar tarefa.");
      return;
    }

    const atualizada = (await response.json()) as TarefaCalendario;
    setTarefas((atual) =>
      tarefaEditando
        ? atual.map((tarefa) =>
            tarefa.id === atualizada.id ? atualizada : tarefa
          )
        : [atualizada, ...atual]
    );
    setTarefaEditando(null);
    setDialogNovaAberto(false);
  };

  const handleExcluirTarefa = (tarefa: TarefaCalendario) => {
    setTarefaExcluindo(tarefa);
    setDialogExcluirTarefaAberto(true);
  };

  const handleConfirmarExcluirTarefa = async () => {
    if (!tarefaExcluindo) {
      setDialogExcluirTarefaAberto(false);
      return;
    }

    const token = await obterToken();
    if (!token) {
      setErroTarefas("Sessão expirada.");
      return;
    }

    const response = await fetch(`/api/tasks/${tarefaExcluindo.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      setErroTarefas(message || "Falha ao excluir tarefa.");
      return;
    }

    setTarefas((atual) =>
      atual.filter((tarefa) => tarefa.id !== tarefaExcluindo.id)
    );
    setDialogExcluirTarefaAberto(false);
    setTarefaExcluindo(null);
  };

  const mesAtual = obterMesAno(new Date().toISOString());
  const statusGoogleTexto =
    statusGoogle?.status === "erro"
      ? "Erro"
      : statusGoogle?.connected
        ? "Conectado"
        : "Desconectado";

  const participantes = eventoSelecionado?.attendees ?? [];
  const participantesTexto = participantes
    .map((item) => item.displayName ?? item.email ?? "")
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
  const participantesRestantes =
    participantes.length > 4 ? participantes.length - 4 : 0;
  const statusEventoTexto = eventoSelecionado?.status
    ? statusEventoLabel[eventoSelecionado.status] ?? eventoSelecionado.status
    : "Não informado";

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Espelhe sua agenda do Google Calendar e organize tarefas pessoais.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {abaAtiva === "tarefas" ? (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setDialogConcluidasAberto(true)}
              >
                <ListChecks className="h-4 w-4" />
                Tarefas concluídas
                <Badge variant="secondary">{tarefasConcluidas.length}</Badge>
              </Button>
              <Button className="gap-2" onClick={handleAbrirNovaTarefa}>
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Button>
            </>
          ) : (
            <Button
              className="gap-2"
              onClick={handleAbrirNovoEvento}
              disabled={!statusGoogle?.connected}
            >
              <Plus className="h-4 w-4" />
              Novo evento
            </Button>
          )}
        </div>
      </div>

      {abaAtiva === "tarefas" ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por tarefa, responsável ou relacionamento"
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
              <DropdownMenuLabel>Filtros</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Tipo</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  <DropdownMenuRadioGroup
                    value={filtroTipo}
                    onValueChange={(valor) =>
                      setFiltroTipo(valor as TipoTarefa | "todos")
                    }
                  >
                    <DropdownMenuRadioItem value="todos">
                      Todos os tipos
                    </DropdownMenuRadioItem>
                    {Object.entries(tiposLabel).map(([valor, label]) => (
                      <DropdownMenuRadioItem key={valor} value={valor}>
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Responsável</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  <DropdownMenuRadioGroup
                    value={filtroResponsavel}
                    onValueChange={setFiltroResponsavel}
                  >
                    {responsaveis.map((responsavel) => (
                      <DropdownMenuRadioItem
                        key={responsavel}
                        value={responsavel}
                      >
                        {responsavel === "todos" ? "Todos" : responsavel}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  <DropdownMenuRadioGroup
                    value={filtroStatus}
                    onValueChange={(valor) =>
                      setFiltroStatus(valor as StatusTarefa | "todos")
                    }
                  >
                    <DropdownMenuRadioItem value="todos">
                      Todos
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="pendente">
                      Pendente
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="concluida">
                      Concluída
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setFiltroTipo("todos");
                  setFiltroResponsavel("todos");
                  setFiltroStatus("todos");
                  setBusca("");
                }}
              >
                Limpar filtros
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="grid w-full max-w-xl grid-cols-5">
            <TabsTrigger value="mes">Mês</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="periodo">Período</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          </TabsList>
          <Popover
            open={popoverPeriodoAberto}
            onOpenChange={setPopoverPeriodoAberto}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Período: {periodoDias} dias
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                Visualizar próximos dias
              </p>
              <div className="grid gap-1">
                {periodosDisponiveis.map((dias) => (
                  <Button
                    key={dias}
                    variant={dias === periodoDias ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      setPeriodoDias(dias);
                      setAbaAtiva("periodo");
                      setPopoverPeriodoAberto(false);
                    }}
                  >
                    {dias} dias
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <TabsContent value="mes" className="pt-4">
          {erroEventos ? (
            <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {erroEventos}
            </div>
          ) : null}
          {statusGoogle?.connected === false && !carregandoEventos ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              <span>Conecte o Google Calendar para espelhar sua agenda.</span>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleConectarGoogle}
              >
                <ChevronsRight className="h-4 w-4" />
                Conectar
              </Button>
            </div>
          ) : null}
          {carregandoEventos && eventos.length === 0 ? (
            <CalendarioMesSkeleton />
          ) : (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Mês atual</p>
                    <p className="text-xs text-muted-foreground">
                      {mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {eventos.length} eventos
                  </Badge>
                </div>
                <div className="grid grid-cols-7 gap-2 text-[11px] font-medium text-muted-foreground">
                  {diasSemana.map((dia) => (
                    <span key={dia} className="text-center">
                      {dia}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: diasNoMes }, (_, index) => {
                    const dia = index + 1;
                    const eventosDia = eventosPorDia[dia] ?? [];
                    return (
                      <div
                        key={`dia-${dia}`}
                        className={cn(
                          "flex min-h-[112px] flex-col gap-2 overflow-hidden rounded-[6px] border border-border/60 bg-background/70 p-2 text-[11px] leading-tight",
                          eventosDia.length > 0 && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {dia}
                          </span>
                          {eventosDia.length > 0 ? (
                            <span className="rounded-[6px] bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {eventosDia.length}
                            </span>
                          ) : null}
                        </div>
                        {eventosDia.length > 0 ? (
                          <div className="space-y-1">
                            {eventosDia.slice(0, 2).map((evento) => {
                              const corEvento = obterCorEvento(evento.colorId);
                              const estiloEvento = obterEstiloEvento(evento.colorId);
                              return (
                                <button
                                  key={evento.id}
                                  type="button"
                                  className="flex w-full items-center gap-1 rounded-[6px] border border-border/60 bg-background/80 px-1.5 py-1 text-[10px] text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                  style={estiloEvento}
                                  onClick={() => handleAbrirDetalhesEvento(evento)}
                                >
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-[6px]",
                                      !corEvento && "bg-primary"
                                    )}
                                    style={
                                      corEvento
                                        ? { backgroundColor: corEvento }
                                        : undefined
                                    }
                                  />
                                  <span className="truncate">
                                    {evento.isAllDay
                                      ? "Dia todo"
                                      : formatarHoraCurta(evento.startAt)}{" "}
                                    · {evento.titulo}
                                  </span>
                                </button>
                              );
                            })}
                            {eventosDia.length > 2 ? (
                              <span className="text-[10px] text-muted-foreground">
                                + {eventosDia.length - 2} outros
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="mt-auto text-[10px] text-muted-foreground">
                            Sem eventos
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="semana" className="pt-4">
          {erroEventos ? (
            <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {erroEventos}
            </div>
          ) : null}
          {carregandoEventos && eventos.length === 0 ? (
            <CalendarioSemanaSkeleton />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {eventosSemana.map((dia) => (
                <Card key={dia.dataISO}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {formatarDiaSemana(dia.dataISO)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatarDataCurta(dia.dataISO)}
                        </p>
                      </div>
                      <Badge variant="secondary">{dia.eventos.length}</Badge>
                    </div>
                    {dia.eventos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum evento previsto.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {dia.eventos.slice(0, 3).map((evento) => {
                          const corEvento = obterCorEvento(evento.colorId);
                          const estiloEvento = obterEstiloEvento(evento.colorId);
                          return (
                            <div
                              key={evento.id}
                              className="rounded-[6px] border border-border/60 bg-background/80 p-2 text-xs"
                              style={estiloEvento}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  className="flex-1 text-left"
                                  onClick={() => handleAbrirDetalhesEvento(evento)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "h-2 w-2 rounded-[6px]",
                                        !corEvento && "bg-primary"
                                      )}
                                      style={
                                        corEvento
                                          ? { backgroundColor: corEvento }
                                          : undefined
                                      }
                                    />
                                    <p className="font-medium">{evento.titulo}</p>
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {evento.isAllDay
                                      ? "Dia todo"
                                      : formatarHoraCurta(evento.startAt)}
                                  </div>
                                </button>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleEditarEvento(evento);
                                    }}
                                    aria-label="Editar evento"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleCancelarEvento(evento);
                                    }}
                                    aria-label="Cancelar evento"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {dia.eventos.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {dia.eventos.length - 3} outras
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dia" className="pt-4">
          {erroEventos ? (
            <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {erroEventos}
            </div>
          ) : null}
          {carregandoEventos && eventos.length === 0 ? (
            <CalendarioDiaSkeleton />
          ) : (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Hoje</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataLonga(new Date())}
                    </p>
                  </div>
                  <Badge variant="secondary">{eventosDiaAtual.length}</Badge>
                </div>
                {eventosDiaAtual.length === 0 ? (
                  <div className="rounded-[6px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    Nenhum evento para hoje.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventosDiaAtual.map((evento) => {
                      const corEvento = obterCorEvento(evento.colorId);
                      const estiloEvento = obterEstiloEvento(evento.colorId);
                      const estiloBorda = obterEstiloBordaEvento(evento.colorId);
                      return (
                        <div
                          key={evento.id}
                          className="flex items-start justify-between gap-3 rounded-[6px] border border-border/60 border-l-4 bg-background/80 p-3 text-sm"
                          style={{ ...estiloEvento, ...estiloBorda }}
                        >
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => handleAbrirDetalhesEvento(evento)}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-[6px]",
                                  !corEvento && "bg-primary"
                                )}
                                style={
                                  corEvento
                                    ? { backgroundColor: corEvento }
                                    : undefined
                                }
                              />
                              <p className="font-medium">{evento.titulo}</p>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {evento.isAllDay
                                ? "Dia todo"
                                : formatarHoraCurta(evento.startAt)}
                              {evento.localizacao ? (
                                <span>• {evento.localizacao}</span>
                              ) : null}
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditarEvento(evento);
                              }}
                              aria-label="Editar evento"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCancelarEvento(evento);
                              }}
                              aria-label="Cancelar evento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="periodo" className="pt-4">
          {erroEventos ? (
            <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {erroEventos}
            </div>
          ) : null}
          {carregandoEventos && eventos.length === 0 ? (
            <CalendarioPeriodoSkeleton />
          ) : (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Próximos {periodoDias} dias
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataCurtaLocal(intervaloPeriodo.inicio)} até{" "}
                      {formatarDataCurtaLocal(intervaloPeriodo.fim)}
                    </p>
                  </div>
                  <Badge variant="secondary">{totalEventosPeriodo} eventos</Badge>
                </div>
                {eventosPeriodo.length === 0 ? (
                  <div className="rounded-[6px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    Nenhum evento no período selecionado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eventosPeriodo.map((dia) => {
                      const dataBase = new Date(`${dia.dataISO}T00:00:00`);
                      return (
                        <div
                          key={dia.dataISO}
                          className="space-y-3 rounded-[6px] border border-border/60 bg-background/70 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">
                                {formatarDiaSemanaLocal(dataBase)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatarDataCurtaLocal(dataBase)}
                              </p>
                            </div>
                            <Badge variant="outline">{dia.eventos.length}</Badge>
                          </div>
                          <div className="space-y-2">
                            {dia.eventos.map((evento) => {
                              const corEvento = obterCorEvento(evento.colorId);
                              const estiloEvento = obterEstiloEvento(
                                evento.colorId
                              );
                              return (
                                <div
                                  key={evento.id}
                                  className="flex items-start justify-between gap-3 rounded-[6px] border border-border/60 bg-background/80 p-3 text-sm"
                                  style={estiloEvento}
                                >
                                  <button
                                    type="button"
                                    className="flex-1 text-left"
                                    onClick={() =>
                                      handleAbrirDetalhesEvento(evento)
                                    }
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "h-2 w-2 rounded-[6px]",
                                          !corEvento && "bg-primary"
                                        )}
                                        style={
                                          corEvento
                                            ? { backgroundColor: corEvento }
                                            : undefined
                                        }
                                      />
                                      <p className="font-medium">
                                        {evento.titulo}
                                      </p>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {evento.isAllDay
                                        ? "Dia todo"
                                        : formatarHoraCurta(evento.startAt)}
                                      {evento.localizacao ? (
                                        <span>• {evento.localizacao}</span>
                                      ) : null}
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleEditarEvento(evento);
                                      }}
                                      aria-label="Editar evento"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleCancelarEvento(evento);
                                      }}
                                      aria-label="Cancelar evento"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tarefas" className="pt-4">
          <Card>
            <CardContent className="p-4">
              {erroTarefas ? (
                <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {erroTarefas}
                </div>
              ) : null}
              <div
                className="max-h-[520px] space-y-3 overflow-auto"
                onScroll={handleScroll}
              >
                {carregandoTarefas && tarefasVisiveis.length === 0 ? (
                  <TarefasSkeleton />
                ) : tarefasVisiveis.length === 0 ? (
                  <div className="rounded-[6px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    Nenhuma tarefa encontrada.
                  </div>
                ) : (
                  tarefasVisiveis.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-background/80 p-3 text-sm"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={tarefa.status === "concluida"}
                          onCheckedChange={() =>
                            handleAtualizarStatusTarefa(
                              tarefa.id,
                              tarefa.status === "pendente" ? "concluida" : "pendente"
                            )
                          }
                          aria-label={`Concluir tarefa ${tarefa.titulo}`}
                        />
                        <div>
                          <p
                            className={cn(
                              "font-medium",
                              tarefa.status === "concluida" &&
                                "text-muted-foreground line-through"
                            )}
                          >
                            {tarefa.titulo}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatarDataCurta(tarefa.data)}</span>
                            <span>{formatarHoraCurta(tarefa.data)}</span>
                            <span>{tarefa.responsavel}</span>
                            {tarefa.relacionamentoTipo && (
                              <span className="flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                {relacionamentoLabel[tarefa.relacionamentoTipo]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                          {tarefa.tipo === "outro"
                            ? tarefa.tipoOutro ?? "Outro"
                            : tiposLabel[tarefa.tipo]}
                        </Badge>
                        <Badge variant="outline">
                          {statusLabel[tarefa.status]}
                        </Badge>
                        {tarefa.criadoPor === "agente" && (
                          <Badge variant="outline">Criado por agente</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleAbrirEditarTarefa(tarefa)}
                          aria-label="Editar tarefa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleExcluirTarefa(tarefa)}
                          aria-label="Excluir tarefa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                {temMais && (
                  <p className="text-center text-xs text-muted-foreground">
                    Carregando mais tarefas...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Integrações</p>
                <p className="text-xs text-muted-foreground">
                  Conecte o Google Calendar para espelhar a agenda.
                </p>
              </div>
              <Badge variant="outline">1 disponível</Badge>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-background/70 p-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    {statusGoogleTexto}
                  </p>
                </div>
                {statusGoogle?.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleDesconectarGoogle}
                  >
                    <ChevronsRight className="h-4 w-4" />
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleConectarGoogle}
                  >
                    <ChevronsRight className="h-4 w-4" />
                    Conectar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Resumo rápido</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pendentes</span>
                <span>
                  {tarefas.filter((tarefa) => tarefa.status === "pendente").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Concluídas</span>
                <span>
                  {tarefas.filter((tarefa) => tarefa.status === "concluida").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Responsáveis</span>
                <span>{responsaveis.length - 1}</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FilePlus className="h-4 w-4" />
              Tarefas são pessoais e visíveis apenas para você.
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogDetalheAberto}
        onOpenChange={(open) => {
          setDialogDetalheAberto(open);
          if (!open) {
            setEventoSelecionado(null);
          }
        }}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>{eventoSelecionado?.titulo ?? "Evento"}</DialogTitle>
            <DialogDescription>
              Detalhes completos do evento sincronizado.
            </DialogDescription>
          </DialogHeader>
          {eventoSelecionado ? (
            <div className="grid gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Data e horário</p>
                <p className="font-medium">
                  {formatarPeriodoEvento(eventoSelecionado)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Local</p>
                  <p className="font-medium">
                    {eventoSelecionado.localizacao ||
                      (eventoSelecionado.meetLink ? "Google Meet" : "Não informado")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">{statusEventoTexto}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="font-medium">
                  {eventoSelecionado.descricao?.trim() || "Sem descrição"}
                </p>
              </div>
              {eventoSelecionado.organizer ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Organizador</p>
                  <p className="font-medium">
                    {eventoSelecionado.organizer.displayName ||
                      eventoSelecionado.organizer.email}
                  </p>
                </div>
              ) : null}
              {participantes.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Participantes</p>
                  <p className="font-medium">
                    {participantesTexto}
                    {participantesRestantes > 0
                      ? ` +${participantesRestantes}`
                      : ""}
                  </p>
                </div>
              ) : null}
              {(eventoSelecionado.meetLink || eventoSelecionado.htmlLink) ? (
                <div className="flex flex-wrap gap-2">
                  {eventoSelecionado.meetLink ? (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a
                        href={eventoSelecionado.meetLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Link2 className="h-4 w-4" />
                        Link do Meet
                      </a>
                    </Button>
                  ) : null}
                  {eventoSelecionado.htmlLink ? (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a
                        href={eventoSelecionado.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Link2 className="h-4 w-4" />
                        Abrir no Google Calendar
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogDetalheAberto(false)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!eventoSelecionado) return;
                setDialogDetalheAberto(false);
                handleCancelarEvento(eventoSelecionado);
              }}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir evento
            </Button>
            <Button onClick={handleEditarDetalhes} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogEventoAberto} onOpenChange={setDialogEventoAberto}>
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>
              {eventoEditando ? "Editar evento" : "Novo evento"}
            </DialogTitle>
            <DialogDescription>
              Crie ou edite um evento direto no Google Calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label htmlFor="evento-titulo" className="text-sm font-medium">
                Título
              </label>
              <Input
                id="evento-titulo"
                value={novoEvento.titulo}
                onChange={(event) =>
                  setNovoEvento((atual) => ({
                    ...atual,
                    titulo: event.target.value,
                  }))
                }
                placeholder="Ex: Reunião com cliente"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="evento-localizacao" className="text-sm font-medium">
                Local
              </label>
              <Input
                id="evento-localizacao"
                value={novoEvento.localizacao}
                onChange={(event) =>
                  setNovoEvento((atual) => ({
                    ...atual,
                    localizacao: event.target.value,
                  }))
                }
                placeholder="Ex: Google Meet"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Cor do evento</label>
              <Select
                value={novoEvento.corId}
                onValueChange={(valor) =>
                  setNovoEvento((atual) => ({
                    ...atual,
                    corId: valor,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Padrão" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  <SelectItem value="padrao">Padrão</SelectItem>
                  {coresEvento.map((cor) => (
                    <SelectItem key={cor.id} value={cor.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-[6px]"
                          style={{ backgroundColor: cor.hex }}
                        />
                        {cor.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!eventoEditando || !eventoEditando.meetLink ? (
              <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Adicionar Google Meet</p>
                  <p className="text-xs text-muted-foreground">
                    Gera automaticamente o link da reunião.
                  </p>
                </div>
                <Switch
                  checked={novoEvento.criarMeet}
                  onCheckedChange={(checked) =>
                    setNovoEvento((atual) => ({
                      ...atual,
                      criarMeet: checked,
                      removerMeet: false,
                    }))
                  }
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Google Meet ativo</p>
                  <p className="text-xs text-muted-foreground">
                    {novoEvento.removerMeet
                      ? "Será removido ao salvar."
                      : "Link da reunião existente."}
                  </p>
                </div>
                <Switch
                  checked={novoEvento.removerMeet}
                  onCheckedChange={(checked) =>
                    setNovoEvento((atual) => ({
                      ...atual,
                      removerMeet: checked,
                      criarMeet: false,
                    }))
                  }
                />
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <label htmlFor="evento-data" className="text-sm font-medium">
                  Data
                </label>
                <DatePickerField
                  id="evento-data"
                  value={novoEvento.data}
                  onChange={(value) =>
                    setNovoEvento((atual) => ({
                      ...atual,
                      data: value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="evento-hora-inicio" className="text-sm font-medium">
                  Início
                </label>
                <TimeSelect
                  id="evento-hora-inicio"
                  value={novoEvento.horaInicio}
                  onChange={(value) =>
                    setNovoEvento((atual) => ({
                      ...atual,
                      horaInicio: value,
                    }))
                  }
                  disabled={novoEvento.diaInteiro}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="evento-hora-fim" className="text-sm font-medium">
                  Fim
                </label>
                <TimeSelect
                  id="evento-hora-fim"
                  value={novoEvento.horaFim}
                  onChange={(value) =>
                    setNovoEvento((atual) => ({
                      ...atual,
                      horaFim: value,
                    }))
                  }
                  disabled={novoEvento.diaInteiro}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Dia inteiro</p>
                <p className="text-xs text-muted-foreground">
                  Remove horários e agenda o dia todo.
                </p>
              </div>
              <Switch
                checked={novoEvento.diaInteiro}
                onCheckedChange={(checked) =>
                  setNovoEvento((atual) => ({
                    ...atual,
                    diaInteiro: checked,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="evento-descricao" className="text-sm font-medium">
                Descrição
              </label>
              <Textarea
                id="evento-descricao"
                value={novoEvento.descricao}
                onChange={(event) =>
                  setNovoEvento((atual) => ({
                    ...atual,
                    descricao: event.target.value,
                  }))
                }
                placeholder="Notas adicionais para o evento"
                className="min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogEventoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEvento}>
              {eventoEditando ? "Salvar alterações" : "Agendar evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogCancelarAberto}
        onOpenChange={(open) => {
          setDialogCancelarAberto(open);
          if (!open) {
            setEventoCancelando(null);
          }
        }}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Cancelar evento</DialogTitle>
            <DialogDescription>
              Este evento será removido do Google Calendar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogCancelarAberto(false)}
            >
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarCancelamento}>
              Cancelar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogNovaAberto} onOpenChange={setDialogNovaAberto}>
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>
              {tarefaEditando ? "Editar tarefa" : "Nova tarefa"}
            </DialogTitle>
            <DialogDescription>
              {tarefaEditando
                ? "Atualize as informações da sua tarefa."
                : "Crie uma tarefa manual e associe a um relacionamento opcional."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label htmlFor="tarefa-titulo" className="text-sm font-medium">
                Título
              </label>
              <Input
                id="tarefa-titulo"
                value={novaTarefa.titulo}
                onChange={(event) =>
                  setNovaTarefa((atual) => ({
                    ...atual,
                    titulo: event.target.value,
                  }))
                }
                placeholder="Ex: Reunião de alinhamento"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={novaTarefa.tipo}
                onValueChange={(valor) =>
                  setNovaTarefa((atual) => ({
                    ...atual,
                    tipo: valor as TipoTarefa,
                    tipoOutro: valor === "outro" ? atual.tipoOutro : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  {Object.entries(tiposLabel).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {novaTarefa.tipo === "outro" ? (
              <div className="grid gap-2">
                <label htmlFor="tarefa-tipo-outro" className="text-sm font-medium">
                  Qual tipo?
                </label>
                <Input
                  id="tarefa-tipo-outro"
                  value={novaTarefa.tipoOutro}
                  onChange={(event) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      tipoOutro: event.target.value,
                    }))
                  }
                  placeholder="Ex: Visita técnica"
                />
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="tarefa-data" className="text-sm font-medium">
                  Data
                </label>
                <DatePickerField
                  id="tarefa-data"
                  value={novaTarefa.data}
                  onChange={(value) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      data: value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="tarefa-hora" className="text-sm font-medium">
                  Hora
                </label>
                <TimeSelect
                  id="tarefa-hora"
                  value={novaTarefa.hora}
                  onChange={(value) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      hora: value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Responsável</label>
              <Input
                value={responsavelAtual ?? novaTarefa.responsavel}
                placeholder="Seu usuário"
                disabled
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Relacionamento</label>
                <Select
                  value={novaTarefa.relacionamentoTipo}
                  onValueChange={(valor) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      relacionamentoTipo: valor as "nenhum" | RelacionamentoTarefa,
                      relacionamentoNome: valor === "nenhum" ? "" : atual.relacionamentoNome,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem relacionamento" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    <SelectItem value="nenhum">Sem relacionamento</SelectItem>
                    {Object.entries(relacionamentoLabel).map(([valor, label]) => (
                      <SelectItem key={valor} value={valor}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {novaTarefa.relacionamentoTipo !== "nenhum" ? (
                <div className="grid gap-2">
                  <label
                    htmlFor="tarefa-relacionamento"
                    className="text-sm font-medium"
                  >
                    {novaTarefa.relacionamentoTipo === "outro"
                      ? "Qual relacionamento?"
                      : "Nome do relacionamento"}
                  </label>
                  <Input
                    id="tarefa-relacionamento"
                    value={novaTarefa.relacionamentoNome}
                    onChange={(event) =>
                      setNovaTarefa((atual) => ({
                        ...atual,
                        relacionamentoNome: event.target.value,
                      }))
                    }
                    placeholder={
                      novaTarefa.relacionamentoTipo === "outro"
                        ? "Ex: Parceiro externo"
                        : "Ex: Ana Carvalho"
                    }
                  />
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Criado por agente</p>
                <p className="text-xs text-muted-foreground">
                  Bloqueado na versão atual.
                </p>
              </div>
              <Switch disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogNovaAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarTarefa}>
              {tarefaEditando ? "Salvar alterações" : "Salvar tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogConcluidasAberto}
        onOpenChange={setDialogConcluidasAberto}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Tarefas concluídas</DialogTitle>
            <DialogDescription>
              Visualize, edite ou reabra tarefas finalizadas.
            </DialogDescription>
          </DialogHeader>
          {tarefasConcluidas.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              Nenhuma tarefa concluída ainda.
            </div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
              {tarefasConcluidas.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-background/80 p-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{tarefa.titulo}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatarDataCurta(tarefa.data)}</span>
                      <span>{formatarHoraCurta(tarefa.data)}</span>
                      {tarefa.relacionamentoTipo ? (
                        <span className="flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          {relacionamentoLabel[tarefa.relacionamentoTipo]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setDialogConcluidasAberto(false);
                            handleAbrirEditarTarefa(tarefa);
                          }}
                          aria-label="Editar tarefa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-[6px] shadow-none">Editar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleAtualizarStatusTarefa(tarefa.id, "pendente")
                          }
                          aria-label="Reabrir tarefa"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-[6px] shadow-none">Reabrir</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleExcluirTarefa(tarefa)}
                          aria-label="Excluir tarefa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-[6px] shadow-none">Excluir</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogConcluidasAberto(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogExcluirTarefaAberto}
        onOpenChange={(open) => {
          setDialogExcluirTarefaAberto(open);
          if (!open) {
            setTarefaExcluindo(null);
          }
        }}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogExcluirTarefaAberto(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarExcluirTarefa}>
              Excluir tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
