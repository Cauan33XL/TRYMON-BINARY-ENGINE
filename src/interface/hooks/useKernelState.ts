/**
 * useKernelState Hook
 * 
 * Subscribes React components to kernel state updates.
 * The kernel is the single source of truth — this hook provides
 * reactive access to binaries, processes, and VFS state.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as kernel from '../services/kernelService';
import type { KernelState, BinaryInfo } from '../services/kernelService';

// ============================================================
// Main hook — full kernel state subscription
// ============================================================

export function useKernelState() {
  const [state, setState] = useState<KernelState>(() => kernel.getState());

  useEffect(() => {
    // Subscribe to all kernel updates
    const unsubscribe = kernel.onUpdate((s) => {
      setState(s);
    });

    // Use poller for state updates when the kernel ticker runs
    const pollInterval = setInterval(() => {
      // Always get latest state if kernel is ready to be queried
      // This prevents UI state from lagging behind WASM state
      const currentState = kernel.getState();
      setState(currentState);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Derived readiness
  const ready = useMemo(() => {
    return state.state === 'Running' || state.state === 'Ready';
  }, [state.state]);

  return useMemo(() => ({
    ready,
    state,
    initialized: state.initialized,
    uptime: state.uptime,
    binaries: state.loaded_binaries,
    processes: state.running_processes,
    memoryUsage: state.memory_usage_bytes,
    vfsStats: state.filesystem_stats,
    tvm_error: state.tvm_error,
    tvm_ready: state.tvm_ready,
  }), [ready, state]);
}

// ============================================================
// Binary-specific hooks
// ============================================================

export function useKernelBinaries() {
  const { ready, binaries } = useKernelState();

  const loadBinary = useCallback(async (file: File): Promise<BinaryInfo> => {
    const data = new Uint8Array(await file.arrayBuffer());
    return kernel.loadBinary(file.name, data);
  }, []);

  const removeBinary = useCallback((binaryId: string) => {
    kernel.removeBinary(binaryId);
  }, []);

  const executeBinary = useCallback((binaryId: string, args: string = '') => {
    return kernel.executeBinary(binaryId, args);
  }, []);

  return useMemo(() => ({
    ready,
    binaries,
    loadBinary,
    removeBinary,
    executeBinary,
  }), [ready, binaries, loadBinary, removeBinary, executeBinary]);
}

export function useBinaryById(binaryId: string | undefined) {
  const { binaries } = useKernelState();
  return binaries.find(b => b.id === binaryId) || null;
}

// ============================================================
// Process hooks
// ============================================================

export function useKernelProcesses() {
  const { ready, processes } = useKernelState();

  const stopProcess = useCallback((pid: string) => {
    kernel.stopProcess(pid);
  }, []);

  const killProcess = useCallback((pid: string) => {
    kernel.killProcess(pid);
  }, []);

  const sendInput = useCallback((pid: string, input: string) => {
    kernel.sendInput(pid, input);
  }, []);

  const getOutput = useCallback((pid: string) => {
    return kernel.getProcessOutput(pid);
  }, []);

  return useMemo(() => ({
    ready,
    processes,
    stopProcess,
    killProcess,
    sendInput,
    getOutput,
  }), [ready, processes, stopProcess, killProcess, sendInput, getOutput]);
}

export function useProcessById(pid: string | undefined) {
  const { processes } = useKernelState();
  const process = processes.find(p => p.pid === pid) || null;

  const output = process ? kernel.getProcessOutput(pid!) : '';
  const stop = useCallback(() => { pid && kernel.stopProcess(pid); }, [pid]);
  const kill = useCallback(() => { pid && kernel.killProcess(pid); }, [pid]);
  const sendInput = useCallback((input: string) => { pid && kernel.sendInput(pid!, input); }, [pid]);

  return useMemo(() => ({
    process,
    output,
    stop,
    kill,
    sendInput,
  }), [process, output, stop, kill, sendInput]);
}

// ============================================================
// Shell hooks
// ============================================================

export function useKernelShell() {
  const { ready } = useKernelState();
  const [output, setOutput] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (ready && !initialized) {
      const initialPrompt = kernel.getShellPrompt();
      setOutput(initialPrompt);
      setInitialized(true);
    }
  }, [ready, initialized]);

  const clear = useCallback(() => {
    setOutput(kernel.getShellPrompt());
  }, []);

  const sendInput = useCallback((input: string) => {
    const trimmedInput = input.trim();
    
    // Command Interceptor for Native OS Actions
    if (trimmedInput === 'clear') {
      clear();
      return;
    }
    
    if (trimmedInput === 'exit') {
      // Logic for exit usually involves closing the terminal window.
      // This is often handled by the UI layer, but we can emit a signal here.
      setOutput(prev => prev + '\nExiting terminal...\n');
      return;
    }

    if (trimmedInput.startsWith('trym')) {
      const args = trimmedInput.split(' ').slice(1);
      const command = args[0];

      if (!command || command === 'help') {
        const help = `\r\n\x1b[1;33mTRYMON Package Manager (trym)\x1b[0m\r\n` +
          `Usage: trym <command> [arguments]\r\n\r\n` +
          `Commands:\r\n` +
          `  \x1b[1;32mlist\x1b[0m           List installed applications\r\n` +
          `  \x1b[1;32msearch <term>\x1b[0m  Search for packages in the repository\r\n` +
          `  \x1b[1;32minstall <id>\x1b[0m   Install a package by ID\r\n` +
          `  \x1b[1;32muninstall <id>\x1b[0m Remove an installed package\r\n` +
          `  \x1b[1;32mupdate\x1b[0m         Update the package database\r\n\r\n`;
        setOutput(prev => prev + help + kernel.getShellPrompt());
        return;
      }

      if (command === 'list') {
        const apps = kernel.listTrymonApps();
        let listOut = `\r\n\x1b[1;33mInstalled Applications:\x1b[0m\r\n`;
        if (apps.length === 0) {
          listOut += `No applications installed via trym.\r\n`;
        } else {
          apps.forEach(app => {
            listOut += ` \x1b[1;32m●\x1b[0m \x1b[1m${app.name || app.id}\x1b[0m (v${app.version || '1.0.0'})\r\n`;
          });
        }
        setOutput(prev => prev + listOut + '\r\n' + kernel.getShellPrompt());
        return;
      }

      if (command === 'search') {
        const term = args[1];
        if (!term) {
          setOutput(prev => prev + `\r\ntrym: missing search term\r\n` + kernel.getShellPrompt());
          return;
        }
        const results = kernel.searchRepository(term);
        let searchOut = `\r\n\x1b[1;34mSearching for "${term}"...\x1b[0m\r\n`;
        if (results.length === 0) {
          searchOut += `No packages found matching "${term}".\r\n`;
        } else {
          results.forEach(item => {
            searchOut += ` \x1b[1;32m➜\x1b[0m \x1b[1m${item.id}\x1b[0m: ${item.name} - ${item.desc}\r\n`;
          });
        }
        setOutput(prev => prev + searchOut + '\r\n' + kernel.getShellPrompt());
        return;
      }

      if (command === 'install') {
        const appId = args[1];
        if (!appId) {
          setOutput(prev => prev + `\r\ntrym: missing package ID\r\n` + kernel.getShellPrompt());
          return;
        }
        
        // Mock installation sequence for UX
        setOutput(prev => prev + `\r\n\x1b[1mInstalling ${appId}...\x1b[0m\r\nReading dependencies...\r\n`);
        
        setTimeout(() => {
          const result = kernel.installTrymonApp(appId);
          if (result) {
            setOutput(prev => prev + `\x1b[1;34m[##########]\x1b[0m 100% - Unpacking\r\n\x1b[1;32mSUCCESS:\x1b[0m ${appId} installed successfully.\r\n\r\n` + kernel.getShellPrompt());
          } else {
            setOutput(prev => prev + `\x1b[1;31mERROR:\x1b[0m Package "${appId}" not found or installation failed.\r\n\r\n` + kernel.getShellPrompt());
          }
        }, 1000);
        return;
      }
    }

    const result = kernel.shellInput(input);
    if (result) {
      setOutput(prev => prev + result);
    }
  }, [clear]);

  const prompt = useMemo(() => kernel.getShellPrompt(), []);

  return useMemo(() => ({
    ready,
    output,
    prompt,
    sendInput,
    clear,
  }), [ready, output, prompt, sendInput, clear]);
}

// ============================================================
// Trymon Apps hooks
// ============================================================

export function useTrymonApps() {
  const { ready } = useKernelState();

  const apps = useMemo(() => kernel.listTrymonApps(), [ready]);

  const installApp = useCallback((binaryId: string) => {
    return kernel.installTrymonApp(binaryId);
  }, []);

  const runApp = useCallback((appId: string) => {
    return kernel.runTrymonApp(appId);
  }, []);

  return useMemo(() => ({
    ready,
    apps,
    installApp,
    runApp,
  }), [ready, apps, installApp, runApp]);
}

// ============================================================
// VFS hooks
// ============================================================

export function useVFS() {
  const { vfsStats } = useKernelState();

  const saveState = useCallback(() => {
    return kernel.saveVFSState();
  }, []);

  return useMemo(() => ({
    stats: vfsStats,
    saveState,
  }), [vfsStats, saveState]);
}

// ============================================================
// TVM hooks
// ============================================================

export function getTVMSandboxStatus() {
  return kernel.getTVMSandboxStatus();
}
