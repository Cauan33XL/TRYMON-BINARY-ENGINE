/**
 * Shell WASM Integration Hook
 * Uses the Rust-compiled shell module for bash-like functionality
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as rust from '@wasm/pkg/trymon_kernel_rust.js';

interface ShellWasmState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useShellWasm() {
  const [state, setState] = useState<ShellWasmState>({
    isReady: false,
    isLoading: true,
    error: null
  });

  const wasmLoaded = useRef(false);
  const outputRef = useRef<string>('TRYMON Shell v1.0.0\nType "help" for available commands.\n\n$ ');

  const initialize = useCallback(async () => {
    if (wasmLoaded.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Initialize the WASM module (wasm-pack handles WASM loading automatically)
      if (typeof rust.default === 'function') {
        await rust.default();
      }

      wasmLoaded.current = true;
      setState(prev => ({ ...prev, isReady: true, isLoading: false }));
    } catch (error) {
      console.error('Shell WASM Initialization Error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize shell'
      }));
    }
  }, []);


  useEffect(() => {
    initialize();
  }, [initialize]);

  const execute = useCallback(async (command: string): Promise<string> => {
    if (!wasmLoaded.current) {
      return 'Shell not ready, using fallback mode...\n';
    }

    try {
      if (rust.api_shell_input) {
        const result = rust.api_shell_input(command);
        return result || '';
      }
      return 'Kernel API not available\n';
    } catch (error) {
      return `Error: ${error}\n`;
    }
  }, []);

  const sendInput = useCallback((input: string): string => {
    if (!wasmLoaded.current) {
      outputRef.current += input;
      return input;
    }

    try {
      if (rust.api_shell_input) {
        const result = rust.api_shell_input(input);
        outputRef.current += result || '';
      } else {
        outputRef.current += input;
      }
    } catch (error) {
      outputRef.current += input;
    }
    return input;
  }, []);

  const getOutput = useCallback((): string => {
    return outputRef.current;
  }, []);

  const appendOutput = useCallback((text: string) => {
    outputRef.current += text;
  }, []);

  const clearOutput = useCallback(() => {
    outputRef.current = '$ ';
  }, []);

  const getStatus = useCallback(async () => {
    if (!wasmLoaded.current) return null;
    try {
      if (rust.api_get_status) {
        const status = rust.api_get_status();
        return JSON.parse(status);
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  return useMemo(() => ({
    state,
    execute,
    sendInput,
    getOutput,
    appendOutput,
    clearOutput,
    getStatus,
    isReady: state.isReady,
    isLoading: state.isLoading,
    error: state.error
  }), [state, execute, sendInput, getOutput, appendOutput, clearOutput, getStatus]);
}