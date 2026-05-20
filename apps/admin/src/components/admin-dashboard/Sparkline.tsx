import { cn } from "@repo/ui/lib/utils";

interface SparklineProps {
  data: number[];
  className?: string;
  tone?: "green" | "red" | "blue" | "amber";
}

const toneClass = {
  green: "stroke-emerald-500",
  red: "stroke-red-500",
  blue: "stroke-blue-500",
  amber: "stroke-amber-500",
};

export function Sparkline({ data, className, tone = "blue" }: SparklineProps) {
  const width = 112;
  const height = 34;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className={cn("h-[34px] w-28", className)} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Metric trend">
      <polyline
        points={points}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={toneClass[tone]}
      />
    </svg>
  );
}
