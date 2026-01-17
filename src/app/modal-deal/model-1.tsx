import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calendar,
    CheckCircle2,
    XCircle,
    MoreVertical,
    User,
    Building2,
    Wallet,
} from "lucide-react";
import { mockDeal } from "./data";

export function Model1({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const deal = mockDeal;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden bg-white dark:bg-slate-950 sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                {/* Header Section */}
                <div className="p-6 pb-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-border">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="bg-white dark:bg-slate-800 text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-slate-200 dark:border-slate-700">
                                    {deal.stage}
                                </Badge>
                                {deal.tags.map(tag => (
                                    <span key={tag.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                ))}
                            </div>
                            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 pb-1">
                                {deal.title}
                            </DialogTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="w-3.5 h-3.5" />
                                {deal.company}
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor Estimado</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: deal.currency }).format(deal.value)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col h-[500px]">
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                        <div className="px-6 border-b border-border">
                            <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start">
                                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">
                                    Visão Geral
                                </TabsTrigger>
                                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">
                                    Histórico
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <TabsContent value="overview" className="m-0 space-y-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                    {/* Owner & Contact */}
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsável</h3>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border">
                                                    <AvatarFallback>MM</AvatarFallback>
                                                </Avatar>
                                                <div className="text-sm">
                                                    <p className="font-medium">{deal.owner.name}</p>
                                                    <p className="text-muted-foreground text-xs">Account Exec.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato Principal</h3>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                                    <AvatarFallback>RS</AvatarFallback>
                                                </Avatar>
                                                <div className="text-sm">
                                                    <p className="font-medium">{deal.contact.name}</p>
                                                    <p className="text-muted-foreground text-xs">{deal.contact.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Next Step */}
                                    <div className="bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/50">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-indigo-950 dark:text-indigo-100 text-sm">Próximo Passo</h4>
                                                <p className="text-indigo-900 dark:text-indigo-200 text-sm mt-0.5">{deal.nextActivity?.title}</p>
                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                                                    {new Date(deal.nextActivity!.date).toLocaleDateString()} às 10:00
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="history" className="m-0 space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                    <div className="space-y-6 relative pl-4 border-l border-slate-200 dark:border-slate-800 ml-2">
                                        {deal.history.map((item) => (
                                            <div key={item.id} className="relative group">
                                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 bg-slate-300 group-hover:bg-primary transition-colors" />
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-slate-900 dark:text-slate-100 capitalize">{item.type}</span>
                                                        <span className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                                        {item.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-between items-center z-10">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-4 h-4 mr-2" />
                        Mais ações
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950 gap-2">
                            <XCircle className="w-4 h-4" />
                            Perdido
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Ganho
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
