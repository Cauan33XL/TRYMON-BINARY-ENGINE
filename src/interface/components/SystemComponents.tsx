/**
 * System Components for Trymon OS
 * Clock, Notifications, and other system-level UI elements
 */

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// ============================================================
// Clock Component - Memoized to avoid global re-renders
// ============================================================

export const SystemClock = memo(function SystemClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = useMemo(() => {
    return time.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [time]);

  const dateStr = useMemo(() => {
    return time.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }, [time]);

  return (
    <div className="system-clock" title={dateStr}>
      <span className="clock-time">{timeStr}</span>
    </div>
  );
});

// ============================================================
// Notification System
// ============================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // ms, 0 = persistent
}

// Notification Toast Component
class NotificationBus {
  private listeners: Set<(n: Notification) => void> = new Set();

  subscribe(fn: (n: Notification) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(n: Notification) {
    this.listeners.forEach(fn => fn(n));
  }
}

export const notificationBus = new NotificationBus();

// Notification Toast Component
function NotificationToast({ notification, onRemove }: { notification: Notification; onRemove: (id: string) => void }) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification.duration === 0) return; // Persistent

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => {
        onRemove(notification.id);
      }, 300);
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onRemove]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const iconMap = {
    success: <CheckCircle size={18} className="notification-icon success" />,
    error: <AlertCircle size={18} className="notification-icon error" />,
    warning: <AlertTriangle size={18} className="notification-icon warning" />,
    info: <Info size={18} className="notification-icon info" />,
  };

  return (
    <div
      className={`notification-toast ${notification.type} ${isLeaving ? 'leaving' : 'entering'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="notification-icon-wrapper">
        {iconMap[notification.type]}
      </div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
      </div>
      <button className="notification-close" onClick={handleRemove} aria-label="Fechar notificação">
        <X size={14} />
      </button>
    </div>
  );
}

// Notification Bell/Panel Component
export const NotificationCenter = memo(function NotificationCenter({
  notifications,
  onRemove,
  onClearAll
}: {
  notifications: Notification[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notificações: ${notifications.length} não lidas`}
      >
        <Bell size={16} />
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notificações</h3>
            {notifications.length > 0 && (
              <button className="clear-all-btn" onClick={onClearAll}>
                Limpar todas
              </button>
            )}
          </div>
          <div className="notification-panel-body">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <Bell size={32} className="no-notif-icon" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notification-item ${n.type}`}>
                  <div className="notif-item-content">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-message">{n.message}</div>
                    <div className="notif-item-time">
                      {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button className="notif-item-close" onClick={() => onRemove(n.id)} aria-label="Remover">
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// Toast Container - renders all active toasts
export function ToastContainer({
  notifications,
  onRemove
}: {
  notifications: Notification[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="toast-container" aria-live="polite">
      {notifications.map(n => (
        <NotificationToast key={n.id} notification={n} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Hook for using notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotif: Notification = {
      ...n,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      duration: n.duration ?? 5000,
    };

    setNotifications(prev => [newNotif, ...prev]);
    notificationBus.emit(newNotif);
    return newNotif.id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Listen for external notifications
  useEffect(() => {
    const unsub = notificationBus.subscribe((n) => {
      setNotifications(prev => {
        if (prev.some(existing => existing.id === n.id)) return prev;
        return [n, ...prev];
      });
    });
    return () => { unsub(); };
  }, []);

  return useMemo(() => ({
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    unreadCount: notifications.length,
  }), [notifications, addNotification, removeNotification, clearAll]);
}

// Convenience functions for common notifications
export const notify = {
  success: (title: string, message: string, duration?: number) => {
    notificationBus.emit({
      id: crypto.randomUUID(),
      type: 'success',
      title,
      message,
      timestamp: Date.now(),
      duration,
    });
  },
  error: (title: string, message: string, duration?: number) => {
    notificationBus.emit({
      id: crypto.randomUUID(),
      type: 'error',
      title,
      message,
      timestamp: Date.now(),
      duration,
    });
  },
  warning: (title: string, message: string, duration?: number) => {
    notificationBus.emit({
      id: crypto.randomUUID(),
      type: 'warning',
      title,
      message,
      timestamp: Date.now(),
      duration,
    });
  },
  info: (title: string, message: string, duration?: number) => {
    notificationBus.emit({
      id: crypto.randomUUID(),
      type: 'info',
      title,
      message,
      timestamp: Date.now(),
      duration,
    });
  },
};
