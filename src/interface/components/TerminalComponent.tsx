import { useEffect, useRef, useState } from 'react';
import { parseAnsi } from './AnsiParser';
import { useKernelState } from '../hooks/useKernelState';

interface TerminalProps {
  onInput: (data: string) => void;
  output?: string;
  isRunning: boolean;
  className?: string;
  userName?: string;
}

export function TerminalComponent({ onInput, output = '', isRunning, className, userName = 'trymon' }: TerminalProps) {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get full kernel state for better overlay messages
  const { state: kernelState } = useKernelState();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output, isRunning]);

  // Focus input on click
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmd = inputValue;
      onInput(cmd + '\n');
      
      if (cmd.trim()) {
        setHistory(prev => [cmd, ...prev.slice(0, 49)]);
      }
      setInputValue('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInputValue(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputValue(history[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInputValue('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  };

  // Logic to separate prompt from output
  const allLines = output.split('\n');
  const lastLine = allLines[allLines.length - 1];
  
  // Detect if the last line is a prompt: "root@trymon :/#" or similar
  const isPromptLine = lastLine.includes('@trymon') && (lastLine.endsWith('# ') || lastLine.endsWith('$ '));
  
  const displayLines = isPromptLine ? allLines.slice(0, -1) : allLines;
  const currentPrompt = isPromptLine ? lastLine.replace('root', userName) : '';

  // Determine the correct message for the overlay
  const getOverlayMessage = () => {
    if (kernelState.state === 'Booting') return 'INITIALIZING NATIVE KERNEL...';
    if (kernelState.state === 'Halted') return 'KERNEL HALTED';
    return 'SYSTEM OFFLINE';
  };

  return (
    <div 
      className={`native-terminal-container ${className || ''}`}
      onClick={handleContainerClick}
      style={{
        width: '100%',
        height: '100%',
        background: '#0d1117',
        color: '#c9d1d9',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '14px',
        padding: '12px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text',
        position: 'relative'
      }}
      ref={scrollRef}
    >
      <div className="terminal-scrollback">
        {displayLines.map((line, idx) => (
          <div key={idx} className="terminal-line" style={{ minHeight: '1.2em', lineHeight: '1.4' }}>
            {parseAnsi(line)}
          </div>
        ))}
      </div>
      
      <div className="terminal-input-line" style={{ 
        display: 'flex', 
        gap: '4px', 
        marginTop: '2px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {isPromptLine && (
          <span className="terminal-prompt" style={{ 
            color: 'var(--accent-cyan, #00f2ff)',
            fontWeight: 'bold',
            whiteSpace: 'pre'
          }}>
            {currentPrompt}
          </span>
        )}
        <input 
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            flex: 1,
            minWidth: '50px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            padding: 0,
            margin: 0,
            caretColor: 'var(--accent-cyan, #00f2ff)'
          }}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      
      {!isRunning && (
        <div className="terminal-overlay" style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(13, 17, 23, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            color: kernelState.state === 'Booting' ? 'var(--accent-cyan, #00f2ff)' : 'var(--accent-red, #ff5f5f)', 
            fontWeight: 'bold',
            letterSpacing: '2px',
            fontSize: '16px',
            textTransform: 'uppercase'
          }}>
            {getOverlayMessage()}
          </div>
        </div>
      )}
    </div>
  );
}