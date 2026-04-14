import React, { useState } from 'react';
import { FolderOpen, FileCode, X, Plus } from 'lucide-react';
import { useKernelBinaries } from '../../interface/hooks/useKernelState';
import { ContextMenuItem } from '../../interface/components/ContextMenu';

export default function FilesApp({ onUpload, onDelete, onContextMenu }: { onUpload: (f: File) => void, onDelete: (id: string) => void, onContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { binaries } = useKernelBinaries();

  return (
    <div className="files-window">
      <div className="files-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" title="Voltar">←</button>
          <button className="toolbar-btn" title="Avançar">→</button>
          <button className="toolbar-btn" title="Atualizar">↻</button>
          <button className="toolbar-btn" title="Home"><FolderOpen size={14} /></button>
        </div>
        <div className="toolbar-center">
          <input type="text" className="path-input" value={currentPath} onChange={(e) => setCurrentPath(e.target.value)} />
        </div>
        <div className="toolbar-right">
          <button className={`toolbar-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grade">▦</button>
          <button className={`toolbar-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Lista">≡</button>
        </div>
      </div>
      <div className="files-sidebar">
        <div className="sidebar-section">
          <h4>Locais</h4>
          <ul>
            <li className="active"><FolderOpen size={14} /> Arquivos</li>
            <li><FileCode size={14} /> Downloads</li>
            <li><FolderOpen size={14} /> Documentos</li>
          </ul>
        </div>
      </div>
      <div className="files-content">
        <input type="file" className="file-upload-input" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        <div className="files-breadcrumb">
          <span>Arquivos</span> / <span>Raiz</span>
        </div>
        <div className={`files-${viewMode}`}>
          {binaries.length === 0 ? (
            <div className="empty-message">
              <FolderOpen size={48} />
              <p>Nenhum arquivo</p>
              <p className="hint">Arraste arquivos aqui ou use o botão acima</p>
            </div>
          ) : (
            binaries.map(f => (
              <div
                key={f.id}
                className="file-item"
                onContextMenu={(e) => onContextMenu(e, [
                  { label: 'Abrir', icon: <FolderOpen size={14} />, onClick: () => console.log('Open file') },
                  { label: 'Baixar', icon: <Plus size={14} />, onClick: () => console.log('Download file') },
                  { separator: true },
                  { label: 'Renomear', icon: <FileCode size={14} />, onClick: () => console.log('Rename file') },
                  { label: 'Excluir', icon: <X size={14} />, danger: true, onClick: () => onDelete(f.id) }
                ])}
              >
                <FileCode size={32} />
                <span className="file-name">{f.name}</span>
                <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                <button className="file-delete" onClick={() => onDelete(f.id)}><X size={14} /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
