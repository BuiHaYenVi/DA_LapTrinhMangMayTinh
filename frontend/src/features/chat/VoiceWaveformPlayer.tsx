import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCheck } from 'lucide-react';

interface VoiceWaveformPlayerProps {
  duration?: string;
  timestamp?: string;
  isOutgoing?: boolean;
}

export const VoiceWaveformPlayer: React.FC<VoiceWaveformPlayerProps> = ({
  duration = '2:19',
  timestamp = '10:41 am',
  isOutgoing = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBar, setActiveBar] = useState(0);

  // 36 simulated audio waveform bars with varying heights matching reference design
  const barHeights = [
    8, 14, 18, 12, 24, 16, 28, 20, 14, 22, 16, 26, 32, 18, 22, 14, 28, 20,
    12, 24, 30, 16, 22, 14, 18, 26, 20, 12, 16, 22, 18, 12, 16, 10, 14, 8,
  ];

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveBar((prev) => (prev + 1) % barHeights.length);
      }, 120);
    }
    return () => clearInterval(timer);
  }, [isPlaying, barHeights.length]);

  return (
    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} my-2`}>
      <div
        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-full border shadow-xs transition-all ${
          isOutgoing
            ? 'bg-white dark:bg-[#1A2520] border-[#E5EFE9] dark:border-[#2C3E36] text-[#0F172A] dark:text-[#F8FAFC]'
            : 'bg-[#111820] dark:bg-[#1A2520] border-transparent text-white'
        }`}
      >
        {/* Circular Play / Pause Button */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Tạm dừng ghi âm' : 'Phát tin nhắn thoại'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${
            isOutgoing
              ? 'bg-[#111820] text-white hover:bg-black dark:bg-emerald-500 dark:text-[#090E0C]'
              : 'bg-white text-[#111820] hover:bg-slate-100 dark:bg-emerald-500 dark:text-[#090E0C]'
          }`}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Audio Waveform Bars */}
        <div className="flex items-center gap-[2.5px] h-8 px-1">
          {barHeights.map((h, idx) => {
            const isPassed = idx <= activeBar && isPlaying;
            return (
              <span
                key={idx}
                style={{ height: `${h}px` }}
                className={`w-[2.5px] rounded-full transition-all duration-100 ${
                  isPassed
                    ? 'bg-[#10B981]'
                    : isOutgoing
                    ? 'bg-[#0F172A]/70 dark:bg-slate-300'
                    : 'bg-white/70'
                }`}
              />
            );
          })}
        </div>

        {/* Duration text */}
        <span className="font-mono text-xs font-semibold shrink-0 opacity-80">
          {duration}
        </span>
      </div>

      {/* Timestamp & Delivery Tick below the waveform */}
      <div className="flex items-center gap-1.5 mt-1 px-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
        <span>{timestamp}</span>
        {isOutgoing && <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" />}
      </div>
    </div>
  );
};
