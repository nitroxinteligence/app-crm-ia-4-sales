"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LayoutOnboardingProps {
    children: React.ReactNode;
    step: number;
    totalSteps: number;
    title: string;
    description: string;
}

export function LayoutOnboarding({
    children,
    step,
    totalSteps,
    title,
    description,
}: LayoutOnboardingProps) {
    return (
        <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6">
            <main className="w-full max-w-4xl flex flex-col items-center justify-center space-y-10">
                <div className="text-center space-y-4 max-w-lg">
                    <h1 className="text-3xl font-bold tracking-tight animate-in fade-in slide-in-from-top-4 duration-700">{title}</h1>
                    <p className="text-muted-foreground text-lg animate-in fade-in slide-in-from-top-5 duration-700 delay-100">{description}</p>
                </div>

                <div
                    key={step}
                    className="w-full border border-border/60 rounded-2xl p-8 md:p-12 animate-in fade-in zoom-in-95 duration-500"
                    style={{ backgroundColor: "#F9F9F9" }}
                >
                    {children}
                </div>
            </main>
        </div>
    );
}
