import React, { useState } from 'react';
import { SentimentLabel } from '../../types';

interface SentimentPieChartProps {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  selectedSentiment: 'all' | SentimentLabel;
  onSelectSentiment: (sentiment: 'all' | SentimentLabel) => void;
}

export const SentimentPieChart: React.FC<SentimentPieChartProps> = ({
  positive,
  neutral,
  negative,
  total,
  selectedSentiment,
  onSelectSentiment,
}) => {
  const [hovered, setHovered] = useState<SentimentLabel | null>(null);

  if (total === 0) return null;

  const slices: { label: SentimentLabel; count: number; color: string; hoverColor: string; name: string }[] = [
    { label: 'positive', count: positive, color: '#2EE6A6', hoverColor: '#4EF7BE', name: 'Positive' },
    { label: 'neutral', count: neutral, color: '#FFC145', hoverColor: '#FFCD68', name: 'Neutral' },
    { label: 'negative', count: negative, color: '#FF4D6D', hoverColor: '#FF6D88', name: 'Negative' },
  ];

  const size = 180;
  const radius = 75;
  const innerRadius = 45; // Donut chart
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeAngle = -Math.PI / 2;

  const paths = slices.map((slice) => {
    const fraction = slice.count / total;
    const angle = fraction * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    if (slice.count === 0) return null;

    // Outer arc coordinates
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    // Inner arc coordinates
    const ix1 = cx + innerRadius * Math.cos(endAngle);
    const iy1 = cy + innerRadius * Math.sin(endAngle);
    const ix2 = cx + innerRadius * Math.cos(startAngle);
    const iy2 = cy + innerRadius * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const d =
      fraction >= 0.999
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 0 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 0 ${cx} ${cy - radius} M ${cx} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy + innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy - innerRadius} Z`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

    const isSelected = selectedSentiment === slice.label;
    const isHovered = hovered === slice.label;

    return {
      slice,
      d,
      pct: ((fraction * 100)).toFixed(1),
      isSelected,
      isHovered,
    };
  }).filter(Boolean);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
      {/* SVG Donut Chart */}
      <div className="relative w-[180px] h-[180px] shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible select-none"
          role="img"
          aria-label="Sentiment distribution pie chart"
        >
          {paths.map((p) => {
            if (!p) return null;
            return (
              <path
                key={p.slice.label}
                d={p.d}
                fill={p.isHovered || p.isSelected ? p.slice.hoverColor : p.slice.color}
                opacity={selectedSentiment === 'all' || p.isSelected ? 1 : 0.35}
                stroke="#0F0B2E"
                strokeWidth={2}
                className="cursor-pointer transition-all duration-200"
                style={{
                  transform: p.isSelected || p.isHovered ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: `${cx}px ${cy}px`,
                }}
                onMouseEnter={() => setHovered(p.slice.label)}
                onMouseLeave={() => setHovered(null)}
                onClick={() =>
                  onSelectSentiment(selectedSentiment === p.slice.label ? 'all' : p.slice.label)
                }
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-bold font-mono text-white tracking-tight">
            {hovered
              ? `${Math.round(((slices.find((s) => s.label === hovered)?.count || 0) / total) * 100)}%`
              : total}
          </span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {hovered ? hovered : 'Total Items'}
          </span>
        </div>
      </div>

      {/* Legend & Filter Controls */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
          <span>Sentiment Breakdown</span>
          {selectedSentiment !== 'all' && (
            <button
              onClick={() => onSelectSentiment('all')}
              className="text-[11px] text-[#22D3EE] hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        {slices.map((slice) => {
          const pct = total > 0 ? ((slice.count / total) * 100).toFixed(1) : '0';
          const isSelected = selectedSentiment === slice.label;

          return (
            <button
              key={slice.label}
              onClick={() =>
                onSelectSentiment(isSelected ? 'all' : slice.label)
              }
              onMouseEnter={() => setHovered(slice.label)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs transition-all ${
                isSelected
                  ? 'bg-white/15 border-white/40 shadow-sm'
                  : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="font-medium text-slate-200">{slice.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-white font-semibold">{slice.count}</span>
                <span className="text-slate-400">({pct}%)</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
