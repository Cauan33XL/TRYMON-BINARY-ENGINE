//! x86_64 Disassembler
//!
//! Translates x86_64 machine code to TVM bytecode.

use super::bytecode::Opcode;

#[derive(Debug, Clone)]
pub enum X86Instruction {
    /// Move register to register
    MovRR { 
        /// Destination register
        dst: u8, 
        /// Source register
        src: u8 
    },
    /// Move immediate to register
    MovRI { 
        /// Destination register
        dst: u8, 
        /// Immediate value
        imm: u64 
    },
    /// Move memory to register
    MovRM { 
        /// Destination register
        dst: u8, 
        /// Memory address
        addr: u64 
    },
    /// Move register to memory
    MovMR { 
        /// Memory address
        addr: u64, 
        /// Source register
        src: u8 
    },
    /// Push register onto stack
    Push { 
        /// Register to push
        reg: u8 
    },
    /// Pop register from stack
    Pop { 
        /// Register to pop into
        reg: u8 
    },
    /// Add register to register
    AddRR { 
        /// Destination register
        dst: u8, 
        /// Source register
        src: u8 
    },
    /// Subtract register from register
    SubRR { 
        /// Destination register
        dst: u8, 
        /// Source register
        src: u8 
    },
    /// Multiply register by register
    MulRR { 
        /// Destination register
        dst: u8, 
        /// Source register
        src: u8 
    },
    /// Divide by register
    DivR { 
        /// Register to divide by
        reg: u8 
    },
    /// Bitwise AND register with register
    AndRR { 
        /// Destination register
        dst: u8, 
        /// Source register
        src: u8 
    },
    /// Bitwise OR register with register
    OrRR { 
        /// Destination register
        dst: u8, 
        /// Source register
        src: u8 
    },
    /// Bitwise XOR register with register
    XorRR { 
        /// Destination register
        dst: u8, 
        /// Source register
        src: u8 
    },
    /// Compare register with register
    CmpRR { 
        /// First value
        a: u8, 
        /// Second value
        b: u8 
    },
    /// Test register with register (bitwise AND that updates flags)
    TestRR { 
        /// First value
        a: u8, 
        /// Second value
        b: u8 
    },
    /// Unconditional jump
    Jmp { 
        /// Jump offset
        offset: i32 
    },
    /// Jump if zero (equal)
    Jz { 
        /// Jump offset
        offset: i32 
    },
    /// Jump if not zero (not equal)
    Jnz { 
        /// Jump offset
        offset: i32 
    },
    /// Jump if greater
    Jg { 
        /// Jump offset
        offset: i32 
    },
    /// Jump if less
    Jl { 
        /// Jump offset
        offset: i32 
    },
    /// Procedure call
    Call { 
        /// Call offset
        offset: i32 
    },
    /// Return from procedure
    Ret,
    /// System call
    Syscall,
    /// Load effective address
    Lea { 
        /// Destination register
        dst: u8, 
        /// Address expression
        addr: u64 
    },
    /// Move string byte
    Movsb,
    /// Move string word
    Movsw,
    /// Move string doubleword
    Movsd,
    /// Move string quadword
    Movsq,
    /// No operation
    Nop,
    /// Halt execution
    Hlt,
    /// Unknown or unsupported instruction
    Unknown(Vec<u8>),
}

/// A decoded x86 instruction with its length and original address
#[derive(Debug, Clone)]
pub struct DecodedX86Instruction {
    /// The decoded opcode and operands
    pub opcode: X86Instruction,
    /// Length of the instruction in bytes
    pub length: usize,
    /// Original memory address of the instruction
    pub address: u64,
}

/// x86_64 Disassembler state
pub struct Disassembler {
    position: usize,
    data: Vec<u8>,
    base_address: u64,
}

impl Disassembler {
    /// Create a new disassembler for the given data and base address
    pub fn new(data: Vec<u8>, base_address: u64) -> Self {
        Self {
            position: 0,
            data,
            base_address,
        }
    }

