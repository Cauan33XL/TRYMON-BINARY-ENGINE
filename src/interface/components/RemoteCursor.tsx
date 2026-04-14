import React from 'react';
import { MousePointer2 } from 'lucide-react';

interface RemoteCursorProps {
  x: number;
  y: number;
  name: string;
  color?: string;
}

export const RemoteCursor: React.FC<RemoteCursorProps> = ({ x, y, name, color = '#00f2ff' }) => {
  return (
    <div 
      className="remote-cursor"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'all 0.1s linear',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}
    >
      <MousePointer2 
        size={20} 
        fill={color} 
        stroke="white" 
        strokeWidth={1.5}
        style={{ transform: 'rotate(-90deg)' }} 
      />
      <div 
        style={{
          background: color,
          color: 'black',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '4px',
          marginTop: '4px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          opacity: 0.9
        }}
      >
        {name}
      </div>
    </div>
  );
};
