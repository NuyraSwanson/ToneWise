import React from 'react';

interface WaveformLogoProps {
  isAnalyzing?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const WaveformLogo: React.FC<WaveformLogoProps> = ({
  isAnalyzing = false,
  size = 'md',
}) => {
  const barHeights = isAnalyzing
    ? [14, 26, 18, 30, 22, 28, 16]
    : [8, 16, 12, 22, 14, 18, 10];

  const heightsClass = isAnalyzing
    ? ['h-3 animate-pulse', 'h-7 animate-bounce', 'h-4 animate-pulse', 'h-8 animate-bounce', 'h-5 animate-pulse', 'h-7 animate-bounce', 'h-3 animate-pulse']
    : ['h-2', 'h-4', 'h-3', 'h-6', 'h-3.5', 'h-4.5', 'h-2.5'];

  const dims = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  return (
    <div
      className={`relative ${dims} flex items-center justify-center rounded-xl bg-gradient-to-tr from-[#7C5CFF]/20 to-[#22D3EE]/20 border border-[#7C5CFF]/30 p-1.5 transition-all shadow-sm`}
      title={isAnalyzing ? 'Analyzing sentiment waveform...' : 'Tonewise Engine Idle'}
      aria-label="Tonewise waveform logo"
    >
      <div className="flex items-center justify-between w-full h-full gap-[2px]">
        {barHeights.map((_, i) => (
          <span
            key={i}
            className={`w-[2.5px] rounded-full transition-all duration-300 ${heightsClass[i]} ${
              i === 3
                ? 'bg-[#22D3EE]'
                : i % 2 === 0
                ? 'bg-[#7C5CFF]'
                : 'bg-[#2EE6A6]'
            }`}
            style={{
              animationDelay: `${i * 120}ms`,
              animationDuration: isAnalyzing ? '750ms' : '2000ms',
            }}
          />
        ))}
      </div>
    </div>
  );
};