    /// Decode all instructions in the data
    pub fn decode_all(&mut self) -> Vec<DecodedX86Instruction> {
        let mut instructions = Vec::new();

        while self.position < self.data.len() {
            match self.decode_one() {
                Some(inst) => instructions.push(inst),
                None => break,
            }
        }

        instructions
    }

    /// Decode a single instruction at the current position
    pub fn decode_one(&mut self) -> Option<DecodedX86Instruction> {
        if self.position >= self.data.len() {
            return None;
        }

        let start_pos = self.position;
        let addr = self.base_address + start_pos as u64;
        let byte = self.data[self.position];

        let (opcode, length) = self.decode_instruction(byte);

        Some(DecodedX86Instruction {
            opcode,
            length,
            address: addr,
        })
    }

    fn decode_instruction(&mut self, byte: u8) -> (X86Instruction, usize) {
        match byte {
            0x90 => (X86Instruction::Nop, 1),
            0xF4 => (X86Instruction::Hlt, 1),
            0xC3 => (X86Instruction::Ret, 1),
            0x0F => self.decode_0f_prefix(),
            0x48 => self.decode_rex_prefix(),
            0x89 => self.decode_mov_rm(),
            0x8B => self.decode_mov_mr(),
            0x85 => self.decode_test(),
            0x80..=0x8F => self.decode_80_prefix(byte),
            0xA0..=0xAF => self.decode_a0_prefix(byte),
            0xB8..=0xBF => self.decode_mov_ri(byte),
            0xB0..=0xBF => self.decode_b0_prefix(byte),
            0x3D => self.decode_cmp_imm(),
            0xC6..=0xC7 => self.decode_c6_prefix(byte),
            0xC8..=0xCF => self.decode_c8_prefix(byte),
            0xE8 => self.decode_call(byte),
            0xE9 => self.decode_jmp(byte),
            0xEB => self.decode_jmp_short(byte),
            0x70..=0x7F => self.decode_jcc(byte),
            0x31 => self.decode_xor(),
            0x29 => self.decode_sub(),
            0x01 => self.decode_add(),
            0xFF => self.decode_ff_prefix(),
            0x9C => (X86Instruction::Push { reg: 0 }, 1),
            0x9D => (X86Instruction::Pop { reg: 0 }, 1),
            0x58..=0x5F => {
                let reg = byte - 0x58;
                (X86Instruction::Pop { reg }, 1)
            }
            0x50..=0x57 => {
                let reg = byte - 0x50;
                (X86Instruction::Push { reg }, 1)
            }
            0x05 => self.decode_add_imm(),
            0x2D => self.decode_sub_imm(),
            0x25 => self.decode_and_imm(),

            _ => (X86Instruction::Unknown(vec![byte]), 1),
        }
    }

