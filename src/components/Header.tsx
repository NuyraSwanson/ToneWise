import React, { useState } from 'react';
import { WaveformLogo } from './WaveformLogo';
import { Download, Trash2, Sun, Moon, Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ModelLoadingState } from '../types';

interface HeaderProps {
  isAnalyzing: boolean;
  modelState: ModelLoadingState;
  vaderOnly: boolean;
  onToggleVaderOnly: (val: boolean) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onClearSession: () => void;
  onExportCsv: () => void;
  itemCount: number;
  onPreloadModel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAnalyzing,
  modelState,
  vaderOnly,
  onToggleVaderOnly,
  isDarkMode,
  onToggleTheme,
  onClearSession,
  onExportCsv,
  itemCount,
  onPreloadModel,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0F0B2E]/90 dark:bg-[#0F0B2E]/90 light:bg-white/90 backdrop-blur-md transition-colors">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <WaveformLogo isAnalyzing={isAnalyzing} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-outfit text-lg font-bold tracking-tight text-white dark:text-white light:text-slate-900">
                Tonewise
              </span>
              <span className="hidden sm:inline-block text-[11px] px-1.5 py-0.5 rounded bg-[#7C5CFF]/20 text-[#A78BFA] border border-[#7C5CFF]/30 font-mono">
                Dual Engine
              </span>
            </div>
            <p className="hidden md:block text-xs text-slate-400">
              Read the tone of reviews, comments & sentences.
            </p>
          </div>
        </div>

        {/* Center: Hugging Face Model Status / VADER Toggle */}
        <div className="flex items-center gap-3">
          {/* Hugging Face unloaded prompt */}
          {modelState.status === 'unloaded' && !vaderOnly && onPreloadModel && (
            <button
              onClick={onPreloadModel}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7C5CFF]/20 hover:bg-[#7C5CFF]/30 border border-[#7C5CFF]/40 text-xs text-[#22D3EE] transition-all"
              title="Click to initialize local Hugging Face RoBERTa model"
            >
              <span>🤗 Load Hugging Face</span>
            </button>
          )}

          {/* Download progress bar if model is downloading */}
          {modelState.status === 'loading' && !vaderOnly && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 max-w-xs">
              <Cpu className="w-3.5 h-3.5 text-[#22D3EE] animate-pulse shrink-0" />
              <div className="flex flex-col gap-1 w-36">
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span className="truncate">🤗 Hugging Face RoBERTa</span>
                  <span className="font-mono tabular-nums">{modelState.progress}%</span>
                </div>
                <div className="w-full bg-slate-700/60 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] h-1 transition-all duration-300"
                    style={{ width: `${modelState.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {modelState.status === 'ready' && !vaderOnly && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2EE6A6]/10 border border-[#2EE6A6]/20 text-[11px] text-[#2EE6A6]"
              title={`Loaded locally via ${modelState.device?.toUpperCase() || 'WASM'}. Cached in browser.`}
            >
              <CheckCircle2 className="w-3 h-3 text-[#2EE6A6]" />
              <span className="font-mono">🤗 HF RoBERTa ({modelState.device?.toUpperCase() || 'WASM'})</span>
            </div>
          )}

          {modelState.status === 'error' && !vaderOnly && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFC145]/10 border border-[#FFC145]/30 text-[11px] text-[#FFC145]"
              title={modelState.statusText}
            >
              <AlertCircle className="w-3 h-3 text-[#FFC145]" />
              <span>VADER Fallback Active</span>
            </div>
          )}

          {/* VADER-only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
            <input
              type="checkbox"
              checked={vaderOnly}
              onChange={(e) => onToggleVaderOnly(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#7C5CFF] relative"></div>
            <span className="whitespace-nowrap font-medium text-[11px] sm:text-xs">
              VADER only
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            disabled={itemCount === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
              itemCount > 0
                ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 active:scale-95'
                : 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed opacity-50'
            }`}
            title="Export all analyzed reviews as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Clear Session */}
          {showClearConfirm ? (
            <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/50 rounded-lg p-0.5">
              <span className="text-[11px] text-red-200 px-1.5">Clear all?</span>
              <button
                onClick={() => {
                  onClearSession();
                  setShowClearConfirm(false);
                }}
                className="px-2 py-1 text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 text-[11px] text-slate-300 hover:text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (itemCount > 0) setShowClearConfirm(true);
              }}
              disabled={itemCount === 0}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-all shrink-0 ${
                itemCount > 0
                  ? 'bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border-white/10 hover:border-red-500/30'
                  : 'text-slate-600 border-transparent cursor-not-allowed'
              }`}
              title="Clear current session reviews from localStorage"
            >
              <Trash2 className="w-4 h-4 sm:mr-1 inline" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-300 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle visual theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
