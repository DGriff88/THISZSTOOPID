import holographicCube from '../assets/holographic-cube.jpg';
import './AnimatedHolographicIcon.css';

interface AnimatedHolographicIconProps {
  size?: number;
  className?: string;
}

export function AnimatedHolographicIcon({ size = 64, className = '' }: AnimatedHolographicIconProps) {
  return (
    <div 
      className={`animated-holographic-icon ${className}`}
      style={{ width: size, height: size }}
      data-testid="animated-holographic-icon"
    >
      <img 
        src={holographicCube} 
        alt="TradeBotPro Holographic Icon"
        className="holographic-cube"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}