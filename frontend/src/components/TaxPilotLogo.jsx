import { FileText, Navigation, Layers } from 'lucide-react';

// TaxPilot Logo Component - Geometric, Modern, Professional
export function TaxPilotLogo({ size = 'md', variant = 'full', className = '' }) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-2xl' },
    xl: { icon: 64, text: 'text-3xl' }
  };

  const { icon, text } = sizes[size] || sizes.md;

  // SVG Logo Mark - Geometric arrow/navigation symbol representing direction and flow
  const LogoMark = () => (
    <svg 
      width={icon} 
      height={icon} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Background geometric shape */}
      <rect x="4" y="4" width="40" height="40" rx="8" fill="#0F4C5C" />
      
      {/* Primary arrow/pilot navigation symbol */}
      <path 
        d="M24 10L38 24L24 38L18 32L26 24L18 16L24 10Z" 
        fill="#5DD9C1"
      />
      
      {/* Secondary modular blocks representing practices */}
      <rect x="10" y="18" width="6" height="6" rx="1" fill="#5DD9C1" opacity="0.7" />
      <rect x="10" y="26" width="6" height="6" rx="1" fill="#5DD9C1" opacity="0.5" />
    </svg>
  );

  // Icon-only variant
  if (variant === 'icon') {
    return <LogoMark />;
  }

  // Full logo with text
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark />
      {variant === 'full' && (
        <span className={`font-bold tracking-tight text-[#0F4C5C] ${text}`}>
          TaxPilot
        </span>
      )}
    </div>
  );
}

// Alternative Logo Mark - More abstract geometric pattern
export function TaxPilotLogoAlt({ size = 32, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hexagonal base representing structure */}
      <path 
        d="M24 4L42 14V34L24 44L6 34V14L24 4Z" 
        fill="#0F4C5C"
      />
      
      {/* Inner navigation arrow */}
      <path 
        d="M20 16L32 24L20 32V16Z" 
        fill="#5DD9C1"
      />
      
      {/* Flow lines */}
      <path 
        d="M12 20L16 24L12 28" 
        stroke="#5DD9C1" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

export default TaxPilotLogo;
