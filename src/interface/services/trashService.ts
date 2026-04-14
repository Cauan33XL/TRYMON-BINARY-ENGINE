/**
 * Trash Service for Trymon OS
 * Manages deleted files/folders that can be restored or permanently deleted.
 * 
 * Architecture:
 * - Files moved to trash store metadata + content in IndexedDB
 * - Trash directory in VFS: /Trash
 * - Each trash item: { id, name, originalPath, type, size, deletedAt, content }
 */

const TRASH_DB_NAME = 'trymon_trash_db';
const TRASH_STORE_NAME = 'trash_items';

export interface TrashItem {
  id: string;
  name: string;
  originalPath: string;
  type: 'file' | 'directory';
  size: number;
  deletedAt: number;
  content: Uint8Array | null; // For files
  children?: TrashItem[]; // For directories (recursive)
  permissions: number;
  executable: boolean;
}

/**
 * Open the trash database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TRASH_DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRASH_STORE_NAME)) {
        db.createObjectStore(TRASH_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Move a file/folder to trash
 */
export async function moveToTrash(item: Omit<TrashItem, 'id' | 'deletedAt'>): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const trashItem: TrashItem = {
    ...item,
    id,
    deletedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.add(trashItem);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * List all items in trash
 */
export async function listTrashItems(): Promise<TrashItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Restore an item from trash
 * Returns the restored item data
 */
export async function restoreFromTrash(id: string): Promise<TrashItem | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        // Remove from trash
        store.delete(id);
        resolve(item);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Permanently delete an item from trash
 */
export async function permanentlyDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Empty the entire trash
 */
export async function emptyTrash(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get trash count
 */
export async function getTrashCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get trash size (total bytes)
 */
export async function getTrashSize(): Promise<number> {
  const items = await listTrashItems();
  return items.reduce((total, item) => total + item.size, 0);
}
