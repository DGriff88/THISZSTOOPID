import holographicCube from '../assets/holographic-cube.jpg';

interface AnimatedHolographicIconProps {
  size?: number;
  className?: string;
}

export function AnimatedHolographicIcon({ size = 64, className = '' }: AnimatedHolographicIconProps) {
  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{ 
        width: size, 
        height: size,
        animation: 'float 3s ease-in-out infinite',
        filter: 'drop-shadow(0 0 10px rgba(0, 255, 150, 0.3))'
      }}
      data-testid="animated-holographic-icon"
    >
      <img 
        src={holographicCube} 
        alt="TradeBotPro Holographic Icon"
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'cover',
          borderRadius: '12px',
          animation: 'spin 8s linear infinite, glow 2s ease-in-out infinite alternate, shimmer 4s ease-in-out infinite',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.animationDuration = '2s, 1s, 2s';
          e.currentTarget.style.filter = 'brightness(1.2) contrast(1.1)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.animationDuration = '8s, 2s, 4s';
          e.currentTarget.style.filter = '';
          e.currentTarget.style.transform = '';
        }}
      />
      
      <style>{`
        @keyframes spin {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          25% { transform: rotateY(90deg) rotateX(5deg); }
          50% { transform: rotateY(180deg) rotateX(0deg); }
          75% { transform: rotateY(270deg) rotateX(-5deg); }
          100% { transform: rotateY(360deg) rotateX(0deg); }
        }
        
        @keyframes glow {
          0% { 
            box-shadow: 
              0 0 20px rgba(0, 255, 150, 0.4),
              0 0 30px rgba(0, 255, 150, 0.2),
              inset 0 0 15px rgba(0, 255, 150, 0.1);
          }
          100% { 
            box-shadow: 
              0 0 30px rgba(0, 255, 150, 0.8),
              0 0 40px rgba(0, 255, 150, 0.4),
              inset 0 0 25px rgba(0, 255, 150, 0.2);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes shimmer {
          0% { filter: hue-rotate(0deg) brightness(1); }
          33% { filter: hue-rotate(60deg) brightness(1.1); }
          66% { filter: hue-rotate(-30deg) brightness(0.9); }
          100% { filter: hue-rotate(0deg) brightness(1); }
        }
        
        @media (prefers-reduced-motion: reduce) {
          div[data-testid="animated-holographic-icon"] {
            animation: none !important;
          }
          div[data-testid="animated-holographic-icon"] img {
            animation: glow 3s ease-in-out infinite alternate !important;
          }
        }
      `}</style>
    </div>
  );
}