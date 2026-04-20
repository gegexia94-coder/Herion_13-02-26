const LOGO_SRC = '/herion-logo.png';

export function HerionBrand({ size = 32, className = '', showText = false }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="herion-brand">
      <img src={LOGO_SRC} alt="Herion" width={size} height={size} className="object-contain" style={{ imageRendering: 'auto' }} />
      {showText && (
        <span className="text-[15px] font-extrabold tracking-tight text-[#0A192F]">Herion</span>
      )}
    </div>
  );
}

export function HerionIcon({ size = 28 }) {
  return <img src={LOGO_SRC} alt="H" width={size} height={size} className="object-contain" data-testid="herion-logo-icon" />;
}

export function HerionMark({ size = 32, className = '' }) {
  return <div className={className}><img src={LOGO_SRC} alt="Herion" width={size} height={size} className="object-contain" /></div>;
}

export function HerionMarkLight({ size = 32, className = '' }) {
  return <div className={className}><img src={LOGO_SRC} alt="Herion" width={size} height={size} className="object-contain opacity-60" /></div>;
}

export function HerionHeroLogo({ className = '' }) {
  return <img src={LOGO_SRC} alt="Herion" className={`object-contain ${className}`} width={80} height={80} />;
}
