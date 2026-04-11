export function HerionBrand({ size = 32, className = '', showText = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="herion-brand">
      <HerionIcon size={size} />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-[14px] font-bold tracking-tight text-[#0ABFCF]">Herion</span>
          <span className="text-[8px] text-[var(--text-muted)] tracking-wide">Virtual Accountant</span>
        </div>
      )}
    </div>
  );
}

export function HerionIcon({ size = 28, color = '#0ABFCF' }) {
  const h = size;
  const w = Math.round(size * 0.88);
  return (
    <svg
      viewBox="0 0 28 32"
      width={w}
      height={h}
      fill="none"
      data-testid="herion-logo-icon"
    >
      {/* Left pillar — pill-shaped */}
      <rect x="1" y="1" width="8" height="30" rx="4" fill={color} />
      {/* Right pillar — pill-shaped */}
      <rect x="19" y="1" width="8" height="30" rx="4" fill={color} />
      {/* Bridge — connecting crossbar with subtle rounded ends */}
      <rect x="9" y="12.5" width="10" height="7" rx="3" fill={color} />
    </svg>
  );
}

export function HerionMark({ size = 32, className = '' }) {
  return (
    <div className={className}>
      <HerionIcon size={size} />
    </div>
  );
}

export function HerionMarkLight({ size = 32, className = '' }) {
  return (
    <div className={className}>
      <HerionIcon size={size} color="rgba(255,255,255,0.5)" />
    </div>
  );
}
