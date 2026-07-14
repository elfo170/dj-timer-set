import { Clock3, Gauge, Music2, Target } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  formatHoursMinutesSeconds,
  formatMinutesSeconds,
} from "@/utils/time";
import type { SetSummary } from "@/types/rekordbox";

export const GOAL_OPTIONS_MINUTES = [30, 45, 60, 90, 120] as const;
export type GoalMinutes = (typeof GOAL_OPTIONS_MINUTES)[number];

interface SetSummaryPanelProps {
  summary: SetSummary;
  goalMinutes: GoalMinutes;
  onGoalChange: (goal: GoalMinutes) => void;
}

export function SetSummaryPanel({
  summary,
  goalMinutes,
  onGoalChange,
}: SetSummaryPanelProps) {
  const goalSeconds = goalMinutes * 60;
  const deltaSeconds = goalSeconds - summary.totalSeconds;
  const overGoal = deltaSeconds < 0;
  const progress =
    goalSeconds > 0 ? Math.min(1, summary.totalSeconds / goalSeconds) : 0;

  return (
    <section
      className="border-t border-line bg-surface-raised px-5 py-4"
      aria-label="Resumo do set"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-wrap items-end gap-8">
          <Stat
            icon={<Clock3 className="h-4 w-4" aria-hidden />}
            label="Tempo total"
            value={formatHoursMinutesSeconds(summary.totalSeconds)}
            emphasis
          />
          <Stat
            icon={<Music2 className="h-4 w-4" aria-hidden />}
            label="Músicas"
            value={String(summary.trackCount)}
          />
          <Stat
            icon={<Gauge className="h-4 w-4" aria-hidden />}
            label="Média por música"
            value={formatMinutesSeconds(summary.averageSeconds)}
          />
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className="flex items-center gap-1 rounded-md border border-line p-1"
            role="group"
            aria-label="Meta do set em minutos"
          >
            <Target className="ml-1 mr-0.5 h-4 w-4 text-ink-faint" aria-hidden />
            {GOAL_OPTIONS_MINUTES.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => onGoalChange(minutes)}
                aria-pressed={minutes === goalMinutes}
                className={cn(
                  "rounded px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/50",
                  minutes === goalMinutes
                    ? "bg-wave/20 text-wave"
                    : "text-ink-muted hover:bg-surface-overlay hover:text-ink",
                )}
              >
                {minutes} min
              </button>
            ))}
          </div>
          <p className="font-mono text-sm">
            {overGoal ? (
              <span className="text-alert">
                Ultrapassou {formatMinutesSeconds(-deltaSeconds)}
              </span>
            ) : (
              <span className="text-cueA">
                Faltam {formatMinutesSeconds(deltaSeconds)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Fita do set: preenchimento do tempo em relação à meta */}
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-overlay"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goalSeconds}
        aria-valuenow={Math.round(summary.totalSeconds)}
        aria-label="Progresso do set em relação à meta"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
            overGoal ? "bg-alert" : "bg-wave",
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  emphasis = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono tabular-nums",
          emphasis ? "text-2xl font-semibold text-wave" : "text-xl text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
