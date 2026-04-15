import { useCallback } from 'react';
import { Terminal as TerminalIcon, X, Plus } from 'lucide-react';
import { TerminalComponent } from '../../interface/components/TerminalComponent';
import { useKernelShell } from '../../interface/hooks/useKernelState';

export default function TerminalApp({ userName }: { userName: string }) {
  const kernelShell = useKernelShell();
  
  const handleInput = useCallback((data: string) => {
    if (kernelShell?.sendInput) {
      kernelShell.sendInput(data);
    }
  }, [kernelShell]);

  return (
    <div className="terminal-window" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117' }}>
      <div className="terminal-tabs" style={{ flexShrink: 0 }}>
        <div className="terminal-tab active">
          <TerminalIcon size={14} />
          <span>bash</span>
          <button className="tab-close"><X size={10} /></button>
        </div>
        <button className="terminal-tab-add"><Plus size={14} /></button>
      </div>
      <div className="terminal-content" style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        <TerminalComponent 
          onInput={handleInput} 
          output={kernelShell.output} 
          isRunning={kernelShell.ready}
          userName={userName}
        />
      </div>
    </div>
  );
}
