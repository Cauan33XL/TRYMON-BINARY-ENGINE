import React from 'react';


/**
 * Very basic ANSI parser for Trymon Native Terminal
 * Converts standard \x1b[...m codes to React segments
 */
export function parseAnsi(input: string): React.ReactNode[] {
  if (!input) return [];

  // Split by ANSI escape sequences
  const parts = input.split(/\x1b\[([\d;]*)m/);
  const elements: React.ReactNode[] = [];
  
  let currentColor = '';
  let isBold = false;

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Even parts are text
      if (parts[i]) {
        elements.push(
          <span 
            key={i} 
            style={{ 
              color: currentColor || 'inherit', 
              fontWeight: isBold ? 'bold' : 'normal',
              whiteSpace: 'pre-wrap'
            }}
          >
            {parts[i]}
          </span>
        );
      }
    } else {
      // Odd parts are ANSI codes (e.g. "1;33" or "0")
      const codes = parts[i].split(';');
      for (const code of codes) {
        const n = parseInt(code, 10);
        if (n === 0) { currentColor = ''; isBold = false; }
        else if (n === 1) { isBold = true; }
        else if (n >= 30 && n <= 37) {
          const colors = ['#30363d', '#ff7b72', '#7ee787', '#ffa657', '#79c0ff', '#d2a8ff', '#00f2ff', '#c9d1d9'];
          currentColor = colors[n - 30];
        }
        else if (n >= 90 && n <= 97) {
          const brightColors = ['#6e7681', '#ffa198', '#aff5b4', '#ffd477', '#a5d6ff', '#e2a5ff', '#76e3ff', '#f0f6fc'];
          currentColor = brightColors[n - 90];
        }
      }
    }
  }

  return elements;
}
