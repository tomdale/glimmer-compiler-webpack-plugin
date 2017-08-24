const ARG_SHIFT = 8;
const TYPE_MASK        = 0b0000000011111111;
const OPERAND_LEN_MASK = 0b0000111100000000;
const MAX_SIZE         = 0b1111111111111111;
const TYPE_SIZE        = 0b11111111;

export class Encoder {
  static encode(program: number[]): string {
    let encoder = new this(program);
    let buffer = encoder.encode();
    return encoder.toHex(buffer);
  }

  static encodeToBuffer(program: number[]) {
    let encoder = new this(program);
    return encoder.encode();
  }

  constructor(private program: number[]) {}

  private encode(): number[] {
    let { program } = this;
    let encoded = [];
    for (let i = 0; i < program.length; i += 4) {
      let type = program[i];
      if (type > TYPE_SIZE) {
        throw new Error(`Opcode type over 8-bits. Got ${type}.`);
      }
      let op1 = program[i + 1];
      let op2 = program[i + 2];
      let op3 = program[i + 3];

      if (op1 > MAX_SIZE || op2 > MAX_SIZE || op3 > MAX_SIZE) {
        throw new Error(`Operand is over 16-bits.`);
      }

      let argsLength = this.getOperationLength(op1, op2, op3);
      encoded.push((type | (argsLength << ARG_SHIFT)));
      this.pushOperands(encoded, argsLength, op1, op2, op3);
    }

    return encoded;
  }

  private toHex(encoded: number[]): string {
    return String.fromCharCode.apply(null, new Uint16Array(encoded));
  }

  private pushOperands(encoded: number[], argsLength: number, op1: number, op2: number, op3: number) {
    switch(argsLength) {
      case 1:
        encoded.push(op1);
        break;
      case 2:
        encoded.push(op1);
        encoded.push(op2);
        break;
      case 3:
        encoded.push(op1);
        encoded.push(op2);
        encoded.push(op3);
        break;
    }
  }

  private getOperationLength(op1: number, op2: number, op3: number) {
    let length = 0;

    if (op1 !== 0) {
      length++;
    }

    if (op2 !== 0) {
      length++;
    }

    if (op3 !== 0) {
      length++;
    }

    return length;
  }
}

export class Decoder {
  static decode(hexString: string): Uint16Array {
    return new this().decode(hexString);
  }

  private decode(hexString: string): Uint16Array {
    let buffer = new ArrayBuffer(hexString.length * 2); // 2 bytes for each char
    let program = new Uint16Array(buffer);

    for (let i = 0; i < hexString.length; i++) {
      let instruction = hexString.charCodeAt(i);
      let type = (instruction & TYPE_MASK);
      let argsLength = (instruction & OPERAND_LEN_MASK) >> ARG_SHIFT;

      program[i] = type;

      if (argsLength === 0) {
        // Nothing to do
      }

      if (argsLength === 1) {
        program[i + 1] = hexString.charCodeAt(i + 1);
        i += 1;
      }

      if (argsLength === 2) {
        program[i + 1] = hexString.charCodeAt(i + 1);
        program[i + 2] = hexString.charCodeAt(i + 2);
        i += 2;
      }

      if (argsLength === 3) {
        program[i + 1] = hexString.charCodeAt(i + 1);
        program[i + 2] = hexString.charCodeAt(i + 2);
        program[i + 3] = hexString.charCodeAt(i + 3);
        i += 3;
      }
    }

    return program;
  }
}
