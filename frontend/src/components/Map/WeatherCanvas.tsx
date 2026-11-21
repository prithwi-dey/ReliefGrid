import React, { useEffect, useRef } from 'react';

interface WeatherCanvasProps {
  enabled: boolean;
  intensity?: number;
}

export const WeatherCanvas: React.FC<WeatherCanvasProps> = ({ enabled, intensity = 1.0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 1000);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 750);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Particle pool for rain drops
    const dropsCount = Math.floor(120 * intensity);
    const drops: Array<{ x: number; y: number; speed: number; length: number; opacity: number }> = [];

    for (let i = 0; i < dropsCount; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 12 + Math.random() * 10,
        length: 10 + Math.random() * 12,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render rain streaks
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
      ctx.lineWidth = 1.2;

      for (const d of drops) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 3, d.y + d.length);
        ctx.stroke();

        d.x -= 1.5; // slight wind slant
        d.y += d.speed;

        if (d.y > height) {
          d.y = -d.length;
          d.x = Math.random() * (width + 100);
        }
        if (d.x < -10) {
          d.x = width + 10;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, intensity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 opacity-75"
    />
  );
};
