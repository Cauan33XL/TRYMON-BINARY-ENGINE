//! Symbol Resolver
//!
//! Handles PLT/GOT symbol resolution for ELF binaries.

use std::collections::HashMap;

/// Represents a symbol in an ELF binary
#[derive(Debug, Clone)]
pub struct Symbol {
    /// Name of the symbol
    pub name: String,
    /// Memory address of the symbol
    pub address: u64,
    /// Size of the symbol in bytes
    pub size: u64,
    /// Symbol binding (Local, Global, Weak)
    pub binding: SymbolBinding,
    /// Symbol type (Function, Object, etc.)
    pub symbol_type: SymbolType,
}

/// ELF symbol binding types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SymbolBinding {
    /// Local symbol
    Local,
    /// Global symbol
    Global,
    /// Weak symbol
    Weak,
}

/// ELF symbol types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SymbolType {
    /// No specified type
    Notype,
    /// Data object
    Object,
    /// Executable function
    Function,
    /// Section symbol
    Section,
    /// File symbol
    File,
}

/// A table of symbols indexed by name and address
#[derive(Debug, Clone)]
pub struct SymbolTable {
    symbols: HashMap<String, Symbol>,
    addresses: HashMap<u64, String>,
}

impl SymbolTable {
    /// Create a new empty symbol table
    pub fn new() -> Self {
        Self {
            symbols: HashMap::new(),
            addresses: HashMap::new(),
        }
    }

    /// Insert a symbol into the table
    pub fn insert(&mut self, symbol: Symbol) {
        self.symbols.insert(symbol.name.clone(), symbol.clone());
        self.addresses.insert(symbol.address, symbol.name);
    }

    /// Get a symbol by its name
    pub fn get_by_name(&self, name: &str) -> Option<&Symbol> {
        self.symbols.get(name)
    }

    /// Get a symbol name by its address
    pub fn get_by_address(&self, addr: u64) -> Option<&String> {
        self.addresses.get(&addr)
    }

    /// Get the number of symbols in the table
    pub fn len(&self) -> usize {
        self.symbols.len()
    }
}

impl Default for SymbolTable {
    fn default() -> Self {
        Self::new()
    }
}

/// Represents an entry in the Procedure Linkage Table
#[derive(Debug, Clone)]
pub struct PLTEntry {
    /// Address of the PLT stub
    pub address: u64,
    /// Name of the symbol being resolved
    pub name: String,
    /// Address in the Global Offset Table
    pub got_address: u64,
}

/// Resolver for PLT and GOT entries
pub struct PLTResolver {
    plt_entries: Vec<PLTEntry>,
    got_entries: HashMap<u64, String>,
    resolved_stubs: HashMap<String, usize>,
}

impl PLTResolver {
    /// Create a new empty PLT resolver
    pub fn new() -> Self {
        Self {
            plt_entries: Vec::new(),
            got_entries: HashMap::new(),
            resolved_stubs: HashMap::new(),
        }
    }

    /// Add a new PLT entry to the resolver
    pub fn add_plt_entry(&mut self, address: u64, name: String, got_address: u64) {
        self.plt_entries.push(PLTEntry {
            address,
            name: name.clone(),
            got_address,
        });
        self.got_entries.insert(got_address, name);
    }

    /// Resolve a symbol to a specific stub ID
    pub fn resolve_symbol(&mut self, name: &str, stub_id: usize) {
        self.resolved_stubs.insert(name.to_string(), stub_id);
    }

    /// Get a PLT entry by its address
    pub fn get_plt_entry(&self, address: u64) -> Option<&PLTEntry> {
        self.plt_entries.iter().find(|e| e.address == address)
    }

    /// Get the symbol name associated with a GOT address
    pub fn get_got_name(&self, got_addr: u64) -> Option<&String> {
        self.got_entries.get(&got_addr)
    }

    /// Check if a symbol has been resolved
    pub fn is_resolved(&self, name: &str) -> bool {
        self.resolved_stubs.contains_key(name)
    }
}