    fn decode_0f_prefix(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Unknown(vec![0x0F]), 1);
        }

        self.position += 1;
        let byte2 = self.data[self.position];

        match byte2 {
            0x84..=0x8F => {
                self.position += 1;
                if self.position + 3 < self.data.len() {
                    let offset = i32::from_le_bytes([
                        self.data[self.position],
                        self.data[self.position + 1],
                        self.data[self.position + 2],
                        self.data[self.position + 3],
                    ]);
                    self.position += 3;

                    let inst = match byte2 {
                        0x84 => X86Instruction::Jz { offset },
                        0x85 => X86Instruction::Jnz { offset },
                        0x8C => X86Instruction::Jl { offset },
                        0x8D => X86Instruction::Jg { offset },
                        _ => X86Instruction::Jmp { offset },
                    };
                    return (inst, 6);
                }
            }
            0xB6 | 0xB7 | 0xBE | 0xBF => {
                self.position += 1;
                return (X86Instruction::Nop, 2);
            }
            _ => {}
        }

        (X86Instruction::Unknown(vec![0x0F, byte2]), 2)
    }

    fn decode_80_prefix(&mut self, byte: u8) -> (X86Instruction, usize) {
        if self.position + 2 >= self.data.len() {
            return (X86Instruction::Unknown(vec![byte]), 1);
        }

        self.position += 1;
        let _modrm = self.data[self.position];
        self.position += 1;
        self.position += 1;

        (X86Instruction::Nop, 3)
    }

    fn decode_a0_prefix(&mut self, byte: u8) -> (X86Instruction, usize) {
        match byte {
            0xA0 | 0xA1 => {
                if self.position + 4 < self.data.len() {
                    let _imm = u32::from_le_bytes([
                        self.data[self.position],
                        self.data[self.position + 1],
                        self.data[self.position + 2],
                        self.data[self.position + 3],
                    ]);
                    self.position += 4;
                    return (X86Instruction::Nop, 5);
                }
                (X86Instruction::Nop, 1)
            }
            0xA2 | 0xA3 => (X86Instruction::Nop, 1),
            _ => (X86Instruction::Unknown(vec![byte]), 1),
        }
    }

    fn decode_b0_prefix(&mut self, byte: u8) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        let reg = byte - 0xB0;
        self.position += 1;
        let imm = self.data[self.position] as u64;

        (X86Instruction::MovRI { dst: reg, imm }, 2)
    }

    fn decode_c6_prefix(&mut self, _byte: u8) -> (X86Instruction, usize) {
        if self.position + 2 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 3;
        (X86Instruction::Nop, 3)
    }

    fn decode_c8_prefix(&mut self, _byte: u8) -> (X86Instruction, usize) {
        (X86Instruction::Nop, 1)
    }

    fn decode_call(&mut self, _byte: u8) -> (X86Instruction, usize) {
        if self.position + 4 >= self.data.len() {
            return (X86Instruction::Unknown(vec![0xE8]), 1);
        }

        let offset = i32::from_le_bytes([
            self.data[self.position],
            self.data[self.position + 1],
            self.data[self.position + 2],
            self.data[self.position + 3],
        ]);
        self.position += 4;

        (X86Instruction::Call { offset }, 5)
    }

    fn decode_jmp(&mut self, _byte: u8) -> (X86Instruction, usize) {
        if self.position + 4 >= self.data.len() {
            return (X86Instruction::Unknown(vec![0xE9]), 1);
        }

        let offset = i32::from_le_bytes([
            self.data[self.position],
            self.data[self.position + 1],
            self.data[self.position + 2],
            self.data[self.position + 3],
        ]);
        self.position += 4;

        (X86Instruction::Jmp { offset }, 5)
    }

    fn decode_jmp_short(&mut self, _byte: u8) -> (X86Instruction, usize) {
        if self.position >= self.data.len() {
            return (X86Instruction::Unknown(vec![0xEB]), 1);
        }

        let offset = self.data[self.position] as i8 as i32;
        self.position += 1;

        (X86Instruction::Jmp { offset }, 2)
    }

    fn decode_jcc(&mut self, byte: u8) -> (X86Instruction, usize) {
        if self.position >= self.data.len() {
            return (X86Instruction::Unknown(vec![byte]), 1);
        }

        let offset = self.data[self.position] as i8 as i32;
        self.position += 1;

        let jcc = match byte {
            0x70 => X86Instruction::Jnz { offset },
            0x74 => X86Instruction::Jz { offset },
            0x7C => X86Instruction::Jl { offset },
            0x7D => X86Instruction::Jg { offset },
            _ => X86Instruction::Jmp { offset },
        };

        (jcc, 2)
    }

    fn decode_rex_prefix(&mut self) -> (X86Instruction, usize) {
        if self.position >= self.data.len() {
            return (X86Instruction::Unknown(vec![0x48]), 1);
        }

        self.position += 1;
        self.decode_instruction(self.data[self.position])
    }

    fn decode_mov_rm(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];
        let dst = (modrm >> 3) & 0x7;
        let src = modrm & 0x7;

        (X86Instruction::MovRR { dst, src }, 2)
    }

    fn decode_mov_mr(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];
        let dst = (modrm >> 3) & 0x7;
        let src = modrm & 0x7;

        (X86Instruction::MovRR { dst, src }, 2)
    }

    fn decode_mov_ri(&mut self, byte: u8) -> (X86Instruction, usize) {
        if self.position + 4 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        let reg = byte - 0xB8;
        let imm = u64::from_le_bytes([
            self.data[self.position],
            self.data[self.position + 1],
            self.data[self.position + 2],
            self.data[self.position + 3],
            self.data[self.position + 4],
            self.data[self.position + 5],
            self.data[self.position + 6],
            self.data[self.position + 7],
        ]);
        self.position += 8;

        (X86Instruction::MovRI { dst: reg, imm }, 9)
    }

    fn decode_xor(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];
        let dst = (modrm >> 3) & 0x7;
        let src = modrm & 0x7;

        (X86Instruction::XorRR { dst, src }, 2)
    }

    fn decode_sub(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];
        let dst = (modrm >> 3) & 0x7;
        let src = modrm & 0x7;

        (X86Instruction::SubRR { dst, src }, 2)
    }

    fn decode_add(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];
        let dst = (modrm >> 3) & 0x7;
        let src = modrm & 0x7;

        (X86Instruction::AddRR { dst, src }, 2)
    }

    fn decode_test(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];
        let a = (modrm >> 3) & 0x7;
        let b = modrm & 0x7;

        (X86Instruction::TestRR { a, b }, 2)
    }

