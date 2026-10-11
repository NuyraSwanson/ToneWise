import React, { useState } from 'react';
import { CsvParsedData } from '../../utils/csv';
import { Table, FileSpreadsheet, ArrowRight, X, AlertCircle } from 'lucide-react';

interface CsvMapperModalProps {
  csvData: CsvParsedData;
  filename: string;
  onConfirm: (mapping: { textCol: string; ratingCol?: string; dateCol?: string }) => void;
  onCancel: () => void;
}

export const CsvMapperModal: React.FC<CsvMapperModalProps> = ({
  csvData,
  filename,
  onConfirm,
  onCancel,
}) => {
  const { headers, rows, totalRows } = csvData;

  // Auto-detect default columns
  const autoTextCol =
    headers.find((h) => /^(text|review|comment|body|feedback|content|review_text|summary)$/i.test(h)) ||
    headers[0] ||
    '';

  const autoRatingCol =
    headers.find((h) => /^(rating|stars|score|rate|star_rating)$/i.test(h)) || '';

  const autoDateCol =
    headers.find((h) => /^(date|timestamp|created|time|created_at|review_date)$/i.test(h)) || '';

  const [textCol, setTextCol] = useState(autoTextCol);
  const [ratingCol, setRatingCol] = useState(autoRatingCol);
  const [dateCol, setDateCol] = useState(autoDateCol);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!textCol) {
      setError('Please select a column containing the review text.');
      return;
    }
    onConfirm({
      textCol,
      ratingCol: ratingCol || undefined,
      dateCol: dateCol || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[#140E3D] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2EE6A6]/20 text-[#2EE6A6] border border-[#2EE6A6]/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white font-outfit">
                CSV Column Mapping
              </h3>
              <p className="text-xs text-slate-400">
                {filename} ({totalRows > 2000 ? '2,000 max rows' : `${rows.length} rows detected`})
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Text Column (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                <span>Review Text *</span>
                <span className="text-[#FF4D6D]">(Required)</span>
              </label>
              <select
                value={textCol}
                onChange={(e) => {
                  setTextCol(e.target.value);
                  setError(null);
                }}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
              >
                <option value="">-- Choose Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Star Rating Column (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Star Rating (1–5)
              </label>
              <select
                value={ratingCol}
                onChange={(e) => setRatingCol(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
              >
                <option value="">-- None / Skip --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Column (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Date / Timestamp
              </label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C5CFF]"
              >
                <option value="">-- None / Skip --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Model batch note */}
          <div className="p-3.5 rounded-xl bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 text-xs text-slate-300 flex items-start gap-2.5">
            <span className="p-1 rounded bg-[#7C5CFF]/30 text-[#22D3EE] font-mono text-[10px] uppercase font-bold shrink-0 mt-0.5">
              Dual Speed
            </span>
            <p className="leading-relaxed">
              To balance deep transformer precision and speed: the local{' '}
              <strong className="text-white">RoBERTa model</strong> will evaluate the first{' '}
              <strong className="text-[#22D3EE]">300 rows</strong> (with live cancel control);
              subsequent rows are evaluated by high-speed <strong className="text-white">VADER</strong>.
            </p>
          </div>

          {/* Preview rows */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <Table className="w-3.5 h-3.5" />
              <span>Sample Rows Preview (First 3)</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                  <tr>
                    {headers.slice(0, 5).map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h} {h === textCol && <span className="text-[#2EE6A6] font-bold">(Text)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.slice(0, 3).map((r, i) => (
                    <tr key={i} className="text-slate-300 hover:bg-white/5">
                      {headers.slice(0, 5).map((h) => (
                        <td key={h} className="px-3 py-2 truncate max-w-[200px]">
                          {r[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
          <span className="text-xs text-slate-400">
            Will process <strong className="text-white font-mono">{rows.length}</strong> rows
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] text-white hover:opacity-90 shadow-md active:scale-95 transition-all"
            >
              <span>Start Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