impl Default for PLTResolver {
    fn default() -> Self {
        Self::new()
    }
}

/// Implementation types for LibC functions
#[derive(Debug, Clone)]
pub enum LibcImpl {
    /// Implemented via a syscall
    Syscall(u32),
    /// Implemented via a custom Rust function
    Custom(fn(&[u32]) -> i32),
    /// Unimplemented stub
    Stub,
}

/// Metadata about an emulated LibC function
#[derive(Debug, Clone)]
pub struct LibcFunction {
    /// Name of the function (e.g., "printf")
    pub name: String,
    /// Associated Linux syscall number, if any
    pub syscall_number: Option<u32>,
    /// Implementation details
    pub implementation: LibcImpl,
}

/// Main resolver for all symbols and library functions
pub struct SymbolResolver {
    symbol_table: SymbolTable,
    plt_resolver: PLTResolver,
    libc_functions: HashMap<String, LibcFunction>,
    custom_resolvers: HashMap<String, ResolverCallback>,
}

type ResolverCallback = fn(&[u32]) -> i32;

impl SymbolResolver {
    /// Create a new SymbolResolver and initialize common LibC functions
    pub fn new() -> Self {
        let mut resolver = Self {
            symbol_table: SymbolTable::new(),
            plt_resolver: PLTResolver::new(),
            libc_functions: HashMap::new(),
            custom_resolvers: HashMap::new(),
        };

        resolver.init_libc_functions();
        resolver
    }

    fn init_libc_functions(&mut self) {
        let funcs = vec![
            ("printf", Some(1), LibcImpl::Custom(Self::handle_printf)),
            ("scanf", Some(0), LibcImpl::Stub),
            ("malloc", Some(9), LibcImpl::Custom(Self::handle_malloc)),
            ("free", Some(9), LibcImpl::Custom(Self::handle_free)),
            ("calloc", Some(9), LibcImpl::Custom(Self::handle_calloc)),
            ("realloc", Some(9), LibcImpl::Custom(Self::handle_realloc)),
            ("memcpy", None, LibcImpl::Custom(Self::handle_memcpy)),
            ("memset", None, LibcImpl::Custom(Self::handle_memset)),
            ("memcmp", None, LibcImpl::Custom(Self::handle_memcmp)),
            ("strlen", None, LibcImpl::Custom(Self::handle_strlen)),
            ("strcpy", None, LibcImpl::Custom(Self::handle_strcpy)),
            ("strncpy", None, LibcImpl::Custom(Self::handle_strncpy)),
            ("strcmp", None, LibcImpl::Custom(Self::handle_strcmp)),
            ("strncmp", None, LibcImpl::Custom(Self::handle_strncmp)),
            ("strcat", None, LibcImpl::Custom(Self::handle_strcat)),
            ("strncat", None, LibcImpl::Custom(Self::handle_strncat)),
            ("fopen", Some(2), LibcImpl::Stub),
            ("fclose", Some(3), LibcImpl::Stub),
            ("fread", Some(0), LibcImpl::Stub),
            ("fwrite", Some(1), LibcImpl::Stub),
            ("exit", Some(60), LibcImpl::Syscall(60)),
            ("_exit", Some(60), LibcImpl::Syscall(60)),
            ("exit_group", Some(231), LibcImpl::Syscall(231)),
            ("getpid", Some(39), LibcImpl::Syscall(39)),
            ("getuid", Some(102), LibcImpl::Syscall(102)),
            ("getgid", Some(104), LibcImpl::Syscall(104)),
            ("geteuid", Some(107), LibcImpl::Syscall(107)),
            ("getegid", Some(108), LibcImpl::Syscall(108)),
            ("getcwd", Some(79), LibcImpl::Stub),
            ("chdir", Some(80), LibcImpl::Stub),
            ("open", Some(2), LibcImpl::Syscall(2)),
            ("close", Some(3), LibcImpl::Syscall(3)),
            ("read", Some(0), LibcImpl::Syscall(0)),
            ("write", Some(1), LibcImpl::Syscall(1)),
            ("lseek", Some(8), LibcImpl::Syscall(8)),
            ("stat", Some(4), LibcImpl::Stub),
            ("fstat", Some(5), LibcImpl::Stub),
            ("pipe", Some(22), LibcImpl::Stub),
            ("fork", Some(57), LibcImpl::Stub),
            ("wait", Some(61), LibcImpl::Stub),
            ("execve", Some(59), LibcImpl::Stub),
            ("unlink", Some(87), LibcImpl::Stub),
            ("sleep", Some(35), LibcImpl::Stub),
            ("time", Some(201), LibcImpl::Syscall(201)),
            ("clock_gettime", Some(113), LibcImpl::Stub),
            ("sysconf", Some(-1i32 as u32), LibcImpl::Stub),
        ];

        for (name, syscall, impl_type) in funcs {
            self.libc_functions.insert(
                name.to_string(),
                LibcFunction {
                    name: name.to_string(),
                    syscall_number: syscall,
                    implementation: impl_type,
                },
            );
        }
    }

