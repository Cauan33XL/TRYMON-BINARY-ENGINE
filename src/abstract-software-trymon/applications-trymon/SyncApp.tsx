import { useState, useCallback } from 'react';
import { Share2, Users, Copy, Plus, Link, ShieldCheck, Globe, Wifi, LogOut, CheckCircle, Smartphone, Monitor, Info } from 'lucide-react';
import { useSync } from '../../interface/hooks/useSync';
import { notify } from '../../interface/components/SystemComponents';

export default function SyncApp() {
  const { peerId, connectedPeers, hostSession, joinSession, isHost } = useSync();
  const [joinId, setJoinId] = useState('');

  const handleCopyId = useCallback(() => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      notify.success('Copiado', 'ID da Sessão copiado para a área de transferência');
    }
  }, [peerId]);

  const handleHost = useCallback(() => {
    hostSession();
    notify.info('Sessão Remota', 'Iniciando hospedagem da sessão...');
  }, [hostSession]);

  const handleJoin = useCallback(() => {
    if (joinId.trim()) {
      joinSession(joinId.trim());
      notify.info('Sessão Remota', `Tentando conectar à sessão ${joinId.slice(0, 8)}...`);
    }
  }, [joinId, joinSession]);

  return (
    <div className="sync-window">
      <div className="sync-sidebar">
        <div className="sync-status">
          <div className={`status-indicator ${peerId ? 'online' : 'offline'}`} />
          <span>{peerId ? (isHost ? 'Hospedando' : 'Conectado') : 'Offline'}</span>
        </div>
        
        <nav className="sync-nav">
          <div className="sync-nav-item active">
            <Share2 size={16} /> Visão Geral
          </div>
          <div className="sync-nav-item">
            <Users size={16} /> Participantes
            {connectedPeers.length > 0 && <span className="nav-badge">{connectedPeers.length}</span>}
          </div>
          <div className="sync-nav-item">
            <ShieldCheck size={16} /> Segurança
          </div>
        </nav>

        <div className="sync-sidebar-footer">
          <div className="p2p-info">
            <Wifi size={14} />
            <span>PeerJS Network</span>
          </div>
        </div>
      </div>

      <div className="sync-main">
        <div className="sync-content">
          {!peerId ? (
            <div className="sync-welcome">
              <div className="sync-hero-icon">
                <Globe size={48} />
                <div className="pulse-ring" />
              </div>
              <h1>Trymon Sync</h1>
              <p>Colabore em tempo real. Compartilhe sua área de trabalho e interaja com outros usuários instantaneamente.</p>
              
              <div className="sync-actions-hero">
                <button className="sync-btn primary" onClick={handleHost}>
                  <Plus size={20} />
                  <span>Criar Nova Sessão</span>
                </button>
                
                <div className="divider"><span>ou</span></div>
                
                <div className="join-input-group">
                  <input 
                    type="text" 
                    placeholder="ID da Sessão" 
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                  />
                  <button className="sync-btn" onClick={handleJoin} disabled={!joinId.trim()}>
                    <Link size={18} />
                    <span>Participar</span>
                  </button>
                </div>
              </div>

              <div className="sync-features-grid">
                <div className="feature-card">
                  <Monitor size={20} />
                  <h4>Tela Compartilhada</h4>
                  <p>Interação simultânea em apps e janelas.</p>
                </div>
                <div className="feature-card">
                  <Users size={20} />
                  <h4>Multi-usuário</h4>
                  <p>Cursores sincronizados para todos.</p>
                </div>
                <div className="feature-card">
                  <ShieldCheck size={20} />
                  <h4>Segurança P2P</h4>
                  <p>Conexão direta e criptografada.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="sync-dashboard">
              <div className="dashboard-header">
                <div>
                  <h2>Configurações da Sessão</h2>
                  <p className="subtitle">{isHost ? 'Você é o anfitrião desta sessão' : 'Você está participando de uma sessão remota'}</p>
                </div>
                <button className="sync-btn danger-outline" onClick={() => window.location.reload()}>
                  <LogOut size={16} /> Encerrar
                </button>
              </div>

              <div className="info-cards">
                <div className="info-card session-id-card">
                  <div className="card-label">ID da Sessão (Público)</div>
                  <div className="id-display">
                    <code>{peerId}</code>
                    <button className="copy-btn" onClick={handleCopyId} title="Copiar ID">
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="card-tip">Compartilhe este código para permitir que outros entrem.</p>
                </div>

                <div className="info-card peers-card">
                  <div className="card-label">Dispositivos Conectados</div>
                  <div className="peer-list-container">
                    {connectedPeers.length === 0 ? (
                      <div className="empty-peers">
                        <Users size={32} />
                        <p>Nenhum participante ainda</p>
                      </div>
                    ) : (
                      <div className="peer-list">
                        {connectedPeers.map(id => (
                          <div key={id} className="peer-item">
                            <div className="peer-avatar">
                              <Smartphone size={16} />
                            </div>
                            <div className="peer-details">
                              <span className="peer-id-text">Peer-{id.slice(0, 8)}</span>
                              <span className="peer-status-text">Conectado</span>
                            </div>
                            <div className="peer-ping">
                              <CheckCircle size={14} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sync-help-section">
                <h3><Info size={16} /> Como funciona?</h3>
                <ul>
                  <li>Todos os participantes podem ver e interagir com as janelas abertas.</li>
                  <li>As mudanças de posição, tamanho e estado das janelas são sincronizadas instantaneamente.</li>
                  <li>Os cursores de outros usuários aparecem com cores diferentes na sua tela.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sync-window {
          display: flex;
          height: 100%;
          background: #0d1117;
          color: #f0f6fc;
          font-family: inherit;
        }

        .sync-sidebar {
          width: 200px;
          background: #161b22;
          border-right: 1px solid #30363d;
          display: flex;
          flex-direction: column;
          padding: 20px 0;
        }

        .sync-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 20px 20px;
          border-bottom: 1px solid #30363d;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.online { background: #23a55a; box-shadow: 0 0 8px rgba(35, 165, 90, 0.5); }
        .status-indicator.offline { background: #6e7681; }

        .sync-nav {
          flex: 1;
          padding: 0 10px;
        }

        .sync-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #c9d1d9;
          transition: all 0.2s;
          margin-bottom: 4px;
          position: relative;
        }

        .sync-nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #f0f6fc;
        }

        .sync-nav-item.active {
          background: rgba(0, 112, 243, 0.15);
          color: #58a6ff;
        }

        .nav-badge {
          position: absolute;
          right: 12px;
          background: #0070f3;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
        }

        .sync-sidebar-footer {
          padding: 0 20px;
          opacity: 0.5;
          font-size: 11px;
        }

        .p2p-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sync-main {
          flex: 1;
          overflow-y: auto;
          background: radial-gradient(circle at top right, rgba(0, 112, 243, 0.05), transparent 400px);
        }

        .sync-content {
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }

        .sync-welcome {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sync-hero-icon {
          position: relative;
          color: #00f2ff;
          margin-bottom: 24px;
        }

        .pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border: 2px solid rgba(0, 242, 255, 0.3);
          border-radius: 50%;
          animation: pulse-ring 2s infinite;
        }

        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }

        .sync-welcome h1 {
          font-size: 32px;
          margin-bottom: 12px;
          background: linear-gradient(to bottom, #fff, #888);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sync-welcome p {
          color: #8b949e;
          font-size: 16px;
          max-width: 500px;
          line-height: 1.5;
          margin-bottom: 40px;
        }

        .sync-actions-hero {
          width: 100%;
          max-width: 400px;
          background: rgba(255, 255, 255, 0.03);
          padding: 30px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 48px;
        }

        .sync-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #30363d;
          background: #21262d;
          color: #c9d1d9;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .sync-btn:hover:not(:disabled) {
          background: #30363d;
          border-color: #8b949e;
        }

        .sync-btn.primary {
          background: #0070f3;
          border-color: #0070f3;
          color: white;
        }

        .sync-btn.primary:hover {
          background: #0060d0;
          box-shadow: 0 0 15px rgba(0, 112, 243, 0.4);
        }

        .sync-btn.danger-outline {
          background: transparent;
          border-color: rgba(255, 123, 114, 0.3);
          color: #ff7b72;
          width: auto;
          padding: 8px 16px;
        }

        .sync-btn.danger-outline:hover {
          background: rgba(255, 123, 114, 0.1);
          border-color: #ff7b72;
        }

        .divider {
          margin: 20px 0;
          position: relative;
          text-align: center;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
        }

        .divider span {
          position: relative;
          background: #0d1117;
          padding: 0 10px;
          color: #484f58;
          font-size: 12px;
          text-transform: uppercase;
        }

        .join-input-group {
          display: flex;
          gap: 8px;
        }

        .join-input-group input {
          flex: 1;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 0 12px;
          color: white;
          font-size: 14px;
        }

        .join-input-group button {
          width: auto;
          padding: 0 16px;
        }

        .sync-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
        }

        .feature-card {
          padding: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          text-align: left;
        }

        .feature-card svg { color: #58a6ff; margin-bottom: 12px; }
        .feature-card h4 { font-size: 14px; margin-bottom: 8px; color: #f0f6fc; }
        .feature-card p { font-size: 12px; color: #8b949e; margin-bottom: 0; line-height: 1.4; }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #30363d;
        }

        .dashboard-header h2 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #8b949e; font-size: 14px; }

        .info-cards {
          display: grid;
          gap: 20px;
          margin-bottom: 30px;
        }

        .info-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 20px;
        }

        .card-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #8b949e;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .id-display {
          display: flex;
          gap: 12px;
          align-items: center;
          background: #0d1117;
          border: 1px solid #30363d;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .id-display code {
          flex: 1;
          font-family: monospace;
          color: #58a6ff;
          font-size: 14px;
        }

        .copy-btn {
          background: transparent;
          border: none;
          color: #8b949e;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .copy-btn:hover { background: rgba(255, 255, 255, 0.05); color: #f0f6fc; }
        .card-tip { font-size: 11px; color: #484f58; margin: 0; }

        .peer-list-container {
          min-height: 100px;
        }

        .empty-peers {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          color: #484f58;
        }

        .empty-peers p { font-size: 13px; margin-top: 10px; }

        .peer-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .peer-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border: 1px solid transparent;
        }

        .peer-avatar {
          width: 32px;
          height: 32px;
          background: #30363d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b949e;
        }

        .peer-details { flex: 1; display: flex; flex-direction: column; }
        .peer-id-text { font-size: 13px; color: #f0f6fc; font-weight: 500; }
        .peer-status-text { font-size: 11px; color: #23a55a; }
        .peer-ping { color: #23a55a; }

        .sync-help-section {
          background: rgba(88, 166, 255, 0.05);
          border: 1px solid rgba(88, 166, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
        }

        .sync-help-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          margin-bottom: 12px;
          color: #58a6ff;
        }

        .sync-help-section ul {
          padding-left: 20px;
          margin: 0;
        }

        .sync-help-section li {
          font-size: 13px;
          color: #8b949e;
          margin-bottom: 8px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
