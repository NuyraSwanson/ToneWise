import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Plus, FileText, CheckCircle2 } from 'lucide-react';

import { VisualExpression } from '../../types';

interface OcrChecklistModalProps {
  initialComments: string[];
  imageUrl?: string;
  visualExpression?: VisualExpression;
  onConfirm: (selectedComments: string[]) => void;
  onAnalyzeExpressionOnly?: () => void;
  onCancel: () => void;
}

export const OcrChecklistModal: React.FC<OcrChecklistModalProps> = ({
  initialComments,
  imageUrl,
  visualExpression,
  onConfirm,
  onAnalyzeExpressionOnly,
  onCancel,
}) => {
  const [items, setItems] = useState<Array<{ id: string; text: string; selected: boolean }>>(
    () =>
      initialComments.map((text, i) => ({
        id: `ocr_${i}_${Date.now()}`,
        text,
        selected: true,
      }))
  );

  const toggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const updateText = (id: string, newText: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `ocr_extra_${Date.now()}`, text: '', selected: true },
    ]);
  };

  const selectAll = (val: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: val })));
  };

  const selectedCount = items.filter((i) => i.selected && i.text.trim().length > 0).length;

  const handleAnalyze = () => {
    const selectedTexts = items
      .filter((i) => i.selected && i.text.trim().length > 0)
      .map((i) => i.text.trim());
    if (selectedTexts.length > 0) {
      onConfirm(selectedTexts);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[#140E3D] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white font-outfit">
                Image Text & Expression Review
              </h3>
              <p className="text-xs text-slate-400">
                {items.length > 0
                  ? `Extracted ${items.length} text items. Edit or select items to analyse.`
                  : 'Image analyzed. Review visual expression or add text items.'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Cancel
          </button>
        </div>

        {/* Visual Expression Banner if present */}
        {imageUrl && visualExpression && (
          <div className="flex items-center gap-3.5 p-3 mx-6 mt-4 rounded-xl bg-black/40 border border-white/10">
            <img
              src={imageUrl}
              alt="Uploaded thumbnail"
              className="w-14 h-14 object-cover rounded-lg border border-white/20 shrink-0 shadow-md"
            />
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <span className="text-base">{visualExpression.emoji}</span>
                <span>Visual Expression: {visualExpression.label}</span>
                <span className="text-[10px] font-mono text-[#2EE6A6] bg-[#2EE6A6]/10 px-1.5 py-0.5 rounded border border-[#2EE6A6]/30">
                  {(visualExpression.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {visualExpression.summary}
              </p>
            </div>
            {onAnalyzeExpressionOnly && (
              <button
                type="button"
                onClick={onAnalyzeExpressionOnly}
                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] hover:opacity-90 text-white text-xs font-semibold shrink-0 transition-opacity"
              >
                Analyse Expression
              </button>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-black/20 border-b border-white/5 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectAll(true)}
              className="hover:text-white underline underline-offset-2"
            >
              Select All
            </button>
            <span>·</span>
            <button
              onClick={() => selectAll(false)}
              className="hover:text-white underline underline-offset-2"
            >
              Deselect All
            </button>
          </div>
          <button
            onClick={addItem}
            className="inline-flex items-center gap-1 text-[#22D3EE] hover:text-[#38BDF8] font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Comment</span>
          </button>
        </div>

        {/* List of comments */}
        <div className="p-6 overflow-y-auto space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                item.selected
                  ? 'bg-black/30 border-white/20'
                  : 'bg-black/10 border-white/5 opacity-60'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSelect(item.id)}
                className="mt-1 text-slate-400 hover:text-white shrink-0"
              >
                {item.selected ? (
                  <CheckSquare className="w-5 h-5 text-[#2EE6A6]" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    Comment #{idx + 1}
                  </span>
                </div>
                <textarea
                  value={item.text}
                  onChange={(e) => updateText(item.id, e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white rounded-lg p-2 text-xs border border-white/10 focus:border-[#7C5CFF] focus:outline-none transition-colors resize-y"
                  placeholder="Review comment text..."
                />
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                title="Remove this item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No comments extracted. Click "Add Comment" to enter manually.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
          <span className="text-xs text-slate-400">
            <strong className="text-white font-mono">{selectedCount}</strong> comments selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={selectedCount === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] hover:opacity-90 shadow-md shadow-[#7C5CFF]/20 active:scale-95'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Analyse selected ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
