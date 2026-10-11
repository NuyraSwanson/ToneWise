import React from 'react';
import { AnalysisItem, ThemeType } from '../../types';
import { ALL_THEMES, THEME_DEFINITIONS } from '../../utils/themes';

interface ThemeStackedBarChartProps {
  items: AnalysisItem[];
  selectedTheme: 'all' | ThemeType;
  onSelectTheme: (theme: 'all' | ThemeType) => void;
}

export const ThemeStackedBarChart: React.FC<ThemeStackedBarChartProps> = ({
  items,
  selectedTheme,
  onSelectTheme,
}) => {
  const stats = ALL_THEMES.map((theme) => {
    const themeItems = items.filter((i) => i.themes.includes(theme));
    const pos = themeItems.filter((i) => i.finalSentiment === 'positive').length;
    const neu = themeItems.filter((i) => i.finalSentiment === 'neutral').length;
    const neg = themeItems.filter((i) => i.finalSentiment === 'negative').length;
    const total = themeItems.length;

    return {
      theme,
      pos,
      neu,
      neg,
      total,
      color: THEME_DEFINITIONS[theme].color,
    };
  });

  const maxThemeTotal = Math.max(...stats.map((s) => s.total), 1);

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-slate-200">
            Sentiment per Theme
          </h4>
          <p className="text-[11px] text-slate-400">
            Click any bar to filter reviews by theme
          </p>
        </div>
        {selectedTheme !== 'all' && (
          <button
            onClick={() => onSelectTheme('all')}
            className="text-[11px] text-[#22D3EE] hover:underline"
          >
            Clear ({selectedTheme})
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {stats.map((stat) => {
          const isSelected = selectedTheme === stat.theme;
          const posPct = stat.total > 0 ? (stat.pos / stat.total) * 100 : 0;
          const neuPct = stat.total > 0 ? (stat.neu / stat.total) * 100 : 0;
          const negPct = stat.total > 0 ? (stat.neg / stat.total) * 100 : 0;

          // Bar width scaled relative to max theme count (so busier themes have wider total bars)
          const barWidthScale = stat.total > 0 ? Math.max(15, (stat.total / maxThemeTotal) * 100) : 0;

          return (
            <div
              key={stat.theme}
              onClick={() => onSelectTheme(isSelected ? 'all' : stat.theme)}
              className={`p-2 rounded-xl cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-white/15 border-white/40 shadow-sm'
                  : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-medium text-slate-200">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                  <span>{stat.theme}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                  <span className="text-[#2EE6A6]">{stat.pos} pos</span>
                  <span>·</span>
                  <span className="text-[#FFC145]">{stat.neu} neu</span>
                  <span>·</span>
                  <span className="text-[#FF4D6D]">{stat.neg} neg</span>
                  <span className="text-white font-bold ml-1">({stat.total})</span>
                </div>
              </div>

              {/* Stacked Segment Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden flex">
                {stat.total === 0 ? (
                  <div className="w-full h-full bg-slate-700/30 text-[9px] text-center text-slate-500">
                    No mentions
                  </div>
                ) : (
                  <div
                    className="h-full flex transition-all duration-300"
                    style={{ width: `${barWidthScale}%` }}
                  >
                    {stat.pos > 0 && (
                      <div
                        className="bg-[#2EE6A6] h-full"
                        style={{ width: `${posPct}%` }}
                        title={`${stat.theme}: ${stat.pos} positive (${posPct.toFixed(0)}%)`}
                      />
                    )}
                    {stat.neu > 0 && (
                      <div
                        className="bg-[#FFC145] h-full"
                        style={{ width: `${neuPct}%` }}
                        title={`${stat.theme}: ${stat.neu} neutral (${neuPct.toFixed(0)}%)`}
                      />
                    )}
                    {stat.neg > 0 && (
                      <div
                        className="bg-[#FF4D6D] h-full"
                        style={{ width: `${negPct}%` }}
                        title={`${stat.theme}: ${stat.neg} negative (${negPct.toFixed(0)}%)`}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
