export type DecorVariant = 'shoe' | 'tshirt' | 'keychain' | 'can' | 'sticker' | 'toy_car' | 'abstract_blob';

interface FloatingDecorProps {
  variant: DecorVariant;
  className?: string;
  delay?: number;
}

export default function FloatingDecor({ variant, className = '', delay = 0 }: FloatingDecorProps) {
  const baseClasses = `absolute pointer-events-none select-none z-0 opacity-25 animate-float`;
  const style = { animationDelay: `${delay}s` };

  const getSvgContent = () => {
    switch (variant) {
      case 'shoe':
        return (
          <svg viewBox="0 0 120 80" fill="none" className="w-full h-full">
            <path d="M25,65 L90,65 C95,65 100,60 100,55 C100,45 90,40 80,35 C75,32 70,25 70,18 C70,12 62,12 55,18 L35,38 L25,38 C18,38 12,43 12,52 C12,60 18,65 25,65 Z" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <path d="M35,38 L52,52" stroke="#F5B82E" strokeWidth="2" strokeLinecap="round"/>
            <path d="M45,28 L62,42" stroke="#F5B82E" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="55" x2="100" y2="55" stroke="#111" strokeWidth="2"/>
            <circle cx="35" cy="65" r="3" fill="#E85D4E"/>
            <circle cx="80" cy="65" r="3" fill="#E85D4E"/>
          </svg>
        );
      case 'tshirt':
        return (
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <path d="M35,15 L25,15 L10,30 L20,35 L25,30 L25,85 L75,85 L75,30 L80,35 L90,30 L75,15 L65,15" fill="#FFF8E7" stroke="#111" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M35,15 C35,15 40,25 50,25 C60,25 65,15 65,15" stroke="#111" strokeWidth="2" fill="none"/>
            <circle cx="50" cy="55" r="8" fill="#F5B82E" stroke="#111" strokeWidth="1.5"/>
            <path d="M47,55 L50,58 L54,52" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'keychain':
        return (
          <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
            <circle cx="40" cy="25" r="12" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <circle cx="40" cy="25" r="5" fill="none" stroke="#F5B82E" strokeWidth="1.5"/>
            <rect x="32" y="37" width="16" height="45" rx="4" fill="#FAF3E0" stroke="#111" strokeWidth="2"/>
            <rect x="36" y="52" width="8" height="5" rx="2" fill="#3FA34D"/>
            <path d="M40,15 L40,8" stroke="#E85D4E" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="40" cy="6" r="3" fill="none" stroke="#E85D4E" strokeWidth="1.5"/>
          </svg>
        );
      case 'can':
        return (
          <svg viewBox="0 0 60 100" fill="none" className="w-full h-full">
            <ellipse cx="30" cy="20" rx="22" ry="8" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <rect x="8" y="20" width="44" height="60" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <ellipse cx="30" cy="80" rx="22" ry="8" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <rect x="12" y="35" width="36" height="30" rx="3" fill="#F5B82E" stroke="#111" strokeWidth="1.5"/>
            <text x="30" y="54" textAnchor="middle" fill="#111" fontSize="10" fontWeight="bold">TD</text>
            <ellipse cx="30" cy="15" rx="10" ry="3" fill="none" stroke="#111" strokeWidth="1"/>
          </svg>
        );
      case 'sticker':
        return (
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <path d="M50,5 L61,35 L95,35 L68,55 L79,87 L50,68 L21,87 L32,55 L5,35 L39,35 Z" fill="#F5B82E" stroke="#111" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="50" cy="50" r="12" fill="#E85D4E" stroke="#111" strokeWidth="1.5"/>
            <path d="M45,50 L48,53 L55,46" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'toy_car':
        return (
          <svg viewBox="0 0 120 70" fill="none" className="w-full h-full">
            <path d="M20,45 L30,25 C32,22 38,20 42,20 L78,20 C82,20 85,22 87,25 L100,45" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <rect x="10" y="42" width="100" height="18" rx="6" fill="#FAF3E0" stroke="#111" strokeWidth="2"/>
            <circle cx="35" cy="60" r="8" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <circle cx="35" cy="60" r="3" fill="#3FA34D"/>
            <circle cx="85" cy="60" r="8" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <circle cx="85" cy="60" r="3" fill="#3FA34D"/>
            <rect x="42" y="28" width="20" height="14" rx="2" fill="#2A8CD8" stroke="#111" strokeWidth="1.5"/>
            <rect x="68" y="28" width="14" height="14" rx="2" fill="#2A8CD8" stroke="#111" strokeWidth="1.5"/>
          </svg>
        );
      case 'abstract_blob':
        return (
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <path d="M50,10 C70,10 90,25 90,50 C90,75 70,90 50,90 C30,90 15,80 10,60 C5,40 30,10 50,10 Z" fill="#FFF8E7" stroke="#111" strokeWidth="2"/>
            <circle cx="40" cy="40" r="6" fill="#E85D4E"/>
            <circle cx="60" cy="55" r="8" fill="#2A8CD8"/>
            <circle cx="45" cy="65" r="4" fill="#3FA34D"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${baseClasses} ${className}`} style={style} aria-hidden="true">
      {getSvgContent()}
    </div>
  );
}
