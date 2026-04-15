/**
 * Trash Application (VFS Based)
 * Shows files/folders in /.trash and allows restoration or permanent deletion.
 */

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, XCircle, File, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { notify } from '../../interface/components/SystemComponents';
import * as kernel from '../../interface/services/kernelService';

interface TrashItem {
  id: string; // The suffix name in /.trash/files
  name: string; // Original name
  originalPath: string;
  type: string;
  deletedAt: number;
  size?: number;
}

export default function TrashApp({ onClose: _onClose }: { onClose?: () => void }) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const vfsItems = kernel.listVfsTrash();
      setItems(vfsItems);
    } catch (err) {
      console.error('[TrashApp] Failed to load trash items:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleRestore = async (id: string) => {
    try {
      kernel.restoreFromTrash(id);
      notify.success('Restaurado', 'O item foi movido de volta para sua pasta original.');
      await loadItems();
      setSelectedId(null);
    } catch (err) {
      notify.error('Erro', `Falha ao restaurar: ${err}`);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      // Permanently remove files and info
      kernel.deletePath(`/.trash/files/${id}`);
      kernel.deletePath(`/.trash/info/${id}.json`);
      notify.warning('Excluído permanentemente', 'O item foi removido definitivamente do sistema.');
      await loadItems();
      setSelectedId(null);
    } catch (err) {
      notify.error('Erro', `Falha ao excluir: ${err}`);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      // Clean /.trash/files and /.trash/info
      const files = kernel.listDir('/.trash/files');
      files.forEach(f => kernel.deletePath(f.path));
      
      const info = kernel.listDir('/.trash/info');
      info.forEach(f => kernel.deletePath(f.path));

      notify.warning('Lixeira esvaziada', 'Todos os itens foram removidos permanentemente');
      setItems([]);
      setSelectedId(null);
      setIsConfirmingEmpty(false);
    } catch (err) {
      notify.error('Erro', `Falha ao esvaziar lixeira: ${err}`);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="trash-window">
      <div className="trash-header">
        <div className="trash-header-left">
          <Trash2 size={18} className="trash-header-icon" />
          <h2>Lixeira</h2>
          <span className="trash-count">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="trash-header-right">
          <button className="action-btn" onClick={loadItems} title="Atualizar">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {items.length > 0 && (
            <button
              className="empty-trash-btn"
              onClick={() => setIsConfirmingEmpty(true)}
            >
              Esvaziar Lixeira
            </button>
          )}
        </div>
      </div>

      <div className="trash-content">
        {isLoading ? (
          <div className="trash-empty">
            <RefreshCw size={48} className="animate-spin opacity-20" />
            <p>Carregando itens...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="trash-empty">
            <Trash2 size={64} className="trash-empty-icon" />
            <h3>A lixeira está vazia</h3>
            <p>Os arquivos excluídos aparecerão aqui</p>
          </div>
        ) : (
          <div className="trash-list">
            <div className="trash-list-header">
              <span className="col-name">Nome</span>
              <span className="col-date">Excluído em</span>
              <span className="col-actions">Ações</span>
            </div>

            {items.map(item => (
              <div
                key={item.id}
                className={`trash-item ${selectedId === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => handleRestore(item.id)}
              >
                <div className="col-name">
                  <File size={16} className="item-icon file" />
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-path">{item.originalPath}</span>
                  </div>
                </div>
                <div className="col-date">
                  <Clock size={12} />
                  {formatDate(item.deletedAt)}
                </div>
                <div className="col-actions">
                  <button
                    className="action-btn restore"
                    onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}
                    title="Restaurar"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => { e.stopPropagation(); handlePermanentDelete(item.id); }}
                    title="Excluir permanentemente"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmingEmpty && (
        <div className="modal-overlay" onClick={() => setIsConfirmingEmpty(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">
              <AlertTriangle size={32} />
            </div>
            <h3>Esvaziar Lixeira</h3>
            <p>Tem certeza que deseja excluir permanentemente todos os itens? Esta ação não pode ser desfeita.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsConfirmingEmpty(false)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={handleEmptyTrash}>
                Esvaziar Lixeira
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
