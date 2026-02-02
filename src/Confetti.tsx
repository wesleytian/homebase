import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  shape: 'circle' | 'rect' | 'strip';
  dx: number; // horizontal velocity
  dy: number; // vertical velocity (negative = up)
  rotation: number;
  delay: number;
}

interface Props {
  x: number;
  y: number;
  onComplete: () => void;
}

const COLORS = ['#f5a623', '#4ecdc4', '#9b8cff', '#ff6b6b', '#45b7aa', '#ffd93d', '#ff9ff3', '#48dbfb'];
const SHAPES: ('circle' | 'rect' | 'strip')[] = ['circle', 'rect', 'strip'];

export function Confetti({ x, y, onComplete }: Props) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 120;
      newPieces.push({
        id: i,
        x,
        y,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 6,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 60, // bias upward
        rotation: Math.random() * 360,
        delay: Math.random() * 80,
      });
    }
    setPieces(newPieces);

    const timer = setTimeout(onComplete, 900);
    return () => clearTimeout(timer);
  }, [x, y, onComplete]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {pieces.map((piece) => {
        const borderRadius = piece.shape === 'circle' ? '50%' : piece.shape === 'strip' ? '1px' : '2px';
        const width = piece.shape === 'strip' ? piece.size * 0.4 : piece.size;
        const height = piece.shape === 'strip' ? piece.size * 1.5 : piece.size;
        return (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              position: 'absolute',
              left: piece.x,
              top: piece.y,
              width,
              height,
              backgroundColor: piece.color,
              borderRadius,
              transform: `rotate(${piece.rotation}deg)`,
              animationDelay: `${piece.delay}ms`,
              // CSS custom properties for the animation
              '--dx': `${piece.dx}px`,
              '--dy': `${piece.dy}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
