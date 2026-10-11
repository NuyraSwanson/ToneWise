import React from 'react';
import { AnalysisItem, FilterState, SentimentLabel, ThemeType } from '../../types';
import { SentimentPieChart } from './SentimentPieChart';
import { ThemeStackedBarChart } from './ThemeStackedBarChart';
import { HorizontalSentimentBars } from './HorizontalSentimentBars';
import { EngineAgreementGrid } from './EngineAgreementGrid';
import { StarRatingChart } from './StarRatingChart';
import { WordCloud } from './WordCloud';
import { ItemList } from './ItemList';
import { Activity, BarChart3, MessageSquarePlus, Sparkles } from 'lucide-react';

interface DashboardViewProps {
  items: AnalysisItem[];
  filterState: FilterState;
  onUpdateFilters: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onExplainItem: (item: AnalysisItem) => void;
  onLoadExamples: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  filterState,
  onUpdateFilters,
  onResetFilters,
  onExplainItem,
  onLoadExamples,
}) => {
  // Empty State when 0 items
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 text-slate-400">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#7C5CFF]/20 to-[#22D3EE]/20 border border-[#7C5CFF]/30 flex items-center justify-center text-[#22D3EE] shadow-lg">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-base font-bold text-white font-outfit">
            Sentiment Analytics Dashboard
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tone metrics, theme correlations, engine consensus matrix, and keyword clouds will
            populate automatically once you analyze your first reviews or comments.
          </p>
        </div>
        <button
          onClick={onLoadExamples}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] text-white hover:opacity-90 shadow-md active:scale-95 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load 6 Example Reviews</span>
        </button>
      </div>
    );
  }

  // 1. Computed Headline
  const total = items.length;
  const posCount = items.filter((i) => i.finalSentiment === 'positive').length;
  const neuCount = items.filter((i) => i.finalSentiment === 'neutral').length;
  const negCount = items.filter((i) => i.finalSentiment === 'negative').length;

  const headline = `${posCount} of ${total} comments are positive, ${neuCount} neutral and ${negCount} negative.`;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
      {/* 1. Computed Headline Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#7C5CFF]/15 via-[#22D3EE]/10 to-transparent border border-[#7C5CFF]/30 shadow-lg flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Tone Overview</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white font-outfit">
            {headline}
          </h2>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#2EE6A6]/10 border border-[#2EE6A6]/20 text-[#2EE6A6] text-center">
            <span className="block font-bold text-sm">
              {((posCount / total) * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] uppercase font-sans">Positive</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FFC145]/10 border border-[#FFC145]/20 text-[#FFC145] text-center">
            <span className="block font-bold text-sm">
              {((neuCount / total) * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] uppercase font-sans">Neutral</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D] text-center">
            <span className="block font-bold text-sm">
              {((negCount / total) * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] uppercase font-sans">Negative</span>
          </div>
        </div>
      </div>

      {/* Row 1: Pie Chart & Theme Stacked Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 2. Pie chart */}
        <SentimentPieChart
          positive={posCount}
          neutral={neuCount}
          negative={negCount}
          total={total}
          selectedSentiment={filterState.sentiment}
          onSelectSentiment={(s) => onUpdateFilters({ sentiment: s })}
        />

        {/* 3. Stacked bar chart of sentiment per theme */}
        <ThemeStackedBarChart
          items={items}
          selectedTheme={filterState.theme}
          onSelectTheme={(t) => onUpdateFilters({ theme: t })}
        />
      </div>

      {/* Row 2: 4. Horizontal Bars (Common problems & What gets praised) */}
      <HorizontalSentimentBars
        items={items}
        onSelectThemeFilter={(theme, sentiment) => {
          onUpdateFilters({
            theme,
            sentiment: sentiment || 'all',
          });
        }}
      />

      {/* Row 3: 5. Engine Agreement Grid & 6. Star Rating Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EngineAgreementGrid
          items={items}
          disagreementsOnly={filterState.disagreementsOnly}
          onToggleDisagreementsOnly={(val) => onUpdateFilters({ disagreementsOnly: val })}
        />

        <StarRatingChart items={items} />
      </div>

      {/* Row 4: 7. Spiral Word Cloud */}
      <WordCloud
        items={items}
        selectedWord={filterState.selectedWord}
        onSelectWord={(word) => onUpdateFilters({ selectedWord: word })}
      />

      {/* Row 5: 8. Item List with Filters, Search, Sorting & Keyword Highlighting */}
      <ItemList
        items={items}
        filterState={filterState}
        onUpdateFilters={onUpdateFilters}
        onResetFilters={onResetFilters}
        onExplainItem={onExplainItem}
      />
    </div>
  );
};
