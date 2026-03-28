import { useState, useEffect, useRef } from 'react';

const GAMES = [
  {
    id: 'snake',
    title: 'Snake',
    href: '/src/GAMES/snake/snake.html',
    preview: (
      <div className="game-preview" id="preview-snake">
        <div className="snake-body"></div>
      </div>
    )
  },
  {
    id: 'pong',
    title: 'Pong',
    href: '/src/GAMES/pong/pong.html',
    preview: (
      <div className="game-preview" id="preview-pong">
        <div className="paddle"></div>
        <div className="ball"></div>
        <div className="paddle"></div>
      </div>
    )
  },
  {
    id: 'tetris',
    title: 'Tetris',
    href: '/src/GAMES/tetris/tetris.html',
    preview: (
      <div className="game-preview" id="preview-tetris">
        <div className="tetromino"></div>
      </div>
    )
  },
  {
    id: 'quiz',
    title: 'Quiz Deluxe 3D',
    href: '/src/GAMES/super-quiz-runner/superquizrunner.html',
    preview: (
      <div className="game-preview" id="preview-quiz">
        <div className="question-mark">?</div>
      </div>
    )
  }
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const moveSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    moveSoundRef.current = document.getElementById('move-sound') as HTMLAudioElement;
    selectSoundRef.current = document.getElementById('select-sound') as HTMLAudioElement;
  }, []);

  const playSound = (sound: HTMLAudioElement | null) => {
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  };

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    
    setSelected(index);
    playSound(selectSoundRef.current);
    
    setTimeout(() => {
      const href = GAMES[index].href;
      if (href && href !== '#') {
        window.location.href = href;
      } else {
        setSelected(null);
      }
    }, 500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selected !== null) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : GAMES.length - 1));
          playSound(moveSoundRef.current);
          break;
        case 'arrowright':
        case 'd':
          setCurrentIndex((prev) => (prev < GAMES.length - 1 ? prev + 1 : 0));
          playSound(moveSoundRef.current);
          break;
        case 'enter':
        case ' ':
          handleSelect(currentIndex);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, selected]);

  return (
    <div className="screen-container">
      <h1 className="title">TRYMON GAME ENGINE</h1>

      <div className="selection-carousel" id="carousel">
        {GAMES.map((game, index) => {
          const isActive = index === currentIndex;
          const isSelected = selected === index;
          
          let classNames = 'game-card';
          if (isActive) classNames += ' active';
          if (isSelected) classNames += ' selected';

          return (
            <div
              key={game.id}
              className={classNames}
              onClick={() => {
                if (!isActive) {
                  setCurrentIndex(index);
                  playSound(moveSoundRef.current);
                } else {
                  handleSelect(index);
                }
              }}
            >
              <h2>{game.title}</h2>
              {game.preview}
            </div>
          );
        })}
      </div>

      <p className="instructions">Use [A/D] ou [Setas] para navegar. [Enter] para selecionar.</p>
    </div>
  );
}
