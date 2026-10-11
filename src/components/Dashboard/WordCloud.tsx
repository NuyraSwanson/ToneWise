import React, { useMemo, useState } from 'react';
import { AnalysisItem } from '../../types';
import { computeWordCloud, CloudWord } from '../../utils/wordCloud';

interface WordCloudProps {
  items: AnalysisItem[];
  selectedWord?: string;
  onSelectWord: (word?: string) => void;
}

export const WordCloud: React.FC<WordCloudProps> = ({
  items,
  selectedWord,
  onSelectWord,
}) => {
  const width = 560;
  const height = 320;
  const [hoveredWord, setHoveredWord] = useState<CloudWord | null>(null);

  const words = useMemo(() => {
    return computeWordCloud(items, width, height);
  }, [items]);

  if (words.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400 text-center py-8">
        Word cloud generates when repeated words (used 2+ times) emerge from your review dataset.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-slate-200">
            Keyword Spiral Word Cloud
          </h4>
          <p className="text-[11px] text-slate-400">
            Top 60 frequent words. Tinted by complaint ratio: Mint (Praise) → Coral (Problem).
          </p>
        </div>

        {selectedWord && (
          <button
            onClick={() => onSelectWord(undefined)}
            className="text-[11px] text-[#22D3EE] hover:underline"
          >
            Clear word ({selectedWord})
          </button>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[16/9] max-h-[320px] bg-black/30 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="Spiral word cloud visualization"
        >
          {words.map((w) => {
            const isSelected = selectedWord === w.text;
            const isHovered = hoveredWord?.text === w.text;

            return (
              <text
                key={w.text}
                x={w.x}
                y={w.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={w.color}
                fontSize={w.fontSize}
                fontWeight={isSelected || isHovered ? '700' : '600'}
                opacity={selectedWord && !isSelected ? 0.35 : 0.9}
                className="cursor-pointer transition-all duration-200 select-none hover:opacity-100"
                style={{
                  textShadow: isSelected || isHovered ? `0 0 12px ${w.color}88` : 'none',
                }}
                onMouseEnter={() => setHoveredWord(w)}
                onMouseLeave={() => setHoveredWord(null)}
                onClick={() => onSelectWord(isSelected ? undefined : w.text)}
              >
                {w.text}
              </text>
            );
          })}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoveredWord && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/80 border border-white/20 text-[11px] text-white backdrop-blur-md pointer-events-none flex items-center gap-2">
            <span className="font-bold">{hoveredWord.text}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono">{hoveredWord.count} uses</span>
            <span className="text-slate-400">·</span>
            <span
              className="font-mono font-semibold"
              style={{ color: hoveredWord.color }}
            >
              {(hoveredWord.negativeRatio * 100).toFixed(0)}% in negative items
            </span>
          </div>
        )}
      </div>

      {/* Color legend footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2EE6A6]" />
            <span>Mostly Positive / Praised</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC145]" />
            <span>Mixed / Neutral</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D]" />
            <span>Frequent in Complaints</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          Click any word to filter
        </span>
      </div>
    </div>
  );
};
