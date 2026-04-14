/**
 * Kernel Service — Single Source of Truth for Trymon OS
 * 
 * This singleton initializes the Rust kernel WASM module BEFORE any UI renders.
 * The frontend is purely a view layer on top of kernel state.
 * 
 * Lifecycle:
 *   1. import → WASM loads
 *   2. init() → kernel subsystems start
 *   3. restoreVFS() → previous state from IndexedDB
 *   4. ready → frontend can render
 */

import * as rust from '@wasm/pkg/trymon_kernel_rust.js';
import { loadVFS, saveVFS } from './persistence';

// ============================================================
// Types (mirror of kernel Rust structures)
// ============================================================

export interface BinaryInfo {
  id: string;
  name: string;
  format: 'AppImage' | 'deb' | 'rpm' | 'ELF' | 'Trymon' | 'Unknown';
  size: number;
  entry_point: string | null;
  extracted_files: string[];
  status: 'Ready' | 'Loading' | { Error: string };
  metadata: PackageMetadata | null;
}

export interface PackageMetadata {
  name: string | null;
  version: string | null;
  architecture: string | null;
  description: string | null;
  maintainer: string | null;
  dependencies: string[];
  icon: string | null;
  entry: string | null;
}

export interface ProcessInfo {
  pid: string;
  name: string;
  binary_id: string;
  state: 'Running' | 'Stopped' | 'Exited' | 'Crashed' | 'Zombie';
  exit_code: number | null;
  ppid: string | null;
  children: string[];
  memory_usage: number;
  cpu_usage: number;
  start_time: number;
  end_time: number | null;
  cwd: string;
  env: Record<string, string>;
  argv: string[];
  stdout: string;
  stderr: string;
}

export interface VfsStats {
  total_files: number;
  total_directories: number;
  total_size: number;
  mount_points: number;
}

export type SystemState = 'Booting' | 'Ready' | 'Running' | 'ShuttingDown' | 'Halted';

export interface KernelState {
  initialized: boolean;
  uptime: number;
  loaded_binaries: BinaryInfo[];
  running_processes: ProcessInfo[];
  memory_usage_bytes: number;
  filesystem_stats: VfsStats | null;
  state: SystemState;
  boot_logs: string[];
}

export type KernelUpdateCallback = (state: KernelState) => void;


// ============================================================
// Singleton State
// ============================================================

let _kernelReady = false;
let _kernelState: KernelState | null = null;
const _updateCallbacks: KernelUpdateCallback[] = [];

let _tickInterval: ReturnType<typeof setInterval> | null = null;
let _autoSaveInterval: ReturnType<typeof setInterval> | null = null;

// ============================================================
// Core API
// ============================================================

/**
 * Initialize the kernel. Must be called ONCE before any UI renders.
 * Returns the initial kernel state.
 */
let _isInitializing = false;

/**
 * Initialize the kernel. Must be called ONCE before any UI renders.
 * Returns the initial kernel state.
 */
