"use client";

import * as React from "react";
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
    theme?: {
      light: string;
      dark: string;
    };
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChartConfig() {
  const contexto = React.useContext(ChartContext);
  if (!contexto) {
    throw new Error("Chart components must be used within ChartContainer");
  }
  return contexto;
}

function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
  children: React.ReactElement;
}) {
  const estilos = React.useMemo(() => {
    return Object.entries(config).reduce<Record<string, string>>(
      (acc, [key, item]) => {
        if (item.color) {
          acc[`--color-${key}`] = item.color;
        } else if (item.theme) {
          acc[`--color-${key}`] = item.theme.light;
        }
        return acc;
      },
      {}
    );
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn("flex aspect-video items-center justify-center", className)}
        style={estilos}
        {...props}
      >
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartTooltip({
  content,
  ...props
}: React.ComponentProps<typeof RechartsTooltip>) {
  return (
    <RechartsTooltip
      cursor={false}
      content={content ?? <ChartTooltipContent />}
      {...props}
    />
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: unknown; name?: unknown; value?: unknown; color?: string }>;
  label?: string | number;
  hideLabel?: boolean;
  labelFormatter?: (label: string | number) => string;
}) {
  const { config } = useChartConfig();

  if (!active || !payload?.length) {
    return null;
  }

  const labelValue = labelFormatter
    ? labelFormatter(label as string | number)
    : label;

  return (
    <div className="rounded-lg border border-border/60 bg-background p-2 text-xs shadow-sm">
      {!hideLabel && labelValue && (
        <p className="mb-1 font-medium">{labelValue}</p>
      )}
      <div className="space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey);
          const configItem = config[key];
          const cor = item.color ?? configItem?.color ?? `var(--color-${key})`;
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cor }}
                />
                <span>{configItem?.label ?? String(item.name ?? key)}</span>
              </div>
              <span className="font-medium">{String(item.value ?? "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegend({
  content,
  ...props
}: React.ComponentProps<typeof RechartsLegend>) {
  return <RechartsLegend content={content ?? <ChartLegendContent />} {...props} />;
}

function ChartLegendContent() {
  const { config } = useChartConfig();
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {Object.entries(config).map(([key, item]) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color ?? `var(--color-${key})` }}
          />
          <span>{item.label ?? key}</span>
        </div>
      ))}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
