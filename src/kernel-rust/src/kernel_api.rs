//! Kernel API Module
//!
//! High-level API functions exposed to JavaScript via WASM bindings.
//! This module provides the interface between the web frontend and kernel.

use crate::{KernelConfig, TrymonKernel, KERNEL};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Initialize kernel with configuration
#[wasm_bindgen]
pub fn api_kernel_init(config_json: &str) -> Result<String, JsValue> {
    let config: KernelConfig =
        serde_json::from_str(config_json).unwrap_or_else(|_| KernelConfig::default());

    // Try to initialize logger - may already be initialized
    let _ = wasm_logger::init(wasm_logger::Config::new(match config.log_level {
        0 => log::Level::Error,
        1 => log::Level::Warn,
        2 => log::Level::Info,
        _ => log::Level::Debug,
    }));

    log::info!("[KernelAPI] Initializing Trymon kernel...");

    let mut kernel = TrymonKernel::new(config);

    // Initialize with error handling
    if let Err(e) = kernel.init() {
        log::error!("[KernelAPI] Kernel init failed: {}", e);
        return Err(JsValue::from(format!("Kernel init failed: {}", e)));
    }

    *KERNEL.lock() = Some(kernel);

    log::info!("[KernelAPI] Kernel initialized successfully");
    Ok("{\"status\": \"ok\", \"message\": \"Kernel initialized\"}".to_string())
}

/// Load and register a binary
#[wasm_bindgen]
pub fn api_load_binary(name: &str, data: Vec<u8>) -> Result<String, JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel
        .loader
        .load_binary(name, &data)
        .map(|info| serde_json::to_string(&info).unwrap_or_default())
        .map_err(JsValue::from)
}

/// Execute a loaded binary
#[wasm_bindgen]
pub fn api_execute_binary(binary_id: &str, _args: &str) -> Result<String, JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel
        .processes
        .execute_binary(&kernel.loader, &mut kernel.vfs, binary_id)
        .map(|info| serde_json::to_string(&info).unwrap_or_default())
        .map_err(JsValue::from)
}

/// Stop a running process
#[wasm_bindgen]
pub fn api_stop_process(pid: &str) -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.processes.stop_process(pid).map_err(JsValue::from)
}

/// Send input to a process
#[wasm_bindgen]
pub fn api_send_input(pid: &str, input: &str) -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel
        .processes
        .send_input(pid, input)
        .map_err(JsValue::from)
}

/// Get process output
#[wasm_bindgen]
pub fn api_get_output(pid: &str) -> String {
    let k = KERNEL.lock();
    match k.as_ref() {
        Some(kernel) => kernel.processes.get_output(pid).unwrap_or_default(),
        None => String::new(),
    }
}

/// List all processes
#[wasm_bindgen]
pub fn api_list_processes() -> String {
    let k = KERNEL.lock();
    match k.as_ref() {
        Some(kernel) => {
            let processes = kernel.processes.list_processes();
            serde_json::to_string(&processes).unwrap_or_default()
        }
        None => "[]".to_string(),
    }
}

/// Get kernel status
#[wasm_bindgen]
pub fn api_get_status() -> String {
    let k = KERNEL.lock();
    match k.as_ref() {
        Some(kernel) => {
            let status = KernelStatusResponse {
                initialized: true,
                uptime: kernel.uptime,
                loaded_binaries: kernel.loader.loaded_binaries().len(),
                running_processes: kernel.processes.running_count(),
                memory_usage_bytes: kernel.processes.memory_usage(),
                filesystem_stats: kernel.vfs.stats(),
                config: kernel.config.clone(),
                state: kernel.state,
                boot_logs: kernel.boot_logs.clone(),
            };
            serde_json::to_string(&status).unwrap_or_default()
        }
        None => {
            log::warn!("[KernelAPI] api_get_status called but kernel is not initialized");
            serde_json::to_string(&KernelStatusResponse {
                initialized: false,
                uptime: 0,
                loaded_binaries: 0,
                running_processes: 0,
                memory_usage_bytes: 0,
                filesystem_stats: crate::virtual_fs::FileSystemStats {
                    total_files: 0,
                    total_directories: 0,
                    total_size: 0,
                    mount_points: 0,
                },
                config: crate::KernelConfig::default(),
                state: crate::SystemState::Booting, // Return Booting instead of Halted for uninitialized state
                boot_logs: vec!["[API] Waiting for kernel initialization...".to_string()],
            })
            .unwrap_or_default()
        }
    }
}

