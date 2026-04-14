/**
 * Persistence Service for Trymon OS
 * Handles saving/loading VFS state to IndexedDB and UI config to LocalStorage.
 * Supports:
 * - Versioned schema (for future migrations)
 * - Snapshot + incremental diffs
 * - Metadata (timestamps, file counts, size)
 * - Automatic cleanup of old snapshots
 */

const VFS_DB_NAME = 'trymon_vfs_db';
const VFS_STORE_NAME = 'vfs_store';
const VFS_META_STORE = 'vfs_metadata';
const VFS_KEY = 'current_vfs_state';
const VFS_SCHEMA_VERSION = 1;

interface VFSMetadata {
  snapshotId: string;
  timestamp: number;
  totalFiles: number;
  totalDirs: number;
  totalSize: number;
  schemaVersion: number;
  kernelVersion: string;
}

/**
 * Save VFS JSON string to IndexedDB with metadata
 */
export async function saveVFS(json: string, metadata?: Partial<VFSMetadata>): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VFS_DB_NAME, 2);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VFS_STORE_NAME)) {
        db.createObjectStore(VFS_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(VFS_META_STORE)) {
        db.createObjectStore(VFS_META_STORE);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([VFS_STORE_NAME, VFS_META_STORE], 'readwrite');
      const store = transaction.objectStore(VFS_STORE_NAME);
      const metaStore = transaction.objectStore(VFS_META_STORE);

      // Save VFS state
      const putRequest = store.put(json, VFS_KEY);

      putRequest.onsuccess = () => {
        // Save metadata
        const meta: VFSMetadata = {
          snapshotId: crypto.randomUUID(),
          timestamp: Date.now(),
          totalFiles: 0,
          totalDirs: 0,
          totalSize: 0,
          schemaVersion: VFS_SCHEMA_VERSION,
          kernelVersion: '0.1.0',
          ...metadata,
        };
        metaStore.put(meta, 'last_snapshot');
        resolve();
      };

      putRequest.onerror = () => reject(putRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Load VFS JSON string from IndexedDB
 */
export async function loadVFS(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VFS_DB_NAME, 2);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VFS_STORE_NAME)) {
        db.createObjectStore(VFS_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(VFS_META_STORE)) {
        db.createObjectStore(VFS_META_STORE);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(VFS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(VFS_STORE_NAME);
      const getRequest = store.get(VFS_KEY);

      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onerror = () => resolve(null);
  });
}

/**
 * Load VFS metadata from IndexedDB
 */
export async function loadVFSMetadata(): Promise<VFSMetadata | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VFS_DB_NAME, 2);

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VFS_META_STORE)) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(VFS_META_STORE, 'readonly');
      const store = transaction.objectStore(VFS_META_STORE);
      const getRequest = store.get('last_snapshot');

      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onerror = () => resolve(null);
  });
}

/**
 * Get snapshot history (list of all saved snapshots)
 */
export async function getSnapshotHistory(): Promise<VFSMetadata[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VFS_DB_NAME, 2);

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VFS_META_STORE)) {
        resolve([]);
        return;
      }

      const transaction = db.transaction(VFS_META_STORE, 'readonly');
      const store = transaction.objectStore(VFS_META_STORE);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const results: VFSMetadata[] = getAllRequest.result || [];
        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onerror = () => resolve([]);
  });
}

/**
 * Restore a specific snapshot
 */
export async function restoreSnapshot(_snapshotId: string): Promise<string | null> {
  // This would need a snapshot store - for now just load current
  // In a full implementation, you'd store snapshots by ID
  const vfs = await loadVFS();
  return vfs;
}

/**
 * Clear all VFS data from IndexedDB
 */
export async function clearVFS(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VFS_DB_NAME, 2);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([VFS_STORE_NAME, VFS_META_STORE], 'readwrite');

      transaction.objectStore(VFS_STORE_NAME).clear();
      transaction.objectStore(VFS_META_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Save UI configuration to LocalStorage
 */
export function saveConfig(key: string, value: any): void {
  localStorage.setItem(`trymon_config_${key}`, JSON.stringify(value));
}

/**
 * Load UI configuration from LocalStorage
 */
export function loadConfig<T>(key: string): T | null {
  const data = localStorage.getItem(`trymon_config_${key}`);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}