#[allow(dead_code)]
    fn decode_cmp(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];
        let a = (modrm >> 3) & 0x7;
        let b = modrm & 0x7;

        (X86Instruction::CmpRR { a, b }, 2)
    }

    fn decode_ff_prefix(&mut self) -> (X86Instruction, usize) {
        if self.position + 1 >= self.data.len() {
            return (X86Instruction::Unknown(vec![0xFF]), 1);
        }

        self.position += 1;
        let modrm = self.data[self.position];

        match (modrm >> 3) & 0x7 {
            2 => (X86Instruction::Call { offset: 0 }, 2),
            4 => (X86Instruction::Jmp { offset: 0 }, 2),
            _ => (X86Instruction::Nop, 2),
        }
    }

    fn decode_add_imm(&mut self) -> (X86Instruction, usize) {
        if self.position + 4 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        let _imm = u32::from_le_bytes([
            self.data[self.position],
            self.data[self.position + 1],
            self.data[self.position + 2],
            self.data[self.position + 3],
        ]);
        self.position += 4;

        (X86Instruction::AddRR { dst: 0, src: 0 }, 5)
    }

    fn decode_sub_imm(&mut self) -> (X86Instruction, usize) {
        if self.position + 4 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 4;
        (X86Instruction::SubRR { dst: 0, src: 0 }, 5)
    }

    fn decode_and_imm(&mut self) -> (X86Instruction, usize) {
        if self.position + 4 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 4;
        (X86Instruction::AndRR { dst: 0, src: 0 }, 5)
    }

    fn decode_cmp_imm(&mut self) -> (X86Instruction, usize) {
        if self.position + 4 >= self.data.len() {
            return (X86Instruction::Nop, 1);
        }

        self.position += 4;
        (X86Instruction::CmpRR { a: 0, b: 0 }, 5)
    }
}

