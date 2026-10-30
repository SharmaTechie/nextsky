"use client";

import type { SolarIrradianceData } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  Zap,
  TrendingDown,
  AlertCircle,
  Battery,
} from "lucide-react";

interface SolarIrradianceWidgetProps {
  data: SolarIrradianceData | null;
  leadTime: number;
  isLoading?: boolean;
}

const LEAD_TIME_LABELS: Record<number, string> = {
  1: "T+15 min",
  2: "T+30 min",
  3: "T+45 min",
  4: "T+60 min",
  5: "T+75 min",
  6: "T+90 min",
};

const RISK_CONFIG = {
  low: {
    label: "Low Risk",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    icon: Sun,
  },
  moderate: {
    label: "Moderate Risk",
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20",
    icon: CloudSun,
  },
  high: {
    label: "High Risk",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/20",
    icon: Cloud,
  },
  severe: {
    label: "Severe Risk",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/20",
    icon: CloudRain,
  },
};

function CircularGauge({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 10,
  color,
}: {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / maxValue, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color}
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-mono font-bold text-foreground">
          {value.toFixed(0)}%
        </span>
        <span className="text-[10px] text-muted-foreground">Efficiency</span>
      </div>
    </div>
  );
}

export function SolarIrradianceWidget({
  data,
  leadTime,
  isLoading,
}: SolarIrradianceWidgetProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Projected Energy Yield
        </h3>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="h-[120px] w-[120px] rounded-full border-4 border-primary/20 animate-pulse" />
            <div className="mt-4 h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Projected Energy Yield
        </h3>
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Zap className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Solar efficiency projection
              <br />
              will appear after prediction
            </p>
          </div>
        </div>
      </div>
    );
  }

  const riskConfig = RISK_CONFIG[data.risk_level];
  const RiskIcon = riskConfig.icon;

  const efficiencyColor =
    data.estimated_efficiency >= 75
      ? "text-success"
      : data.estimated_efficiency >= 50
        ? "text-warning"
        : data.estimated_efficiency >= 25
          ? "text-orange-400"
          : "text-destructive";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Projected Energy Yield
        </h3>
        <span className="text-xs font-mono text-primary">
          {LEAD_TIME_LABELS[leadTime]}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {/* Main Gauge */}
        <div className="flex items-center justify-center mb-4">
          <CircularGauge
            value={data.estimated_efficiency}
            color={efficiencyColor}
          />
        </div>

        {/* Risk Level Badge */}
        <div
          className={cn(
            "flex items-center justify-center gap-2 py-2 px-3 rounded-lg mb-4",
            riskConfig.bgColor,
            riskConfig.borderColor,
            "border"
          )}
        >
          <RiskIcon className={cn("h-4 w-4", riskConfig.color)} />
          <span className={cn("text-sm font-medium", riskConfig.color)}>
            {riskConfig.label}
          </span>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Cloud Coverage
              </span>
            </div>
            <span className="text-sm font-mono text-foreground">
              {data.cloud_coverage_percent.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Irradiance Reduction
              </span>
            </div>
            <span className="text-sm font-mono text-foreground">
              {data.irradiance_reduction.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Yield Factor
              </span>
            </div>
            <span className="text-sm font-mono text-foreground">
              {data.energy_yield_factor.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Warning for low efficiency */}
        {data.estimated_efficiency < 30 && (
          <div className="mt-4 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-destructive leading-relaxed">
              Solar output may drop to {data.estimated_efficiency.toFixed(0)}%
              capacity. Consider activating backup power reserves.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
