import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { syncService, SyncEvent } from '../services/syncService';

interface SyncContextType {
  peerId: string;
  connectedPeers: string[];
  remoteCursors: Record<string, { x: number; y: number; name: string }>;
  isHost: boolean;
  hostSession: () => void;
  joinSession: (id: string) => void;
  broadcast: (type: string, payload: any) => void;
  sendTo: (peerId: string, type: string, payload: any) => void;
  onEvent: (type: string, callback: (payload: any, sender: string) => void) => () => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [peerId, setPeerId] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; name: string }>>({});
  const [isHost, setIsHost] = useState(false);
  
  const eventCallbacks = useRef<Record<string, ((payload: any, sender: string) => void)[]>>({});

  useEffect(() => {
    const unsub = syncService.onEvent((event: SyncEvent) => {
      const { type, payload, sender } = event;

      // Handle system events
      if (type === 'sys:ready') {
        setPeerId(payload);
      } else if (type === 'sys:peer_connected') {
        setConnectedPeers(prev => [...new Set([...prev, payload])]);
        setIsHost(syncService.isHost);
      } else if (type === 'sys:peer_disconnected') {
        setConnectedPeers(prev => prev.filter(p => p !== payload));
        setRemoteCursors(prev => {
          const next = { ...prev };
          delete next[payload];
          return next;
        });
      }

      // Handle custom events
      if (type === 'cursor') {
        setRemoteCursors(prev => ({
          ...prev,
          [sender!]: { x: payload.x, y: payload.y, name: payload.name || `User ${sender?.slice(0, 4)}` }
        }));
      }

      // Dispatch to subscribers
      if (eventCallbacks.current[type]) {
        eventCallbacks.current[type].forEach(cb => cb(payload, sender || 'system'));
      }
    });

    return () => unsub();
  }, []);

  const hostSession = useCallback(() => {
    syncService.init();
    setIsHost(true);
  }, []);

  const joinSession = useCallback((id: string) => {
    syncService.init();
    syncService.connect(id);
    setIsHost(false);
  }, []);

  const broadcast = useCallback((type: string, payload: any) => {
    syncService.broadcast(type, payload);
  }, []);

  const sendTo = useCallback((peerId: string, type: string, payload: any) => {
    syncService.sendTo(peerId, { type, payload });
  }, []);

  const onEvent = useCallback((type: string, callback: (payload: any, sender: string) => void) => {
    if (!eventCallbacks.current[type]) {
      eventCallbacks.current[type] = [];
    }
    eventCallbacks.current[type].push(callback);
    return () => {
      eventCallbacks.current[type] = eventCallbacks.current[type].filter(cb => cb !== callback);
    };
  }, []);

  return (
    <SyncContext.Provider value={{
      peerId,
      connectedPeers,
      remoteCursors,
      isHost,
      hostSession,
      joinSession,
      broadcast,
      sendTo,
      onEvent
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
