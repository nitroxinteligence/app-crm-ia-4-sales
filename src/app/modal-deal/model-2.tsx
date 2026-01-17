import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetFooter,
   SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import {
   CheckCircle2,
   XCircle,
   MoreHorizontal,
   Clock,
   Phone,
   Mail,
   MessageSquare,
   Calendar,
   Pencil,
   Trash2,
   ArrowRightLeft,
   FileText,
   Paperclip,
   History,
   Tag,
   Plus,
   User,
   Building2,
   AlertCircle,
   ChevronDown
} from "lucide-react";
import { mockDeal } from "./data";

export function Model2({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
   const deal = mockDeal;

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col gap-0 border-l bg-white dark:bg-slate-950 shadow-none">

            {/* HEADER: Modern, Clean, High Hierarchy */}
            <div className="flex-none px-6 py-5 border-b border-border/60 bg-white dark:bg-slate-950 z-10">
               <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1.5">
                     <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 line-clamp-1">
                        {deal.contact.name}
                     </h2>
                     {deal.company && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <Building2 className="w-3.5 h-3.5" />
                           <span className="font-medium text-slate-700 dark:text-slate-300">{deal.company}</span>
                        </div>
                     )}
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Valor Estimado</p>
                     <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: deal.currency }).format(deal.value)}
                     </p>
                  </div>
               </div>

               {/* Toolbar: Iconic & Minimal - NO SHADOWS */}
               <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 flex gap-2">
                     <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Conversa
                     </Button>
                     <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                        <Pencil className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Editar
                     </Button>
                     <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                        <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Mover
                     </Button>
                  </div>

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 rounded-[6px] shadow-none">
                     <Trash2 className="w-4 h-4" />
                  </Button>
               </div>
            </div>

            {/* BODY: Content */}
            <ScrollArea className="flex-1 bg-white dark:bg-slate-950">
               <div className="flex flex-col min-h-full">
                  <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                     <div className="px-6 border-b border-border/60 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
                        <TabsList className="w-full justify-start h-11 p-0 bg-transparent gap-8 border-none shadow-none text-muted-foreground">
                           <TabsTrigger value="overview" className="rounded-none border-none px-0 h-11 data-[state=active]:text-primary font-medium text-sm text-muted-foreground hover:text-foreground transition-colors shadow-none bg-transparent">
                              Visão Geral
                           </TabsTrigger>
                           <TabsTrigger value="activity" className="rounded-none border-none px-0 h-11 data-[state=active]:text-primary font-medium text-sm text-muted-foreground hover:text-foreground transition-colors shadow-none bg-transparent">
                              Atividades
                           </TabsTrigger>
                           <TabsTrigger value="files" className="rounded-none border-none px-0 h-11 data-[state=active]:text-primary font-medium text-sm text-muted-foreground hover:text-foreground transition-colors shadow-none bg-transparent">
                              Arquivos <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600 dark:text-slate-400">2</span>
                           </TabsTrigger>
                        </TabsList>
                     </div>

                     {/* TAB: OVERVIEW - No Animation */}
                     <TabsContent value="overview" className="p-6 m-0 space-y-8">

                        {/* Properties Grid: Linear Style */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                           <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                 Etapa Atual
                              </label>
                              <Select defaultValue="negociacao">
                                 <SelectTrigger className="h-9 w-full bg-slate-50 dark:bg-slate-900 border-border/60 focus:ring-1 focus:ring-primary/20 shadow-none rounded-[6px]">
                                    <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent className="shadow-none border-border/60 rounded-[6px]">
                                    <SelectItem value="qualificacao">Qualificação</SelectItem>
                                    <SelectItem value="proposta">Proposta</SelectItem>
                                    <SelectItem value="negociacao">Negociação</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                 Responsável
                              </label>
                              <Select defaultValue="mateus">
                                 <SelectTrigger className="h-9 w-full bg-slate-50 dark:bg-slate-900 border-border/60 focus:ring-1 focus:ring-primary/20 shadow-none rounded-[6px]">
                                    <div className="flex items-center gap-2">
                                       <Avatar className="w-5 h-5 border border-slate-200">
                                          <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600">MM</AvatarFallback>
                                       </Avatar>
                                       <span className="text-sm truncate">Mateus M</span>
                                    </div>
                                 </SelectTrigger>
                                 <SelectContent className="shadow-none border-border/60 rounded-[6px]">
                                    <SelectItem value="mateus">Mateus M</SelectItem>
                                    <SelectItem value="roberto">Roberto S</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>

                        <Separator className="bg-border/60" />

                        {/* Contact Section: Clean List */}
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                 Contato Principal
                              </h3>
                           </div>

                           <div className="flex items-start gap-4 p-3 border border-border/60 bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group rounded-[6px] shadow-none">
                              <Avatar className="h-10 w-10 border border-slate-100 dark:border-slate-800">
                                 <AvatarFallback className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 font-medium">RS</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm text-foreground group-hover:text-blue-600 transition-colors">{deal.contact.name}</p>
                                    <Badge variant="secondary" className="text-[10px] h-5 font-normal text-muted-foreground bg-slate-100 dark:bg-slate-800 shadow-none rounded-[6px]">
                                       Decisor
                                    </Badge>
                                 </div>
                                 <p className="text-xs text-muted-foreground mb-2 truncate">{deal.contact.role}</p>

                                 <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 p-1 px-2 bg-slate-50 dark:bg-slate-800/50 rounded-[6px]">
                                       <Phone className="w-3 h-3" /> {deal.contact.phone}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 p-1 px-2 bg-slate-50 dark:bg-slate-800/50 rounded-[6px]">
                                       <Mail className="w-3 h-3" /> {deal.contact.email}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <Separator className="bg-border/60" />

                        {/* Tags: Integrated UI */}
                        <div className="space-y-3">
                           <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                              Tags
                           </h3>
                           <div className="flex flex-wrap gap-2">
                              {deal.tags.map((tag) => (
                                 <Badge key={tag.id} variant="outline" className="pl-2.5 pr-1.5 py-1 text-xs font-medium border-transparent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-none rounded-[6px]" style={{ color: tag.color, borderColor: tag.color + '30' }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                    {tag.name}
                                    <button className="ml-1 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-600">
                                       <XCircle className="w-3 h-3" />
                                    </button>
                                 </Badge>
                              ))}
                              <Button variant="outline" size="sm" className="h-7 text-xs border-dashed gap-1.5 px-3 text-muted-foreground hover:text-foreground hover:border-slate-300 shadow-none rounded-[6px]">
                                 <Plus className="w-3.5 h-3.5" /> Adicionar Tag
                              </Button>
                           </div>
                        </div>

                        <Separator className="bg-border/60" />

                        {/* Notes */}
                        <div className="space-y-3">
                           <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                              Resumo
                           </h3>
                           <div className="relative">
                              <Textarea
                                 className="min-h-[120px] text-sm bg-slate-50/50 dark:bg-slate-900 border-border/60 resize-none font-normal focus:bg-white dark:focus:bg-slate-950 transition-colors leading-relaxed p-4 shadow-none rounded-[6px]"
                                 placeholder="Adicione observações..."
                                 defaultValue="Cliente demonstrou muito interesse na funcionalidade de IA. O orçamento foi aprovado preliminarmente pelo board. Precisamos focar na integração com ERP nas próximas conversas."
                              />
                              <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                                 Salvo automaticamente
                              </div>
                           </div>
                        </div>
                     </TabsContent>

                     {/* TAB: ACTIVITY (Consolidated) */}
                     <TabsContent value="activity" className="p-0 m-0">
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 border-b border-border/60">
                           <div className="bg-white dark:bg-slate-950 border border-border overflow-hidden p-1 shadow-none rounded-[6px]">
                              <div className="flex items-center gap-1 px-1 pt-1 pb-2">
                                 <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-none rounded-[6px]">
                                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Nota
                                 </Button>
                                 <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-none rounded-[6px]">
                                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Agendar
                                 </Button>
                              </div>
                              <Textarea
                                 placeholder="Escreva algo..."
                                 className="border-none shadow-none focus-visible:ring-0 min-h-[60px] text-sm px-3 resize-none bg-transparent"
                              />
                              <div className="flex justify-between items-center px-3 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
                                 <div className="flex gap-2 text-slate-400">
                                    <Paperclip className="w-4 h-4 cursor-pointer hover:text-slate-600" />
                                 </div>
                                 <Button size="sm" className="h-7 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-none rounded-[6px]">
                                    Registrar
                                 </Button>
                              </div>
                           </div>
                        </div>

                        <div className="p-6 space-y-8">
                           {deal.history.map((item, i) => (
                              <div key={item.id} className="flex gap-4 group">
                                 <div className="flex flex-col items-center relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 border-2 border-white dark:border-slate-950 shadow-none ${item.type === 'stage' ? 'bg-amber-500' :
                                          item.type === 'call' ? 'bg-blue-500' :
                                             'bg-slate-400'
                                       }`}>
                                       {item.type === 'stage' && <ArrowRightLeft className="w-3.5 h-3.5" />}
                                       {item.type === 'call' && <Phone className="w-3.5 h-3.5" />}
                                       {item.type === 'note' && <FileText className="w-3.5 h-3.5" />}
                                    </div>
                                    {i !== deal.history.length - 1 && (
                                       <div className="absolute top-8 bottom-[-32px] w-[2px] bg-slate-100 dark:bg-slate-800" />
                                    )}
                                 </div>
                                 <div className="flex-1 pb-2">
                                    <div className="flex items-center gap-2 mb-1.5">
                                       <span className="text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">{item.type}</span>
                                       <span className="text-xs text-muted-foreground">•</span>
                                       <span className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                       {item.content}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2">
                                       <Avatar className="w-4 h-4">
                                          <AvatarFallback className="text-[8px] bg-slate-200">MM</AvatarFallback>
                                       </Avatar>
                                       <span className="text-xs text-muted-foreground font-medium">{item.author}</span>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </TabsContent>

                     {/* TAB: FILES */}
                     <TabsContent value="files" className="p-6 m-0">
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group rounded-[6px] shadow-none">
                           <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-500 border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform shadow-none">
                              <Paperclip className="w-5 h-5" />
                           </div>
                           <p className="text-sm font-medium text-foreground">Clique para fazer upload</p>
                           <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG ou PNG (max 10MB)</p>
                        </div>
                     </TabsContent>
                  </Tabs>
               </div>
            </ScrollArea>

            {/* FOOTER: Sticky Decision Bar */}
            <SheetFooter className="flex-none p-4 border-t border-border bg-white dark:bg-slate-950 w-full sm:justify-between z-20 shadow-none">
               <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  <History className="w-3.5 h-3.5" />
                  <span>Criado em 01/03/2024</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Última edição por Mateus M</span>
               </div>

               <div className="flex w-full sm:w-auto gap-3">
                  <Button variant="outline" className="flex-1 sm:flex-none h-10 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 transition-all shadow-none rounded-[6px]">
                     <XCircle className="w-4 h-4 mr-2" />
                     Marcar Perdido
                  </Button>
                  <Button className="flex-1 sm:flex-none h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none hover:shadow-none transition-all rounded-[6px]">
                     <CheckCircle2 className="w-4 h-4 mr-2" />
                     Marcar Ganho
                  </Button>
               </div>
            </SheetFooter>
         </SheetContent>
      </Sheet>
   );
}
