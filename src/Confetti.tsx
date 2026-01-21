import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  delay: number;
}

interface Props {
  x: number;
  y: number;
  onComplete: () => void;
}

const COLORS = ['#f5a623', '#4ecdc4', '#9b8cff', '#ff6b6b', '#45b7aa', '#ffd93d'];

export function Confetti({ x, y, onComplete }: Props) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 12; i++) {
      newPieces.push({
        id: i,
        x: x + (Math.random() - 0.5) * 20,
        y: y,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 50,
      });
    }
    setPieces(newPieces);

    // Remove after animation
    const timer = setTimeout(() => {
      onComplete();
    }, 800);

    return () => clearTimeout(timer);
  }, [x, y, onComplete]);

  return (
    <div className="confetti-container" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            position: 'absolute',
            left: piece.x,
            top: piece.y,
            width: 8,
            height: 8,
            backgroundColor: piece.color,
            borderRadius: piece.id % 2 === 0 ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
            animationDelay: `${piece.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