    /// Register a custom resolver for a symbol
    pub fn register_resolver(&mut self, name: String, callback: ResolverCallback) {
        self.custom_resolvers.insert(name, callback);
    }

    /// Resolve a symbol by name to its LibC implementation
    pub fn resolve(&self, name: &str) -> Option<&LibcFunction> {
        self.libc_functions.get(name).or_else(|| {
            self.custom_resolvers.get(name).map(|_| {
                let func = LibcFunction {
                    name: name.to_string(),
                    syscall_number: None,
                    implementation: LibcImpl::Stub,
                };
                Box::leak(Box::new(func)) as &LibcFunction
            })
        })
    }

    /// Check if a given address corresponds to a PLT entry
    pub fn is_plt_entry(&self, addr: u64) -> bool {
        self.plt_resolver.get_plt_entry(addr).is_some()
    }

    fn handle_printf(args: &[u32]) -> i32 {
        log::debug!("printf called with {} args", args.len());
        0
    }

    fn handle_malloc(args: &[u32]) -> i32 {
        log::debug!("malloc called with size: {}", args[0]);
        0
    }

    fn handle_free(args: &[u32]) -> i32 {
        log::debug!("free called with ptr: {}", args[0]);
        0
    }

    fn handle_calloc(args: &[u32]) -> i32 {
        log::debug!("calloc called");
        0
    }

    fn handle_realloc(args: &[u32]) -> i32 {
        log::debug!("realloc called");
        0
    }

    fn handle_memcpy(args: &[u32]) -> i32 {
        log::debug!("memcpy called");
        0
    }

    fn handle_memset(args: &[u32]) -> i32 {
        log::debug!("memset called");
        0
    }

    fn handle_memcmp(args: &[u32]) -> i32 {
        log::debug!("memcmp called");
        0
    }

    fn handle_strlen(args: &[u32]) -> i32 {
        log::debug!("strlen called with ptr: {}", args[0]);
        0
    }

    fn handle_strcpy(args: &[u32]) -> i32 {
        log::debug!("strcpy called");
        0
    }

    fn handle_strncpy(args: &[u32]) -> i32 {
        log::debug!("strncpy called");
        0
    }

    fn handle_strcmp(args: &[u32]) -> i32 {
        log::debug!("strcmp called");
        0
    }

    fn handle_strncmp(args: &[u32]) -> i32 {
        log::debug!("strncmp called");
        0
    }

    fn handle_strcat(args: &[u32]) -> i32 {
        log::debug!("strcat called");
        0
    }

    fn handle_strncat(args: &[u32]) -> i32 {
        log::debug!("strncat called");
        0
    }
}

impl Default for SymbolResolver {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_libc_resolution() {
        let resolver = SymbolResolver::new();

        let printf = resolver.resolve("printf");
        assert!(printf.is_some());
        assert_eq!(printf.unwrap().name, "printf");
    }

    #[test]
    fn test_unknown_symbol() {
        let resolver = SymbolResolver::new();

        let unknown = resolver.resolve("unknown_function");
        assert!(unknown.is_none());
    }
}