/// Get the full system state including boot logs
#[wasm_bindgen]
pub fn api_get_system_state() -> String {
    let k = KERNEL.lock();
    match k.as_ref() {
        Some(kernel) => {
            let info = crate::SystemInfo {
                state: kernel.state,
                uptime: kernel.uptime,
                boot_logs: kernel.boot_logs.clone(),
                memory_usage: kernel.processes.memory_usage(),
            };
            serde_json::to_string(&info).unwrap_or_default()
        }
        None => "{\"state\": \"Halted\", \"uptime\": 0, \"boot_logs\": [], \"memory_usage\": 0}"
            .to_string(),
    }
}

/// Mount a filesystem
#[wasm_bindgen]
pub fn api_mount(path: &str, source: &str, fs_type: &str) -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel
        .vfs
        .mount(path, source, fs_type)
        .map_err(JsValue::from)
}

/// Unmount a filesystem
#[wasm_bindgen]
pub fn api_unmount(path: &str) -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.vfs.unmount(path).map_err(JsValue::from)
}

/// List files in a directory
#[wasm_bindgen]
pub fn api_list_dir(path: &str) -> String {
    let k = KERNEL.lock();
    match k.as_ref() {
        Some(kernel) => match kernel.vfs.list_directory(path) {
            Ok(files) => serde_json::to_string(&files).unwrap_or_default(),
            Err(_) => "[]".to_string(),
        },
        None => "[]".to_string(),
    }
}

/// Read a file's content
#[wasm_bindgen]
pub fn api_read_file(path: &str) -> Result<Vec<u8>, JsValue> {
    let k = KERNEL.lock();
    let kernel = k
        .as_ref()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.vfs.read_file(path).map_err(JsValue::from)
}

/// Write data to a file (creates if not exists)
#[wasm_bindgen]
pub fn api_write_file(path: &str, data: Vec<u8>) -> Result<String, JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    // write_file creates if not exists, so we want the ID
    let id = if let Some(file) = kernel.vfs.get_file(path) {
        file.id.clone()
    } else {
        kernel
            .vfs
            .create_file(path, data.clone(), false)
            .map_err(JsValue::from)?
    };

    kernel.vfs.write_file(path, data).map_err(JsValue::from)?;

    Ok(id)
}

/// Create a new directory
#[wasm_bindgen]
pub fn api_create_directory(path: &str) -> Result<String, JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.vfs.create_directory(path).map_err(JsValue::from)?;

    let id = kernel
        .vfs
        .get_file(path)
        .map(|f| f.id.clone())
        .ok_or_else(|| JsValue::from_str("Failed to retrieve new directory ID"))?;

    Ok(id)
}

/// Rename/move a file or directory
#[wasm_bindgen]
pub fn api_rename(src: &str, dst: &str) -> Result<String, JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.vfs.rename(src, dst).map_err(JsValue::from)?;

    Ok("ok".to_string())
}

/// Tick the kernel (call periodically for process updates)
#[wasm_bindgen]
pub fn api_tick() {
    let mut k = KERNEL.lock();
    if let Some(kernel) = k.as_mut() {
        kernel.processes.tick(kernel.uptime);
        kernel.uptime += 1;
    }
}

/// Send input to the interactive shell
#[wasm_bindgen]
pub fn api_shell_input(input: &str) -> String {
    let mut k = KERNEL.lock();
    match k.as_mut() {
        Some(kernel) => kernel.shell.handle_input(
            input,
            &mut kernel.vfs,
            &mut kernel.processes,
            &kernel.loader,
        ),
        None => "Error: Kernel not initialized\n".to_string(),
    }
}

/// Get the current shell prompt
#[wasm_bindgen]
pub fn api_shell_get_prompt() -> String {
    let k = KERNEL.lock();
    match k.as_ref() {
        Some(kernel) => kernel.shell.get_prompt().to_string(),
        None => "# ".to_string(),
    }
}