export async function init(): Promise<KernelState> {
  if (_kernelReady) return getState();
  if (_isInitializing) return getState();

  _isInitializing = true;
  console.log('[KernelService] Loading WASM module...');

  // Initialize wasm-pack module
  if (typeof rust.default === 'function') {
    await rust.default();
  }

  console.log('[KernelService] Initializing kernel subsystems...');

  // Set initial state
  _kernelState = getState();

  // Call kernel init. This is a synchronous WASM call.
  try {
    rust.api_kernel_init('{}');
    console.log('[KernelService] Kernel API call returned.');

    // Stabilization sequence for UX (ensures person can see logs)
    return new Promise((resolve) => {
      let step = 0;
      const stabilization = [
        { msg: "Probing virtual motherboard... [OK]", delay: 500 },
        { msg: "Checking system memory layout... (128MB detected)", delay: 950 },
        { msg: "Scanning virtual PCI bus artifacts...", delay: 625 },
        { msg: "Establishing secure-boot handshake...", delay: 625 },
        { msg: "Searching for storage devices... [VFS_READY]", delay: 500 },
        { msg: "Initializing Trymon WASM Core v4.5.1...", delay: 750 },
        { msg: "Loading system shell & user services...", delay: 1050 }
      ];

      const runStabilization = () => {
        if (step < stabilization.length) {
          const s = stabilization[step];
          const realState = getState();
          
          // Force UI update during stabilization
          _kernelState = {
            ...realState,
            state: 'Booting', // Keep it in 'Booting' while we show our messages
            boot_logs: [...realState.boot_logs, s.msg]
          };
          _updateCallbacks.forEach(cb => cb(_kernelState!));

          setTimeout(() => {
            step++;
            runStabilization();
          }, s.delay);
        } else {
          // Finish line
          const finalState = getState();
          _kernelState = finalState;
          
          console.log('[KernelService] Boot sequence complete.');
          
          // Restore VFS state from persistence
          loadVFS().then(savedVFS => {
            if (savedVFS) {
              console.log('[KernelService] Restoring VFS state...');
              try {
                rust.kernel_import_vfs(savedVFS);
              } catch (e) {
                console.warn('[KernelService] VFS Restore failed (non-fatal):', e);
              }
            }
          }).catch(e => console.warn('[KernelService] VFS Restore failed:', e));

          _kernelReady = true;
          _isInitializing = false;
          _startTickLoop();
          _startAutoSave();

          // Seed Virtual Web Content
          seedVirtualWeb();

          // Initialize Trymord Backend
          initTrymordBackend();

          // Final notify
          console.log('[KernelService] Notifying callbacks, state:', _kernelState?.state);
          _updateCallbacks.forEach(cb => cb(_kernelState!));
          resolve(_kernelState!);
        }
      };

      runStabilization();
    });

  } catch (error) {
    console.error('[KernelService] Fatal init error:', error);
    _isInitializing = false;
    _kernelState = {
      ...getState(),
      state: 'Halted',
      boot_logs: [...(getState().boot_logs), `FATAL ERROR: ${error}`]
    };
    _updateCallbacks.forEach(cb => cb(_kernelState!));
    throw error;
  }
}



/**
 * Check if kernel is ready (synchronous)
 */
export function isReady(): boolean {
  return _kernelReady;
}

/**
 * Register a callback to be called when kernel is ready.
 * If already ready, callback is called immediately.
 */
export function onUpdate(callback: KernelUpdateCallback): () => void {
  if (_kernelState) {
    callback(_kernelState);
  }

  _updateCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    const idx = _updateCallbacks.indexOf(callback);
    if (idx >= 0) _updateCallbacks.splice(idx, 1);
  };
}


/**
 * Get current kernel state (synchronous snapshot)
 */
export function getState(): KernelState {
  try {
    const status = JSON.parse(rust.api_get_status());
    return {
      initialized: status.initialized,
      uptime: status.uptime,
      loaded_binaries: status.loaded_binaries || [],
      running_processes: listProcesses(),
      memory_usage_bytes: status.memory_usage_bytes,
      filesystem_stats: status.filesystem_stats,
      state: status.state,
      boot_logs: status.boot_logs || [],
    };
  } catch {
    return {
      initialized: false,
      uptime: 0,
      loaded_binaries: [],
      running_processes: [],
      memory_usage_bytes: 0,
      filesystem_stats: null,
      state: 'Booting',
      boot_logs: [],
    };
  }
}


// ============================================================
// Binary Management (delegates to kernel)
// ============================================================

export function loadBinary(name: string, data: Uint8Array): BinaryInfo {
  assertReady();
  const result = rust.api_load_binary(name, data);
  return JSON.parse(result);
}

export function executeBinary(binaryId: string, args: string = ''): ProcessInfo {
  assertReady();
  const result = rust.api_execute_binary(binaryId, args);
  return JSON.parse(result);
}

export function listBinaries(): BinaryInfo[] {
  if (!_kernelReady) return [];
  try {
    const status = JSON.parse(rust.api_get_status());
    return status.loaded_binaries || [];
  } catch {
    return [];
  }
}

export function removeBinary(_binaryId: string): void {
  assertReady();
  // Note: kernel doesn't have a remove_binary API yet
  // This would need to be added to lib.rs
  console.warn('[KernelService] removeBinary not yet implemented in kernel');
}

