import React from 'react';
import { AnalysisItem } from '../../types';
import { Star } from 'lucide-react';

interface StarRatingChartProps {
  items: AnalysisItem[];
}

export const StarRatingChart: React.FC<StarRatingChartProps> = ({ items }) => {
  const ratedItems = items.filter(
    (i) => typeof i.starRating === 'number' && i.starRating >= 1 && i.starRating <= 5
  );

  if (ratedItems.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400 text-center">
        <Star className="w-5 h-5 text-amber-400/50 mx-auto mb-1.5" />
        <p className="font-medium text-slate-300">Sentiment by Star Rating</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Star rating metrics populate when reviews include ratings (e.g. from mapped CSV datasets).
        </p>
      </div>
    );
  }

  const starLevels = [5, 4, 3, 2, 1];
  const starData = starLevels.map((stars) => {
    const subset = ratedItems.filter((i) => Math.round(i.starRating!) === stars);
    const pos = subset.filter((i) => i.finalSentiment === 'positive').length;
    const neu = subset.filter((i) => i.finalSentiment === 'neutral').length;
    const neg = subset.filter((i) => i.finalSentiment === 'negative').length;
    return {
      stars,
      total: subset.length,
      pos,
      neu,
      neg,
    };
  });

  const maxTotal = Math.max(...starData.map((s) => s.total), 1);

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-slate-200">
            Sentiment by Star Rating
          </h4>
          <p className="text-[11px] text-slate-400">
            Tone breakdown across {ratedItems.length} rated reviews
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-400 font-mono font-semibold">
          <Star className="w-4 h-4 fill-amber-400" />
          <span>
            {(
              ratedItems.reduce((acc, curr) => acc + (curr.starRating || 0), 0) /
              ratedItems.length
            ).toFixed(1)}{' '}
            avg
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {starData.map((d) => {
          const widthPct = (d.total / maxTotal) * 100;
          const posPct = d.total > 0 ? (d.pos / d.total) * 100 : 0;
          const neuPct = d.total > 0 ? (d.neu / d.total) * 100 : 0;
          const negPct = d.total > 0 ? (d.neg / d.total) * 100 : 0;

          return (
            <div key={d.stars} className="flex items-center gap-3 text-xs">
              <span className="w-12 font-mono text-slate-300 font-medium shrink-0 flex items-center gap-1">
                {d.stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              </span>

              <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden flex">
                {d.total === 0 ? (
                  <div className="w-full h-full bg-slate-800/40" />
                ) : (
                  <div className="h-full flex" style={{ width: `${Math.max(10, widthPct)}%` }}>
                    {d.pos > 0 && (
                      <div
                        className="bg-[#2EE6A6] h-full"
                        style={{ width: `${posPct}%` }}
                        title={`${d.stars} Stars: ${d.pos} positive (${posPct.toFixed(0)}%)`}
                      />
                    )}
                    {d.neu > 0 && (
                      <div
                        className="bg-[#FFC145] h-full"
                        style={{ width: `${neuPct}%` }}
                        title={`${d.stars} Stars: ${d.neu} neutral (${neuPct.toFixed(0)}%)`}
                      />
                    )}
                    {d.neg > 0 && (
                      <div
                        className="bg-[#FF4D6D] h-full"
                        style={{ width: `${negPct}%` }}
                        title={`${d.stars} Stars: ${d.neg} negative (${negPct.toFixed(0)}%)`}
                      />
                    )}
                  </div>
                )}
              </div>

              <span className="w-10 text-right font-mono text-[11px] text-slate-400 shrink-0">
                {d.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
