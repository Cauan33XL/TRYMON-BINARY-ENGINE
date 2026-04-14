import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { Hash, Send, Plus, ShieldCheck } from 'lucide-react';
import * as kernel from '../../interface/services/kernelService';
import TrymonLogo from '../../interface/components/TrymonLogo';

function TrymordWebsite() {
  const [channel, setChannel] = useState('geral');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [peerId, setPeerId] = useState<string>('');
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [peerStatus, setPeerStatus] = useState<'Init' | 'Ready' | 'Error'>('Init');
  const scrollRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<Peer | null>(null);

  // Sync with Kernel History
  useEffect(() => {
    const history = kernel.getTrymordHistory();
    setMessages(history);
  }, []);

  // PeerJS Lifecycle
  useEffect(() => {
    // Initialize Peer
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setPeerStatus('Ready');
      console.log('Trymord Peer ID:', id);
    });

    peer.on('connection', (conn) => {
      handleIncomingConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('PeerJS Error:', err);
      setPeerStatus('Error');
    });

    return () => {
      peer.destroy();
    };
  }, []);

  const handleIncomingConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      setConnections(prev => [...prev, conn]);

      // Notify about new connection
      const systemMsg = {
        user: 'System',
        avatar: 'S',
        text: `Nova conexão P2P estabelecida com ${conn.peer.slice(0, 8)}...`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        system: true
      };
      setMessages(prev => [...prev, systemMsg]);
    });

    conn.on('data', (data: any) => {
      if (data && typeof data === 'object' && data.type === 'chat') {
        const incomingMsg = {
          user: `Peer (${conn.peer.slice(0, 5)})`,
          avatar: conn.peer.charAt(0).toUpperCase(),
          text: data.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => {
          const updated = [...prev, incomingMsg];
          kernel.saveTrymordMessage(incomingMsg);
          return updated;
        });
      }
    });

    conn.on('close', () => {
      setConnections(prev => prev.filter(c => c.peer !== conn.peer));
    });
  };

  const connectToPeer = () => {
    const targetId = prompt('Insira o ID do Peer para conectar:');
    if (!targetId || !peerRef.current) return;

    if (targetId === peerId) {
      alert('Você não pode conectar-se a si mesmo.');
      return;
    }

    const conn = peerRef.current.connect(targetId);
    handleIncomingConnection(conn);
  };

  const copyMyId = () => {
    navigator.clipboard.writeText(peerId);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = {
      user: 'Você',
      avatar: 'V',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Send to all connected peers
    connections.forEach(conn => {
      if (conn.open) {
        conn.send({ type: 'chat', text: input });
      }
    });

    setMessages(prev => {
      const updated = [...prev, newMsg];
      kernel.saveTrymordMessage(newMsg);
      return updated;
    });
    setInput('');

    // Simulated reaction for local experience
    if (input.toLowerCase().includes('oi') || input.toLowerCase().includes('kernel')) {
      setTimeout(() => {
        const botMsg = {
          user: 'Trymon AI',
          avatar: 'AI',
          text: input.toLowerCase().includes('kernel')
            ? 'O kernel está estável. Todos os subsistemas operando em 0.01ms de latência.'
            : 'Olá! A rede Trymord está com 100% de integridade agora.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => {
          const updated = [...prev, botMsg];
          kernel.saveTrymordMessage(botMsg);
          return updated;
        });
      }, 1200);
    }
  };

  return (
    <div className="trymord-container">
      <div className="trymord-servers">
        <abbr title="Trymon Kernel"><div className="trymord-server-icon active"><TrymonLogo size={24} /></div></abbr>
        <abbr title="AI Laboratory"><div className="trymord-server-icon" style={{ color: 'var(--accent-orange)' }}>AI</div></abbr>
        <abbr title="Binary Developers"><div className="trymord-server-icon" style={{ color: 'var(--accent-green)' }}>DEV</div></abbr>
        <div className="trymord-server-icon"><Plus size={20} /></div>
      </div>

      <div className="trymord-channels">
        <div className="trymord-channels-header">Trymon Hub</div>
        <div className="trymord-channels-list">
          {['geral', 'anuncios', 'desenvolvimento', 'logs-do-kernel', 'vfs-monitor'].map(c => (
            <div
              key={c}
              className={`trymord-channel-item ${channel === c ? 'active' : ''}`}
              onClick={() => setChannel(c)}
            >
              <Hash size={16} /> {c}
            </div>
          ))}
        </div>
      </div>

      <div className="trymord-main">
        <div className="trymord-chat-header">
          <Hash size={20} style={{ color: 'var(--trymord-accent)' }} /> <span>{channel}</span>
          <div className="peer-actions">
            {connections.length > 0 && (
              <div className="connection-count">
                <ShieldCheck size={14} /> {connections.length} Peer(s)
              </div>
            )}
            <button className="peer-btn primary" onClick={connectToPeer}>
              <Plus size={14} /> Conectar Peer
            </button>
          </div>
        </div>

        <div className="trymord-peer-info">
          <div className="peer-id-container">
            Meu ID: {peerId ? (
              <span className="peer-id-badge" onClick={copyMyId} title="Clique para copiar">
                {peerId}
              </span>
            ) : (
              <span className="trymord-text-muted">Gerando ID...</span>
            )}
          </div>
          <div className="peer-status" style={{
            background: peerStatus === 'Ready' ? '#23a55a' : peerStatus === 'Error' ? '#f23f43' : '#f0b232',
            width: 8, height: 8, borderRadius: '50%'
          }} />
        </div>

        <div className="trymord-messages" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className="trymord-message">
              <div className="trymord-msg-avatar" style={{
                background: m.avatar === 'AI' ? 'var(--trymord-accent)' :
                  m.avatar === 'R' ? 'var(--accent-purple)' :
                    'var(--trymord-bg-channels)',
                boxShadow: m.avatar === 'AI' ? '0 0 10px var(--trymord-accent)' : 'none'
              }}>
                {m.avatar}
              </div>
              <div className="trymord-msg-content">
                <div className="trymord-msg-user">
                  {m.user} <span className="trymord-msg-time">{m.time}</span>
                </div>
                <div className="trymord-msg-text">{m.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="trymord-input-area">
          <form onSubmit={sendMsg} className="trymord-input-box">
            <Plus size={20} className="text-muted" style={{ cursor: 'pointer' }} />
            <input
              type="text"
              placeholder={`Mensagem em #${channel}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Send size={20} className="text-muted" style={{ cursor: 'pointer' }} onClick={sendMsg} />
          </form>
        </div>
      </div>
      <div className="trymord-members">
        <div className="vsite-section-title" style={{ fontSize: '11px', marginBottom: '16px' }}>Online — {messages.length > 0 ? 3 : 2}</div>
        <div className="trymord-member-item">
          <div className="trymord-member-avatar" style={{ background: 'var(--trymord-accent)', boxShadow: '0 0 5px var(--trymord-accent)' }}>
            <div className="trymord-status status-online"></div>
          </div>
          <span style={{ color: 'var(--trymord-accent)' }}>Trymon AI</span>
        </div>
        <div className="trymord-member-item">
          <div className="trymord-member-avatar" style={{ background: 'var(--accent-purple)' }}>
            <div className="trymord-status status-online"></div>
          </div>
          <span>Root</span>
        </div>
        <div className="vsite-section-title" style={{ fontSize: '11px', margin: '16px 0' }}>Offline — 1</div>
        <div className="trymord-member-item" style={{ opacity: 0.5 }}>
          <div className="trymord-member-avatar">
            <div className="trymord-status" style={{ background: '#444' }}></div>
          </div>
          <span>Você</span>
        </div>
      </div>
    </div>
  );
}

export default TrymordWebsite;
