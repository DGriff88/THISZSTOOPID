import holographicCube from '../assets/holographic-cube.jpg';
import './HolographicIcon.css';

interface AnimatedHolographicIconProps {
  size?: number;
  className?: string;
}

export function AnimatedHolographicIcon({ size = 64, className = '' }: AnimatedHolographicIconProps) {
  return (
    <div 
      className={`pirate-icon-container ${className}`}
      style={{ width: size, height: size }}
      data-testid="animated-holographic-icon"
    >
      <img 
        src={holographicCube} 
        alt="PIR4T3 TRADER Holographic Icon"
        className="pirate-icon-image"
        style={{ 
          width: '100%', 
          height: '100%'
        }}
      />
    </div>
  );
}