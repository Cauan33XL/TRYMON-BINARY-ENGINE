import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useKernelBinaries } from '../../interface/hooks/useKernelState';
import { BinaryInfo } from '../../interface/services/kernelService';
import { ContextMenuItem } from '../../interface/components/ContextMenu';

export default function BinariesApp({ onUpload, onDelete, onInstall, onContextMenu }: { onUpload: (f: File) => void, onDelete: (id: string) => void, onInstall: (f: BinaryInfo) => void, onContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void }) {
  const { binaries } = useKernelBinaries();
  const [activeTab, setActiveTab] = useState<'all' | 'appimage' | 'deb' | 'rpm' | 'Trymon'>('all');

  const filteredBinaries = activeTab === 'all' ? binaries : binaries.filter((b: BinaryInfo) => b.format === activeTab);

  return (
    <div className="binaries-window">
      <div className="binaries-toolbar">
        <div className="binaries-tabs">
          <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Todos</button>
          <button className={`tab ${activeTab === 'appimage' ? 'active' : ''}`} onClick={() => setActiveTab('appimage')}>AppImage</button>
          <button className={`tab ${activeTab === 'deb' ? 'active' : ''}`} onClick={() => setActiveTab('deb')}>DEB</button>
          <button className={`tab ${activeTab === 'rpm' ? 'active' : ''}`} onClick={() => setActiveTab('rpm')}>RPM</button>
          <button className={`tab ${activeTab === 'Trymon' ? 'active' : ''}`} onClick={() => setActiveTab('Trymon')}>Trymon</button>
        </div>
        <div className="toolbar-right">
          <label className="upload-btn">
            <Plus size={14} />
            <span>Adicionar</span>
            <input type="file" accept=".appimage,.deb,.rpm,.trymon,.elf" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </label>
        </div>
      </div>
      <div className="binaries-table-container">
        <table className="binaries-table">
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Tamanho</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredBinaries.length === 0 ? (
              <tr><td colSpan={6} className="empty-row">Nenhum binário carregado</td></tr>
            ) : (
              filteredBinaries.map((f: BinaryInfo) => (
                <tr
                  key={f.id}
                  className="binary-row"
                  onContextMenu={(e) => onContextMenu(e, [
                    { label: 'Instalar', icon: <Plus size={14} />, onClick: () => onInstall(f) },
                    { label: 'Excluir', icon: <Plus size={14} />, danger: true, onClick: () => onDelete(f.id) }
                  ])}
                >
                  <td><input type="checkbox" /></td>
                  <td className="name-cell">{f.name}</td>
                  <td><span className={`format-badge ${f.format}`}>{f.format}</span></td>
                  <td>{(f.size / 1024).toFixed(1)} KB</td>
                  <td><span className="status-badge available">Disponível</span></td>
                  <td className="actions-cell">
                    <button className="row-action" onClick={() => onInstall(f)}>Instalar</button>
                    <button className="row-action delete" onClick={() => onDelete(f.id)}>Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
