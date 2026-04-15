import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, FileText, Cpu, Plus, Download, Trash2 } from 'lucide-react';
import * as kernel from '../../interface/services/kernelService';

export default function EditorApp({ filePath }: { filePath: string }) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [fileName, setFileName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const name = filePath ? filePath.split('/').pop() || 'documento.txt' : 'novo_arquivo.txt';
    setFileName(name);

    if (!filePath) {
      setContent('');
      setIsLoading(false);
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      try {
        const data = kernel.readFile(filePath);
        if (data) {
          setContent(new TextDecoder().decode(data));
        } else {
          setContent('');
        }
      } catch (e) {
        console.error('Failed to load file:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  const handleSave = useCallback(() => {
    if (!filePath) {
      // For now, if no path, just log. In a real desktop we might trigger "Save As"
      console.log('No file path specified for save');
      return;
    }
    setIsSaving(true);
    try {
      kernel.writeFile(filePath, content);
      setLastSaved(new Date());
    } catch (e) {
      console.error('Failed to save file:', e);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [filePath, content]);

  const handleNew = () => {
    if (content && !lastSaved && !window.confirm('Existem alterações não salvas. Deseja criar um novo arquivo mesmo assim?')) {
      return;
    }
    setContent('');
    setLastSaved(null);
    setFileName('novo_arquivo.txt');
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="editor-loading">
        <div className="loading-grid">
          <Cpu className="animate-pulse neon-glow" size={48} />
          <span>Sincronizando VFS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-premium-toolbar">
        <div className="toolbar-section">
          <button className="premium-tool-btn" onClick={handleNew} title="Novo Arquivo">
            <Plus size={16} />
            <span>Novo</span>
          </button>
          <button 
            className={`premium-tool-btn ${isSaving ? 'active' : ''}`} 
            onClick={handleSave}
            disabled={isSaving || !filePath}
            title="Salvar Alterações"
          >
            <Save size={16} />
            <span>Salvar</span>
          </button>
          <button className="premium-tool-btn" onClick={handleExport} title="Exportar para o Sistema">
            <Download size={16} />
            <span>Exportar</span>
          </button>
        </div>
        
        <div className="toolbar-section file-info">
          <FileText size={14} className="accent-cyan" />
          <span className="file-path-display">{filePath || 'Memória Temporária'}</span>
          {lastSaved && <span className="save-indicator">Sincronizado</span>}
        </div>

        <div className="toolbar-section">
          <button className="premium-tool-btn danger" onClick={() => setContent('')} title="Limpar Buffer">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="editor-viewport">
        <div className="line-numbers-column">
          {content.split('\n').map((_, i) => (
            <div key={i} className="line-number-entry">{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="editor-premium-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          placeholder="Digite seu código ou texto aqui..."
        />
      </div>

      <div className="editor-premium-footer">
        <div className="footer-item">
          <span className="label">LINHAS</span>
          <span className="value">{content.split('\n').length}</span>
        </div>
        <div className="footer-item">
          <span className="label">CARACTERES</span>
          <span className="value">{content.length}</span>
        </div>
        <div className="footer-item">
          <span className="label">ENCODER</span>
          <span className="value">UTF-8 / ASCII</span>
        </div>
        <div className="spacer" />
        <div className="footer-branding">
          <Cpu size={12} />
          <span>TRYMON_CORE v2.0</span>
        </div>
      </div>
    </div>
  );
}
