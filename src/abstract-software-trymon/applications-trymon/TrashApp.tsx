/**
 * Trash Application
 * Shows deleted files/folders with options to restore or permanently delete.
 */

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, XCircle, File, Folder, Clock, AlertTriangle } from 'lucide-react';
import { listTrashItems, permanentlyDelete, emptyTrash } from '../../interface/services/trashService';
import { notify } from '../../interface/components/SystemComponents';

interface TrashItem {
  id: string;
  name: string;
  originalPath: string;
  type: 'file' | 'directory';
  size: number;
  deletedAt: number;
}

export default function TrashApp({ onClose: _onClose }: { onClose?: () => void }) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);

  const loadItems = useCallback(async () => {
    const trashItems = await listTrashItems();
    setItems(trashItems);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleRestore = async (id: string) => {
    try {
      // For now just remove from trash (restore to VFS would need kernel integration)
      await permanentlyDelete(id);
      notify.info('Restaurar', 'Item restaurado (VFS restore requires kernel integration)');
      await loadItems();
      setSelectedId(null);
    } catch (err) {
      notify.error('Erro', `Falha ao restaurar: ${err}`);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await permanentlyDelete(id);
      notify.warning('Excluído permanentemente', 'Item removido definitivamente');
      await loadItems();
      setSelectedId(null);
    } catch (err) {
      notify.error('Erro', `Falha ao excluir: ${err}`);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash();
      notify.warning('Lixeira esvaziada', 'Todos os itens foram removidos permanentemente');
      setItems([]);
      setSelectedId(null);
      setIsConfirmingEmpty(false);
    } catch (err) {
      notify.error('Erro', `Falha ao esvaziar lixeira: ${err}`);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

  const totalSize = items.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="trash-window">
      <div className="trash-header">
        <div className="trash-header-left">
          <Trash2 size={18} className="trash-header-icon" />
          <h2>Lixeira</h2>
          <span className="trash-count">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="trash-header-right">
          <span className="trash-total-size">{formatSize(totalSize)}</span>
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
        {items.length === 0 ? (
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
              <span className="col-size">Tamanho</span>
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
                  {item.type === 'directory' ? (
                    <Folder size={16} className="item-icon folder" />
                  ) : (
                    <File size={16} className="item-icon file" />
                  )}
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-path">{item.originalPath}</span>
                  </div>
                </div>
                <div className="col-date">
                  <Clock size={12} />
                  {formatDate(item.deletedAt)}
                </div>
                <div className="col-size">{formatSize(item.size)}</div>
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
            <p>Tem certeza que deseja excluir permanentemente todos os {items.length} {items.length === 1 ? 'item' : 'itens'}? Esta ação não pode ser desfeita.</p>
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
