import { Peer, DataConnection } from 'peerjs';

export type SyncEvent = {
  type: string;
  payload: any;
  sender?: string;
  timestamp?: number;
};

export type SyncPeer = {
  id: string;
  cursor: { x: number; y: number };
  name: string;
};

class SyncService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private callbacks: ((event: SyncEvent) => void)[] = [];
  public peerId: string = '';
  public isHost: boolean = false;

  constructor() {}

  init(desiredId?: string) {
    if (this.peer) return;
    
    // PeerJS will generate a random ID if desiredId is undefined
    this.peer = desiredId ? new Peer(desiredId) : new Peer();
    
    this.peer.on('open', (id) => {
      this.peerId = id;
      console.log('[SyncService] Initialized with ID:', id);
      this.emitInternal({ type: 'sys:ready', payload: id });
    });

    this.peer.on('connection', (conn) => {
      console.log('[SyncService] Incoming connection from:', conn.peer);
      this.isHost = true; // If someone connects to us, we are hosting
      this.handleConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('[SyncService] PeerJS Error:', err);
      this.emitInternal({ type: 'sys:error', payload: err.message });
    });
  }

  connect(targetId: string) {
    if (!this.peer) {
      console.warn('[SyncService] Peer not initialized. Initializing first...');
      this.init();
      // Need to wait for open, but connect() is easier to call from UI
    }

    const connectWhenReady = () => {
      if (!this.peerId) {
        setTimeout(connectWhenReady, 100);
        return;
      }
      console.log('[SyncService] Connecting to:', targetId);
      const conn = this.peer!.connect(targetId);
      this.handleConnection(conn);
    };
    
    connectWhenReady();
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.emitInternal({ type: 'sys:peer_connected', payload: conn.peer });
      
      // If we are joining as guest, we might want to request state
      if (!this.isHost) {
        this.sendTo(conn.peer, { type: 'sys:request_state', payload: null });
      }
    });

    conn.on('data', (data: any) => {
      if (typeof data === 'object' && data.type) {
        this.emitInternal({ ...data, sender: conn.peer });
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.emitInternal({ type: 'sys:peer_disconnected', payload: conn.peer });
    });
  }

  broadcast(type: string, payload: any) {
    const event: SyncEvent = { type, payload, timestamp: Date.now() };
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(event);
      }
    });
  }

  sendTo(peerId: string, event: SyncEvent) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send({ ...event, timestamp: Date.now() });
    }
  }

  onEvent(cb: (event: SyncEvent) => void) {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter(c => c !== cb);
    };
  }

  private emitInternal(event: SyncEvent) {
    this.callbacks.forEach(cb => cb(event));
  }

  disconnect() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
      this.peerId = '';
    }
  }
}

export const syncService = new SyncService();
