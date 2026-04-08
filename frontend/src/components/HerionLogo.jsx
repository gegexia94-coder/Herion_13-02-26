// Herion Logo Component - Premium, Minimal, Geometric
export function HerionLogo({ size = 'md', variant = 'full', className = '' }) {
  const sizes = {
    sm: { icon: 28, text: 'text-lg' },
    md: { icon: 36, text: 'text-xl' },
    lg: { icon: 48, text: 'text-2xl' },
    xl: { icon: 64, text: 'text-3xl' }
  };

  const { icon, text } = sizes[size] || sizes.md;

  // Abstract "H" Logo Mark - Geometric, Premium, Minimal
  const LogoMark = () => (
    <svg 
      width={icon} 
      height={icon} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Background shape with subtle gradient effect */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#0F4C5C" />
      
      {/* Abstract "H" formed by geometric shapes */}
      <path 
        d="M14 12V36" 
        stroke="#5DD9C1" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <path 
        d="M34 12V36" 
        stroke="#5DD9C1" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <path 
        d="M14 24H34" 
        stroke="#5DD9C1" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      
      {/* Accent element - small diamond for premium touch */}
      <path 
        d="M24 18L27 21L24 24L21 21L24 18Z" 
        fill="#5DD9C1"
        opacity="0.6"
      />
    </svg>
  );

  // Icon-only variant
  if (variant === 'icon') {
    return <LogoMark />;
  }

  // Full logo with text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark />
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className={`font-semibold tracking-tight text-[#0F4C5C] ${text}`}>
            Herion
          </span>
          {size === 'lg' || size === 'xl' ? (
            <span className="text-[10px] tracking-[0.15em] uppercase text-[#5C5C59] font-medium">
              Precision. Control. Confidence.
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Compact logo for navbar
export function HerionLogoCompact({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="2" width="44" height="44" rx="12" fill="#0F4C5C" />
        <path d="M14 12V36" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
        <path d="M34 12V36" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
        <path d="M14 24H34" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
        <path d="M24 18L27 21L24 24L21 21L24 18Z" fill="#5DD9C1" opacity="0.6"/>
      </svg>
      <span className="text-xl font-semibold tracking-tight text-[#0F4C5C]">
        Herion
      </span>
    </div>
  );
}

export default HerionLogo;
