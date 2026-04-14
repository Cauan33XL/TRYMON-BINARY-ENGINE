import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Plus } from 'lucide-react';

export default function TerminalApp({ kernelShell }: { kernelShell: any }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([
    '\x1b[1;36mTRYMON Shell v1.0.0\x1b[0m ready.',
    'Type "help" for available commands.',
    '',
    kernelShell.prompt || '\x1b[1;32mroot@trymon:~#\x1b[0m '
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    setOutput(prev => [...prev, `\x1b[1;32mroot@trymon:~#\x1b[0m ${cmd}`]);
    setHistory(prev => [cmd, ...prev]);
    setHistoryIndex(-1);
    setInput('');

    if (cmd === '') {
      setOutput(prev => [...prev, '\x1b[1;32mroot@trymon:~#\x1b[0m ']);
      return;
    }

    if (kernelShell?.ready) {
      const result = kernelShell.sendInput(cmd + '\n');
      setOutput(prev => [...prev, result || '', '\x1b[1;32mroot@trymon:~#\x1b[0m ']);
    } else {
      setOutput(prev => [...prev, `\x1b[1;31mKernel not ready — commands will be queued\x1b[0m`, '\x1b[1;32mroot@trymon:~#\x1b[0m ']);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="terminal-window">
      <div className="terminal-tabs">
        <div className="terminal-tab active">
          <Terminal size={14} />
          <span>bash</span>
          <button className="tab-close"><X size={10} /></button>
        </div>
        <button className="terminal-tab-add"><Plus size={14} /></button>
      </div>
      <div className="terminal-output" ref={outputRef}>
        {output.map((line, i) => (
          <div key={i} className="terminal-line" dangerouslySetInnerHTML={{ __html: line }} />
        ))}
      </div>
      <form onSubmit={handleSubmit} className="terminal-input-line">
        <span className="prompt">root@trymon:~# </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </form>
    </div>
  );
}