// ============================================================
// Process Management
// ============================================================

export function listProcesses(): ProcessInfo[] {
  if (!_kernelReady) return [];
  try {
    const result = rust.api_list_processes();
    return JSON.parse(result);
  } catch {
    return [];
  }
}

export function stopProcess(pid: string): void {
  assertReady();
  rust.api_stop_process(pid);
}

export function killProcess(pid: string): void {
  assertReady();
  rust.api_kill_process(pid);
}

export function sendInput(pid: string, input: string): void {
  assertReady();
  rust.api_send_input(pid, input);
}

export function getProcessOutput(pid: string): string {
  if (!_kernelReady) return '';
  try {
    return rust.api_get_output(pid);
  } catch {
    return '';
  }
}

// ============================================================
// Shell
// ============================================================

export function shellInput(input: string): string {
  if (!_kernelReady) return 'Kernel not ready\n';
  return rust.api_shell_input(input);
}

export function getShellPrompt(): string {
  if (!_kernelReady) return '# ';
  return rust.api_shell_get_prompt();
}

// ============================================================
// Filesystem
// ============================================================

export function listDir(path: string): any[] {
  if (!_kernelReady) return [];
  try {
    const result = rust.api_list_dir(path);
    return JSON.parse(result);
  } catch {
    return [];
  }
}

export function readFile(path: string): Uint8Array | null {
  if (!_kernelReady) return null;
  try {
    return rust.api_read_file(path);
  } catch {
    return null;
  }
}

export function writeFile(path: string, content: string): boolean {
  if (!_kernelReady) return false;
  try {
    const data = new TextEncoder().encode(content);
    rust.api_write_file(path, data);
    return true;
  } catch (e) {
    console.error(`[KernelService] Failed to write file ${path}:`, e);
    return false;
  }
}

export function mount(path: string, source: string, fsType: string): void {
  assertReady();
  rust.api_mount(path, source, fsType);
}

export function unmount(path: string): void {
  assertReady();
  rust.api_unmount(path);
}

export function resolvePath(path: string): string {
  assertReady();
  return rust.api_resolve_path(path);
}

export function vfsStats(): VfsStats | null {
  if (!_kernelReady) return null;
  try {
    const result = rust.api_vfs_stats();
    return JSON.parse(result);
  } catch {
    return null;
  }
}

// ============================================================
// VFS Export/Import
// ============================================================

export function exportVFS(): string | null {
  if (!_kernelReady) return null;
  try {
    return rust.kernel_export_vfs();
  } catch {
    return null;
  }
}

export async function saveVFSState(): Promise<void> {
  const vfsJson = exportVFS();
  if (vfsJson) {
    await saveVFS(vfsJson);
  }
}

// ============================================================
// Trymon Apps
// ============================================================

export function installTrymonApp(binaryId: string): BinaryInfo | null {
  if (!_kernelReady) return null;
  try {
    const result = rust.kernel_trymon_install(binaryId);
    return JSON.parse(result);
  } catch {
    return null;
  }
}

export function listTrymonApps(): any[] {
  if (!_kernelReady) return [];
  try {
    const result = rust.kernel_trymon_list_apps();
    return JSON.parse(result);
  } catch {
    return [];
  }
}

export function runTrymonApp(appId: string): any | null {
  if (!_kernelReady) return null;
  try {
    const result = rust.kernel_trymon_run_app(appId);
    return JSON.parse(result);
  } catch {
    return null;
  }
}

// ============================================================
// Internal Helpers
// ============================================================

function assertReady(): void {
  if (!_kernelReady) {
    throw new Error('Kernel not initialized');
  }
}

function _startTickLoop(): void {
  _tickInterval = setInterval(() => {
    if (_kernelReady) {
      try {
        rust.api_tick();
        _kernelState = getState();
      } catch (e) {
        console.error('[KernelService] Tick error:', e);
      }
    }
  }, 1000);
}

function _startAutoSave(): void {
  // Auto-save VFS every 30 seconds
  _autoSaveInterval = setInterval(() => {
    if (_kernelReady) {
      saveVFSState();
    }
  }, 30000);
}