/// Resolve a path (handles ./, ../, ~, symlinks)
#[wasm_bindgen]
pub fn api_resolve_path(path: &str) -> Result<String, JsValue> {
    let k = KERNEL.lock();
    let kernel = k
        .as_ref()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.vfs.resolve_path(path).map_err(JsValue::from)
}

/// Check file permissions
#[wasm_bindgen]
pub fn api_check_permissions(
    path: &str,
    uid: u32,
    gid: u32,
    required: u16,
) -> Result<bool, JsValue> {
    let k = KERNEL.lock();
    let kernel = k
        .as_ref()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    match kernel.vfs.check_permissions(path, uid, gid, required) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Begin a filesystem transaction
#[wasm_bindgen]
pub fn api_begin_transaction(operation: &str) {
    let mut k = KERNEL.lock();
    if let Some(kernel) = k.as_mut() {
        kernel.vfs.begin_transaction(operation);
    }
}

/// Commit the current filesystem transaction
#[wasm_bindgen]
pub fn api_commit_transaction() -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.vfs.commit_transaction().map_err(JsValue::from)
}

/// Rollback the current filesystem transaction
#[wasm_bindgen]
pub fn api_rollback_transaction() -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.vfs.rollback_transaction().map_err(JsValue::from)
}

/// Get VFS statistics
#[wasm_bindgen]
pub fn api_vfs_stats() -> String {
    let k = KERNEL.lock();
    match k.as_ref() {
        Some(kernel) => {
            let stats = kernel.vfs.stats();
            serde_json::to_string(&stats).unwrap_or_default()
        }
        None => "{\"total_files\":0,\"total_directories\":0,\"total_size\":0,\"mount_points\":0}"
            .to_string(),
    }
}

/// Send a signal to a process
#[wasm_bindgen]
pub fn api_send_signal(pid: &str, signal_num: i32) -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    let signal = crate::process_manager::Signal::from_number(signal_num)
        .ok_or_else(|| JsValue::from_str(&format!("Invalid signal number: {}", signal_num)))?;

    kernel
        .processes
        .send_signal(pid, signal)
        .map_err(JsValue::from)
}

/// Kill a process immediately
#[wasm_bindgen]
pub fn api_kill_process(pid: &str) -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel.processes.kill_process(pid).map_err(JsValue::from)
}

/// Create a pipe between two processes
#[wasm_bindgen]
pub fn api_create_pipe(reader_pid: &str, writer_pid: &str) -> Result<String, JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel
        .processes
        .create_pipe(reader_pid, writer_pid)
        .map_err(JsValue::from)
}

/// Write data to a pipe
#[wasm_bindgen]
pub fn api_write_to_pipe(pipe_id: &str, data: Vec<u8>) -> Result<(), JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel
        .processes
        .write_to_pipe(pipe_id, &data)
        .map_err(JsValue::from)
}

/// Read data from a pipe
#[wasm_bindgen]
pub fn api_read_from_pipe(pipe_id: &str, max_bytes: usize) -> Result<Vec<u8>, JsValue> {
    let mut k = KERNEL.lock();
    let kernel = k
        .as_mut()
        .ok_or_else(|| JsValue::from_str("Kernel not initialized"))?;

    kernel
        .processes
        .read_from_pipe(pipe_id, max_bytes)
        .map_err(JsValue::from)
}

// ============================================================
// Response types
// ============================================================

/// Kernel status response
#[derive(Serialize, Deserialize)]
pub struct KernelStatusResponse {
    /// Is kernel initialized
    pub initialized: bool,
    /// Kernel uptime (seconds)
    pub uptime: u64,
    /// Number of loaded binaries
    pub loaded_binaries: usize,
    /// Number of running processes
    pub running_processes: usize,
    /// Total memory usage in bytes
    pub memory_usage_bytes: u64,
    /// Filesystem statistics
    pub filesystem_stats: crate::virtual_fs::FileSystemStats,
    /// Kernel configuration
    pub config: crate::KernelConfig,
    /// Current system state
    pub state: crate::SystemState,
    /// Boot logs
    pub boot_logs: Vec<String>,
}
