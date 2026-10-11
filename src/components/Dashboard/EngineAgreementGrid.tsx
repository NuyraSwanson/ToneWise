import React from 'react';
import { AnalysisItem, SentimentLabel } from '../../types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface EngineAgreementGridProps {
  items: AnalysisItem[];
  disagreementsOnly: boolean;
  onToggleDisagreementsOnly: (val: boolean) => void;
}

export const EngineAgreementGrid: React.FC<EngineAgreementGridProps> = ({
  items,
  disagreementsOnly,
  onToggleDisagreementsOnly,
}) => {
  const itemsWithBoth = items.filter((i) => i.huggingFace !== null && i.huggingFace !== undefined);

  if (itemsWithBoth.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400 text-center">
        Engine agreement grid activates when reviews are analyzed by both VADER and RoBERTa models.
      </div>
    );
  }

  const sentiments: SentimentLabel[] = ['positive', 'neutral', 'negative'];

  // Matrix: [vaderLabel][robertaLabel]
  const matrix: Record<SentimentLabel, Record<SentimentLabel, number>> = {
    positive: { positive: 0, neutral: 0, negative: 0 },
    neutral: { positive: 0, neutral: 0, negative: 0 },
    negative: { positive: 0, neutral: 0, negative: 0 },
  };

  let agreementCount = 0;

  for (const item of itemsWithBoth) {
    const v = item.vader.label;
    const r = item.huggingFace!.label;
    matrix[v][r] += 1;
    if (v === r) agreementCount += 1;
  }

  const total = itemsWithBoth.length;
  const agreementPct = total > 0 ? ((agreementCount / total) * 100).toFixed(1) : '100.0';
  const disagreementCount = total - agreementCount;

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-xs font-semibold text-slate-200">
            Engine Consensus Matrix
          </h4>
          <p className="text-[11px] text-slate-400">
            VADER (lexical) vs RoBERTa (transformer) cross-analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2EE6A6]/10 border border-[#2EE6A6]/20 text-xs font-semibold text-[#2EE6A6]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Engines agree on {agreementPct}%</span>
          </div>

          {disagreementCount > 0 && (
            <button
              onClick={() => onToggleDisagreementsOnly(!disagreementsOnly)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                disagreementsOnly
                  ? 'bg-[#FF4D6D] text-white border-[#FF4D6D] shadow-sm'
                  : 'bg-white/5 text-[#FF4D6D] border-[#FF4D6D]/30 hover:bg-[#FF4D6D]/15'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {disagreementsOnly ? 'Showing Disagreements' : `Filter Disagreements (${disagreementCount})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr>
              <th className="p-1.5 text-left text-[11px] text-slate-400 font-normal">
                VADER ↓ / RoBERTa →
              </th>
              {sentiments.map((s) => (
                <th key={s} className="p-1.5 font-semibold text-slate-300 capitalize text-[11px]">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sentiments.map((vLabel) => (
              <tr key={vLabel} className="border-t border-white/5">
                <td className="p-1.5 text-left font-semibold text-slate-300 capitalize text-[11px]">
                  {vLabel}
                </td>
                {sentiments.map((rLabel) => {
                  const count = matrix[vLabel][rLabel];
                  const isConsensus = vLabel === rLabel;

                  let cellBg = 'bg-black/20 text-slate-500';
                  if (count > 0) {
                    cellBg = isConsensus
                      ? 'bg-[#2EE6A6]/20 text-[#2EE6A6] font-bold border border-[#2EE6A6]/30'
                      : 'bg-[#FF4D6D]/20 text-[#FF4D6D] font-bold border border-[#FF4D6D]/40';
                  }

                  return (
                    <td key={rLabel} className="p-1.5">
                      <div className={`py-1.5 px-2 rounded-lg font-mono text-xs transition-colors ${cellBg}`}>
                        {count}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
