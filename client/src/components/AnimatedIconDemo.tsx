import { AnimatedHolographicIcon } from './AnimatedHolographicIcon';

export function AnimatedIconDemo() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          TradeBotPro Animated Icon
        </h1>
        <p className="text-gray-300">
          Your holographic cube icon with spinning, glowing, and floating animations!
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Small Icon */}
        <div className="text-center">
          <div className="mb-4">
            <AnimatedHolographicIcon size={48} />
          </div>
          <p className="text-white text-sm">Small (48px)</p>
          <p className="text-gray-400 text-xs">Navigation/Menu</p>
        </div>
        
        {/* Medium Icon */}
        <div className="text-center">
          <div className="mb-4">
            <AnimatedHolographicIcon size={128} />
          </div>
          <p className="text-white text-sm">Medium (128px)</p>
          <p className="text-gray-400 text-xs">Dashboard/Header</p>
        </div>
        
        {/* Large Icon */}
        <div className="text-center">
          <div className="mb-4">
            <AnimatedHolographicIcon size={256} />
          </div>
          <p className="text-white text-sm">Large (256px)</p>
          <p className="text-gray-400 text-xs">Landing Page</p>
        </div>
      </div>
      
      <div className="mt-12 text-center max-w-2xl">
        <h2 className="text-2xl font-semibold text-white mb-4">Animation Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="bg-gray-900 p-4 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-2">✨ 3D Rotation</h3>
            <p className="text-gray-300 text-sm">Smooth 8-second 360° spin with subtle X-axis tilt</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-2">💚 Holographic Glow</h3>
            <p className="text-gray-300 text-sm">Pulsing green glow that matches the cube's holographic nature</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-2">🌊 Floating Motion</h3>
            <p className="text-gray-300 text-sm">Gentle bobbing animation for a futuristic feel</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-2">🎨 Color Shimmer</h3>
            <p className="text-gray-300 text-sm">Subtle hue shifts that enhance the holographic effect</p>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white font-semibold mb-2">🎯 Hover Effects</h3>
          <p className="text-gray-300 text-sm">Try hovering over any icon above - animations speed up and the icon scales slightly!</p>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900 rounded-lg">
          <h3 className="text-blue-300 font-semibold mb-2">♿ Accessibility</h3>
          <p className="text-gray-300 text-sm">Respects "prefers-reduced-motion" - animations are disabled for users who prefer less motion</p>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-gray-400 text-sm">
          Ready to integrate into your TradeBotPro app! 🚀
        </p>
      </div>
    </div>
  );
}