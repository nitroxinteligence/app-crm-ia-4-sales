"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Model1 } from "./model-1";
import { Model2 } from "./model-2";
import { Model3 } from "./model-3";

export default function ModalDealPlayground() {
    const [activeModel, setActiveModel] = useState<number>(1);
    const [modalOpen, setModalOpen] = useState(true);

    // Force modal open when switching models
    const handleModelChange = (model: number) => {
        setActiveModel(model);
        setModalOpen(true);
    };

    return (
        <div className="p-8 min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        Deal Modal Redesign
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Select a model below to view the proposed design variations.
                    </p>
                </div>

                <div className="flex gap-4 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm w-fit border border-slate-200 dark:border-slate-700">
                    {[1, 2, 3].map((model) => (
                        <Button
                            key={model}
                            onClick={() => handleModelChange(model)}
                            variant={activeModel === model ? "default" : "ghost"}
                            className="px-8"
                        >
                            Model {model}
                        </Button>
                    ))}
                    <Button onClick={() => setModalOpen(true)} variant="outline" className="ml-4">
                        Re-open Modal
                    </Button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-8 min-h-[600px] shadow-sm relative overflow-hidden flex items-center justify-center">
                    <div className="absolute top-4 left-4 z-10 text-xs text-muted-foreground">
                        Currently Previewing: <strong>{activeModel === 1 ? "Model 1: Balanced Dialog" : activeModel === 2 ? "Model 2: Super Sheet (Refined Final)" : "Model 3: Minimal Card"}</strong>
                    </div>

                    <p className="text-slate-400">
                        The modal for <strong>Model {activeModel}</strong> should be open.<br />
                        If closed, click "Re-open Modal".
                    </p>

                    {activeModel === 1 && <Model1 open={modalOpen} onOpenChange={setModalOpen} />}
                    {activeModel === 2 && <Model2 open={modalOpen} onOpenChange={setModalOpen} />}
                    {activeModel === 3 && <Model3 open={modalOpen} onOpenChange={setModalOpen} />}
                </div>
            </div>
        </div>
    );
}