/// Translate a decoded instruction to TVM bytecode
pub fn translate_to_tvm(inst: &DecodedX86Instruction) -> Vec<u8> {
    let mut ops = Vec::new();

    match &inst.opcode {
        X86Instruction::Nop => {
            ops.push(Opcode::NOP as u8);
        }
        X86Instruction::Hlt => {
            ops.push(Opcode::HALT as u8);
        }
        X86Instruction::Ret => {
            ops.push(Opcode::RET as u8);
        }
        X86Instruction::Syscall => {
            ops.push(Opcode::SYSCALL as u8);
        }
        X86Instruction::Jmp { offset } => {
            ops.push(Opcode::JMP as u8);
            ops.extend_from_slice(&offset.to_le_bytes());
        }
        X86Instruction::Jz { offset } => {
            ops.push(Opcode::JZ as u8);
            ops.extend_from_slice(&offset.to_le_bytes());
        }
        X86Instruction::Jnz { offset } => {
            ops.push(Opcode::JNZ as u8);
            ops.extend_from_slice(&offset.to_le_bytes());
        }
        X86Instruction::Jl { offset } => {
            ops.push(Opcode::JL as u8);
            ops.extend_from_slice(&offset.to_le_bytes());
        }
        X86Instruction::Jg { offset } => {
            ops.push(Opcode::JG as u8);
            ops.extend_from_slice(&offset.to_le_bytes());
        }
        X86Instruction::Call { offset } => {
            ops.push(Opcode::CALL as u8);
            ops.extend_from_slice(&offset.to_le_bytes());
        }
        X86Instruction::MovRR { dst, src } => {
            ops.push(Opcode::MOV as u8);
            ops.push(*dst);
            ops.push(*src);
        }
        X86Instruction::MovRI { dst, imm } => {
            ops.push(Opcode::MOVI as u8);
            ops.push(*dst);
            ops.extend_from_slice(&imm.to_le_bytes());
        }
        X86Instruction::MovRM { dst, addr } => {
            ops.push(Opcode::LOAD as u8);
            ops.push(*dst);
            ops.extend_from_slice(&addr.to_le_bytes());
        }
        X86Instruction::MovMR { addr, src } => {
            ops.push(Opcode::STORE as u8);
            ops.extend_from_slice(&addr.to_le_bytes());
            ops.push(*src);
        }
        X86Instruction::AddRR { dst, src } => {
            ops.push(Opcode::ADD as u8);
            ops.push(*dst);
            ops.push(*src);
        }
        X86Instruction::SubRR { dst, src } => {
            ops.push(Opcode::SUB as u8);
            ops.push(*dst);
            ops.push(*src);
        }
        X86Instruction::MulRR { dst, src } => {
            ops.push(Opcode::MUL as u8);
            ops.push(*dst);
            ops.push(*src);
        }
        X86Instruction::DivR { reg } => {
            ops.push(Opcode::DIV as u8);
            ops.push(*reg);
        }
        X86Instruction::AndRR { dst, src } => {
            ops.push(Opcode::AND as u8);
            ops.push(*dst);
            ops.push(*src);
        }
        X86Instruction::OrRR { dst, src } => {
            ops.push(Opcode::OR as u8);
            ops.push(*dst);
            ops.push(*src);
        }
        X86Instruction::XorRR { dst, src } => {
            ops.push(Opcode::XOR as u8);
            ops.push(*dst);
            ops.push(*src);
        }
        X86Instruction::CmpRR { a, b } => {
            ops.push(Opcode::CMP_EQ as u8);
            ops.push(*a);
            ops.push(*b);
        }
        X86Instruction::TestRR { a, b } => {
            ops.push(Opcode::AND as u8);
            ops.push(*a);
            ops.push(*b);
        }
        X86Instruction::Push { reg } => {
            ops.push(Opcode::PUSH_IMM32 as u8);
            ops.extend_from_slice(&(*reg as u32).to_le_bytes());
        }
        X86Instruction::Pop { reg } => {
            ops.push(Opcode::POP as u8);
            ops.push(*reg);
        }
        X86Instruction::Lea { dst, addr } => {
            ops.push(Opcode::LEA as u8);
            ops.push(*dst);
            ops.extend_from_slice(&addr.to_le_bytes());
        }
        X86Instruction::Movsb => {
            ops.push(Opcode::MOV as u8);
        }
        X86Instruction::Movsw => {
            ops.push(Opcode::MOV as u8);
        }
        X86Instruction::Movsd => {
            ops.push(Opcode::MOV as u8);
        }
        X86Instruction::Movsq => {
            ops.push(Opcode::MOV as u8);
        }
        X86Instruction::Unknown(bytes) => {
            log::warn!("Unknown instruction: {:x?}", bytes);
            ops.push(Opcode::NOP as u8);
        }
    }

    ops
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nop_decode() {
        let data = vec![0x90];
        let mut disasm = Disassembler::new(data, 0);
        let inst = disasm.decode_one().unwrap();
        assert!(matches!(inst.opcode, X86Instruction::Nop));
    }

    #[test]
    fn test_ret_decode() {
        let data = vec![0xC3];
        let mut disasm = Disassembler::new(data, 0);
        let inst = disasm.decode_one().unwrap();
        assert!(matches!(inst.opcode, X86Instruction::Ret));
    }
}