/**
 * Cleanup — stops tick and auto-save intervals
 * Call this when unmounting the app
 */
export function cleanup(): void {
  if (_tickInterval) {
    clearInterval(_tickInterval);
    _tickInterval = null;
  }
  if (_autoSaveInterval) {
    clearInterval(_autoSaveInterval);
    _autoSaveInterval = null;
  }
}

// ============================================================
// Direct rust export for advanced usage
// ============================================================

// ============================================================
// Virtual Web Seeding
// ============================================================

function seedVirtualWeb() {
  console.log('[KernelService] Seeding Virtual Web Content...');
  
  // Create /www structure
  rust.api_shell_input('mkdir -p /www/store /www/social /www/cloud');

  // Trymon Store
  writeFile('/www/store/index.json', JSON.stringify({
    title: 'Trymon App Store',
    hero: 'O marketplace oficial dos melhores binários para o seu sistema.',
    theme: '#00f2ff',
    sections: [
      {
        title: 'Principais Aplicativos',
        items: [
          { id: 'binary_1', name: 'Code Editor Pro', desc: 'Editor de código focado em performance.', icon: 'FileCode', action: 'Install' },
          { id: 'binary_2', name: 'Video Station', desc: 'Player de mídia universal para o Trymon.', icon: 'Image', action: 'Install' }
        ]
      },
      {
        title: 'Utilidades',
        items: [
          { id: 'util_1', name: 'Network Monitor', desc: 'Acompanhe o tráfego em tempo real.', icon: 'Activity', action: 'Run' },
          { id: 'util_2', name: 'Disk Cleaner', desc: 'Otimize seu VFS com um clique.', icon: 'Trash2', action: 'Run' }
        ]
      }
    ]
  }));

  // Trymon Social
  writeFile('/www/social/index.json', JSON.stringify({
    title: 'Trymon Connect',
    hero: 'Onde todos os processos se encontram.',
    theme: '#7ee787',
    sections: [
      {
        title: 'Novidades do Kernel',
        items: [
          { id: 'post_1', name: 'Kernel v4.5 lançado!', desc: 'Melhorias de 20% no VFS e novos drivers.', icon: 'Cpu' },
          { id: 'post_2', name: 'Novas atualizações de segurança', desc: 'Estamos protegendo seu ambiente WASM.', icon: 'ShieldCheck' }
        ]
      }
    ]
  }));

  // Trymon Cloud
  writeFile('/www/cloud/index.json', JSON.stringify({
    title: 'Trymon Cloud Drive',
    hero: 'Seus arquivos, em qualquer terminal.',
    theme: '#ffa657',
    sections: [
      {
        title: 'Arquivos Recentes',
        items: [
          { id: 'cloud_1', name: 'backup_system.trymon', desc: 'Salvo há 2 horas.', icon: 'Package' },
          { id: 'cloud_2', name: 'resume.pdf', desc: 'Salvo com sucesso.', icon: 'FileText' }
        ]
      }
    ]
  }));
}

// Trymord Persistence
export function saveTrymordMessage(message: any) {
  if (!_kernelReady) return;
  const history = getTrymordHistory();
  history.push(message);
  writeFile('/var/log/trymord/history.json', JSON.stringify(history));
}

export function getTrymordHistory(): any[] {
  if (!_kernelReady) return [];
  const content = readFile('/var/log/trymord/history.json');
  if (!content) return [];
  try {
    return JSON.parse(new TextDecoder().decode(content));
  } catch {
    return [];
  }
}

function initTrymordBackend() {
  console.log('[KernelService] Initializing Trymord Backend...');
  rust.api_shell_input('mkdir -p /var/log/trymord');
  if (!readFile('/var/log/trymord/history.json')) {
    const initialHistory = [
      { user: 'Trymon AI', avatar: 'AI', text: 'Bem-vindo ao servidor oficial Trymon Kernel! Sinta-se em casa.', time: '10:30' },
      { user: 'Root', avatar: 'R', text: 'Alguém testou o novo carregador de binários?', time: '11:05' }
    ];
    writeFile('/var/log/trymord/history.json', JSON.stringify(initialHistory));
  }
}

export { rust };
