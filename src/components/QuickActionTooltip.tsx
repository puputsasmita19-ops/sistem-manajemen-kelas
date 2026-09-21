import React from 'react';

export interface QuickActionTooltipProps {
  id?: string;
  label: string;
  description: string;
  badge?: string;
  position?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
  children: React.ReactNode;
}

export const QuickActionTooltip: React.FC<QuickActionTooltipProps> = ({
  id,
  label,
  description,
  badge,
  position = 'bottom',
  align = 'center',
  children
}) => {
  const tooltipId = id || `tooltip-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  // Alignment classes for tooltip positioning
  const alignClass =
    align === 'right'
      ? 'right-0'
      : align === 'left'
      ? 'left-0'
      : 'left-1/2 -translate-x-1/2';

  // Arrow alignment
  const arrowAlignClass =
    align === 'right'
      ? 'right-5'
      : align === 'left'
      ? 'left-5'
      : 'left-1/2 -translate-x-1/2';

  // Position classes
  const posClass =
    position === 'bottom'
      ? 'top-full mt-2.5 origin-top'
      : 'bottom-full mb-2.5 origin-bottom';

  // Arrow styling for top/bottom
  const arrowClass =
    position === 'bottom'
      ? '-top-1 border-t border-l border-slate-700/80 bg-slate-900 dark:bg-slate-950'
      : '-bottom-1 border-b border-r border-slate-700/80 bg-slate-900 dark:bg-slate-950';

  return (
    <div className="group relative inline-flex items-center">
      {/* Target button / interactive trigger */}
      {children}

      {/* Floating Accessible Tooltip Card */}
      <div
        id={tooltipId}
        role="tooltip"
        className={`absolute ${posClass} ${alignClass} w-60 sm:w-68 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-xl border border-slate-700/90 shadow-2xl backdrop-blur-md z-50 pointer-events-none opacity-0 invisible scale-95 group-hover:opacity-100 group-hover:visible group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:scale-100 transition-all duration-150 ease-out text-left select-none`}
      >
        {/* Tooltip Header: Label & Optional Badge */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
            {label}
          </span>
          {badge && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
              {badge}
            </span>
          )}
        </div>

        {/* Tooltip Body: Meaningful explanation */}
        <p className="text-[11px] leading-relaxed text-slate-300 font-normal">
          {description}
        </p>

        {/* Pointer Arrow Indicator */}
        <div
          className={`absolute ${arrowClass} ${arrowAlignClass} w-2.5 h-2.5 rotate-45 pointer-events-none`}
        />
      </div>
    </div>
  );
};
