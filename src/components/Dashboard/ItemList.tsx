import React, { useMemo } from 'react';
import { AnalysisItem, FilterState, SentimentLabel, ThemeType } from '../../types';
import { ALL_THEMES, THEME_DEFINITIONS } from '../../utils/themes';
import {
  Search,
  AlertTriangle,
  Scale,
  X,
  Filter,
  ArrowUpDown,
  Tag,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface ItemListProps {
  items: AnalysisItem[];
  filterState: FilterState;
  onUpdateFilters: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onExplainItem: (item: AnalysisItem) => void;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  filterState,
  onUpdateFilters,
  onResetFilters,
  onExplainItem,
}) => {
  const { sentiment, theme, disagreementsOnly, searchQuery, sortBy, selectedWord } =
    filterState;

  // Active filters check
  const hasActiveFilters =
    sentiment !== 'all' ||
    theme !== 'all' ||
    disagreementsOnly ||
    searchQuery.trim().length > 0 ||
    Boolean(selectedWord);

  // Filter & sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (sentiment !== 'all') {
      result = result.filter((i) => i.finalSentiment === sentiment);
    }

    if (theme !== 'all') {
      result = result.filter((i) => i.themes.includes(theme));
    }

    if (disagreementsOnly) {
      result = result.filter((i) => i.needsReview);
    }

    if (selectedWord) {
      const w = selectedWord.toLowerCase();
      result = result.filter((i) => i.text.toLowerCase().includes(w));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.text.toLowerCase().includes(q) ||
          i.themes.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'most_negative':
          return a.vader.compound - b.vader.compound;
        case 'most_positive':
          return b.vader.compound - a.vader.compound;
        case 'disagreements_first':
          if (a.needsReview === b.needsReview) return b.timestamp - a.timestamp;
          return a.needsReview ? -1 : 1;
        default:
          return b.timestamp - a.timestamp;
      }
    });

    return result;
  }, [items, sentiment, theme, disagreementsOnly, searchQuery, sortBy, selectedWord]);

  // Keyword highlighting helper
  const renderHighlightedText = (item: AnalysisItem) => {
    const text = item.text;
    const highlightWords = new Set<string>();

    if (selectedWord) highlightWords.add(selectedWord.toLowerCase());
    if (searchQuery.trim()) highlightWords.add(searchQuery.trim().toLowerCase());

    // Add theme matched words
    for (const td of item.themeDetails) {
      for (const kw of td.keywords) {
        highlightWords.add(kw.toLowerCase());
      }
    }

    if (highlightWords.size === 0) {
      return text;
    }

    // Escape regex words and build pattern
    const escapedWords = Array.from(highlightWords)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .filter((w) => w.length > 2);

    if (escapedWords.length === 0) return text;

    const regex = new RegExp(`(\\b(?:${escapedWords.join('|')})[a-z]*)`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark
            key={index}
            className="bg-[#7C5CFF]/30 text-[#22D3EE] font-semibold px-0.5 rounded border border-[#7C5CFF]/40"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
      {/* Title & Count */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-slate-200">
            Filtered Review Explorer
          </h4>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold">
            {filteredItems.length} of {items.length}
          </span>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) =>
              onUpdateFilters({ sortBy: e.target.value as FilterState['sortBy'] })
            }
            className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_negative">Most Negative First</option>
            <option value="most_positive">Most Positive First</option>
            <option value="disagreements_first">Disagreements First</option>
          </select>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
            placeholder="Search keywords or text..."
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#7C5CFF]"
          />
        </div>

        {/* Sentiment Dropdown */}
        <div>
          <select
            value={sentiment}
            onChange={(e) =>
              onUpdateFilters({ sentiment: e.target.value as FilterState['sentiment'] })
            }
            className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive Only (Mint)</option>
            <option value="neutral">Neutral Only (Amber)</option>
            <option value="negative">Negative Only (Coral)</option>
          </select>
        </div>

        {/* Theme Dropdown */}
        <div>
          <select
            value={theme}
            onChange={(e) =>
              onUpdateFilters({ theme: e.target.value as FilterState['theme'] })
            }
            className="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
          >
            <option value="all">All Themes</option>
            {ALL_THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Disagreements Toggle Button */}
        <button
          onClick={() => onUpdateFilters({ disagreementsOnly: !disagreementsOnly })}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            disagreementsOnly
              ? 'bg-[#FF4D6D] text-white border-[#FF4D6D]'
              : 'bg-black/30 text-slate-300 border-white/10 hover:border-white/20'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Disagreements Only</span>
        </button>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-black/30 border border-white/5 text-xs">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Active Filters:</span>
          </span>

          {sentiment !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2EE6A6]/10 text-[#2EE6A6] border border-[#2EE6A6]/20 capitalize">
              <span>Sentiment: {sentiment}</span>
              <button onClick={() => onUpdateFilters({ sentiment: 'all' })}>
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}

          {theme !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7C5CFF]/20 text-[#A78BFA] border border-[#7C5CFF]/30">
              <span>Theme: {theme}</span>
              <button onClick={() => onUpdateFilters({ theme: 'all' })}>
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}

          {disagreementsOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF4D6D]/20 text-[#FF4D6D] border border-[#FF4D6D]/30">
              <span>Engines Disagree</span>
              <button onClick={() => onUpdateFilters({ disagreementsOnly: false })}>
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}

          {selectedWord && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30">
              <span>Word: "{selectedWord}"</span>
              <button onClick={() => onUpdateFilters({ selectedWord: undefined })}>
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/20">
              <span>Query: "{searchQuery}"</span>
              <button onClick={() => onUpdateFilters({ searchQuery: '' })}>
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}

          <button
            onClick={onResetFilters}
            className="text-[11px] text-[#22D3EE] hover:underline ml-auto"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Items Scrollable List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredItems.map((item) => {
          const finalColorClass = {
            positive: 'bg-[#2EE6A6]/15 text-[#2EE6A6] border-[#2EE6A6]/30',
            neutral: 'bg-[#FFC145]/15 text-[#FFC145] border-[#FFC145]/30',
            negative: 'bg-[#FF4D6D]/15 text-[#FF4D6D] border-[#FF4D6D]/30',
          }[item.finalSentiment];

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-black/20 border border-white/10 hover:border-white/25 transition-all space-y-2.5 text-xs"
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border tracking-wide uppercase ${finalColorClass}`}
                  >
                    {item.finalSentiment === 'positive' && <CheckCircle2 className="w-3 h-3" />}
                    {item.finalSentiment === 'neutral' && <HelpCircle className="w-3 h-3" />}
                    {item.finalSentiment === 'negative' && <AlertTriangle className="w-3 h-3" />}
                    <span>{item.finalSentiment}</span>
                  </span>

                  {item.starRating && (
                    <span className="font-mono text-amber-400 font-semibold text-[11px]">
                      ★ {item.starRating}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Both Engine Labels */}
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300"
                    title={`VADER compound: ${item.vader.compound}`}
                  >
                    VADER: <strong>{item.vader.label}</strong> ({item.vader.compound > 0 ? '+' : ''}
                    {item.vader.compound})
                  </span>

                  {item.huggingFace && (
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20"
                      title={`RoBERTa confidence: ${(item.huggingFace.probabilities[item.huggingFace.label] * 100).toFixed(1)}%`}
                    >
                      RoBERTa: <strong>{item.huggingFace.label}</strong> (
                      {(item.huggingFace.probabilities[item.huggingFace.label] * 100).toFixed(0)}%)
                    </span>
                  )}

                  {item.needsReview && (
                    <span className="text-[10px] text-[#FF4D6D] font-bold px-1.5 py-0.5 rounded bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Mismatch
                    </span>
                  )}

                  <button
                    onClick={() => onExplainItem(item)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <Scale className="w-3 h-3 text-[#22D3EE]" />
                    <span>Explain</span>
                  </button>
                </div>
              </div>

              {/* Text with keyword highlight */}
              <p className="text-slate-200 leading-relaxed text-xs">
                {renderHighlightedText(item)}
              </p>

              {/* Theme chips */}
              {item.themes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {item.themes.map((t) => {
                    const color = THEME_DEFINITIONS[t]?.color || '#7C5CFF';
                    return (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                        style={{
                          backgroundColor: `${color}20`,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        {t}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            No reviews match the selected filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
