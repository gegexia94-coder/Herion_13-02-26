const LOGO_URL = 'https://customer-assets.emergentagent.com/job_ai-practice-manager/artifacts/bki0f2lu_560feac8-8d0d-487d-8f06-bef0f544b06a-1.png';

export function HerionBrand({ size = 32, className = '', showText = false }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="herion-brand">
      <img
        src={LOGO_URL}
        alt="Herion"
        className="object-contain"
        style={{ width: size, height: size }}
        data-testid="herion-logo-img"
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-[14px] font-bold tracking-tight text-[#0ABFCF]">Herion</span>
          <span className="text-[8px] text-[var(--text-muted)] tracking-wide">Virtual Accountant</span>
        </div>
      )}
    </div>
  );
}

export function HerionMark({ size = 32, className = '' }) {
  return (
    <img
      src={LOGO_URL}
      alt="H"
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      data-testid="herion-mark"
    />
  );
}

export function HerionMarkLight({ size = 32, className = '' }) {
  return (
    <img
      src={LOGO_URL}
      alt="H"
      className={`object-contain brightness-150 ${className}`}
      style={{ width: size, height: size }}
      data-testid="herion-mark-light"
    />
  );
}
