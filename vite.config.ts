import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pong: resolve(__dirname, 'src/GAMES/pong/pong.html'),
        snake: resolve(__dirname, 'src/GAMES/snake/snake.html'),
        quiz: resolve(__dirname, 'src/GAMES/super-quiz-runner/superquizrunner.html'),
        tetris: resolve(__dirname, 'src/GAMES/tetris/tetris.html'),
      },
    },
  },
});
