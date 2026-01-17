import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Check,
    ChevronRight,
    TrendingUp,
    User,
    Calendar,
} from "lucide-react";
import { mockDeal } from "./data";
import { cn } from "@/lib/utils";

export function Model3({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const deal = mockDeal;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] p-0 overflow-hidden border-none shadow-2xl bg-[#FBFBFD] dark:bg-[#1C1C1E] rounded-[24px]">
                {/* Cover / Header */}
                <div className="p-8 pb-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                        <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: deal.currency }).format(deal.value)}
                    </h2>
                    <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">{deal.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{deal.company}</p>

                    <Badge className="mt-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 px-4 py-1.5 h-auto text-xs font-semibold rounded-full">
                        {deal.stage}
                    </Badge>
                </div>

                {/* Content List */}
                <div className="px-5 pb-8 space-y-4">
                    {/* Card Group */}
                    <div className="bg-white dark:bg-[#2C2C2E] rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-none">

                        {/* Row 1: Contact */}
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer active:bg-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Contato</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{deal.contact.name}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        </div>

                        <Separator className="dark:bg-[#3A3A3C]" />

                        {/* Row 2: Next Step */}
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer active:bg-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Próximo Passo</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{deal.nextActivity?.title}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 dark:text-slate-500">Amanhã</span>
                                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button className="w-full h-14 text-base rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all">
                        Mover para Ganho
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
