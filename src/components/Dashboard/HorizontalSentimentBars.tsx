import React from 'react';
import { AnalysisItem, SentimentLabel, ThemeType } from '../../types';
import { ALL_THEMES, THEME_DEFINITIONS } from '../../utils/themes';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

interface HorizontalSentimentBarsProps {
  items: AnalysisItem[];
  onSelectThemeFilter: (theme: ThemeType, sentiment?: SentimentLabel) => void;
}

export const HorizontalSentimentBars: React.FC<HorizontalSentimentBarsProps> = ({
  items,
  onSelectThemeFilter,
}) => {
  // Negative items themes
  const negItems = items.filter((i) => i.finalSentiment === 'negative');
  const posItems = items.filter((i) => i.finalSentiment === 'positive');

  const problemCounts = ALL_THEMES.map((theme) => {
    const count = negItems.filter((i) => i.themes.includes(theme)).length;
    return { theme, count, color: THEME_DEFINITIONS[theme].color };
  })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  const praisedCounts = ALL_THEMES.map((theme) => {
    const count = posItems.filter((i) => i.themes.includes(theme)).length;
    return { theme, count, color: THEME_DEFINITIONS[theme].color };
  })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxNeg = Math.max(...problemCounts.map((p) => p.count), 1);
  const maxPos = Math.max(...praisedCounts.map((p) => p.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Common Problems */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#FF4D6D]">
          <ThumbsDown className="w-4 h-4" />
          <span>Common Problems (Negative Themes)</span>
        </div>

        {problemCounts.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No recurring problem themes tagged in negative items yet.
          </p>
        ) : (
          <div className="space-y-2">
            {problemCounts.map((p) => {
              const widthPct = Math.round((p.count / maxNeg) * 100);
              return (
                <div
                  key={p.theme}
                  onClick={() => onSelectThemeFilter(p.theme, 'negative')}
                  className="group cursor-pointer p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 group-hover:text-white transition-colors">
                      {p.theme}
                    </span>
                    <span className="font-mono font-bold text-[#FF4D6D]">
                      {p.count} complaints
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#FF4D6D] h-full rounded-full transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* What Gets Praised */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2EE6A6]">
          <ThumbsUp className="w-4 h-4" />
          <span>What Gets Praised (Positive Themes)</span>
        </div>

        {praisedCounts.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No recurring praise themes tagged in positive items yet.
          </p>
        ) : (
          <div className="space-y-2">
            {praisedCounts.map((p) => {
              const widthPct = Math.round((p.count / maxPos) * 100);
              return (
                <div
                  key={p.theme}
                  onClick={() => onSelectThemeFilter(p.theme, 'positive')}
                  className="group cursor-pointer p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 group-hover:text-white transition-colors">
                      {p.theme}
                    </span>
                    <span className="font-mono font-bold text-[#2EE6A6]">
                      {p.count} praises
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#2EE6A6] h-full rounded-full transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
