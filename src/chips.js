const statusNegative  = 1 << 7;
const statusOverflow  = 1 << 6;
const statusBrk       = 1 << 4;
const statusDecimal   = 1 << 3;
const statusIRQEnable = 1 << 2;
const statusZero      = 1 << 1;
const statusCarry     = 1 << 0;

class Microprocessor {
  constructor(coords, label) {
    this.state = "Reset";
    this.instructionCycle = 0;
    this.instructionReg = 0;
    this.aReg = 0;
    this.xReg = 0;
    this.yReg = 0;
    this.statusReg = 0b00110100;
    this.pcReg = 0;
    this.tmpReg = 0;
    this.spReg = 0;
    this.package = new ChipPackage(coords, 40, label);
    this.stateStr = "Power-on reset...";
  }

  draw() {
    this.package.draw();

    /* draw status line along the top */
    fill(0, 80, 0);
    noStroke();
    rect(0, 0, width, 52);

    fill(255);
    text("CPU: A=" + byte_to_hex_string(this.aReg) + "  " +
      "X=" + byte_to_hex_string(this.xReg) + "  " +
      "Y=" + byte_to_hex_string(this.yReg) + "  " +
      "St=" + byte_to_binary_string(this.statusReg) + "  " +
      "PC=" + word_to_hex_string(this.pcReg) + "  " +
      "SP=" + byte_to_hex_string(this.spReg),
      10, textSize() + (32 - textSize()) / 2);
    text("     " + this.stateStr,
      10, (textSize() * 2) + (32 - textSize()) / 2 + 2);
  }

  tick() {
    cpuControlBus.signals.writeEnable = false;
    cpuControlBus.signals.busEnable = false;
    let incrPC = true;

    if (this.state == "Reset") {
      switch (this.instructionCycle) {
        case 0:
          this.stateStr = "Fetching low byte of reset vector from 0xfffc";
          addrBus.value = 0xfffc;
          cpuControlBus.signals.busEnable = true;
          this.instructionCycle++;
          return;

        case 1:
          this.stateStr = "Fetching high byte of reset vector from 0xfffd";
          this.pcReg = dataBus.value & 0xff;
          addrBus.value++;
          cpuControlBus.signals.busEnable = true;
          this.instructionCycle++;
          return;

        case 2:
          this.pcReg |= (dataBus.value & 0xff) << 8;
          this.instructionCycle = 0;
          this.state = "Running";
          return;
      }
    }

    if (this.instructionCycle == 0) {
      /* fetch instruction from current PC */
      this.stateStr = "Fetching instruction at " + word_to_hex_string(this.pcReg);
      addrBus.value = this.pcReg;
      cpuControlBus.signals.busEnable = true;
      this.instructionCycle++;
      this.pcReg++;
      return;
    }

    if (this.instructionCycle == 1) {
      // console.log("fetched opcode " + byte_to_hex_string(dataBus.value) + " from address " + byte_to_hex_string(addrBus.value));
      this.instructionReg = dataBus.value;
    }

    switch (this.instructionReg) {
      /* jump absolute */
      case 0x4c:
        this.stateStr = "JMP absolute... ";
        switch (this.instructionCycle) {
          case 1:
            this.stateStr += "fetching low address byte";
            addrBus.value = this.pcReg;
            cpuControlBus.signals.busEnable = true;
            break;
          case 2:
            this.tmpReg = dataBus.value & 0xff;
            this.stateStr += "fetching high address byte";
            addrBus.value = this.pcReg;
            cpuControlBus.signals.busEnable = true;
            break;
          case 3:
            this.pcReg = this.tmpReg | (dataBus.value & 0xff) << 8;
            this.stateStr += "jumping to " + word_to_hex_string(this.pcReg);
            this.instructionCycle = 0;
            return;
        }
        break;

        /* store A at absolute address */
      case 0x8D:
        this.stateStr = "STA absolute... ";
        switch (this.instructionCycle) {
          case 1:
            this.stateStr += "fetching low address byte";
            addrBus.value = this.pcReg;
            cpuControlBus.signals.busEnable = true;
            break;
          case 2:
            this.tmpReg = dataBus.value & 0xff;
            this.stateStr += "fetching high address byte";
            addrBus.value = this.pcReg;
            cpuControlBus.signals.busEnable = true;
            break;
          case 3:
            addrBus.value = this.tmpReg | (dataBus.value & 0xff) << 8;
            dataBus.value = this.aReg;
            cpuControlBus.signals.busEnable = true;
            cpuControlBus.signals.writeEnable = true;
            this.stateStr += "writing " + byte_to_hex_string(this.aReg) + " to " + word_to_hex_string(addrBus.value);
            this.instructionCycle = 0;
            return;
        }
        break;

        /* load A with immediate */
      case 0xA9:
        this.stateStr = "LDA immediate... ";
        switch (this.instructionCycle) {
          case 1:
            this.stateStr += "fetching byte value";
            addrBus.value = this.pcReg;
            cpuControlBus.signals.busEnable = true;
            break;
          case 2:
            this.aReg = dataBus.value & 0xff;
            this.stateStr += "A = " + byte_to_hex_string(this.aReg);
            this.instructionCycle = 0;
            this.pc++;
            return;
        }
        break;

      /* increment byte in zero page */
      case 0xE6:
        this.stateStr = "INC zero-page byte... ";
        switch (this.instructionCycle) {
          case 1:
            this.stateStr += "fetching address";
            addrBus.value = this.pcReg;
            cpuControlBus.signals.busEnable = true;
            break;
          case 2:
            addrBus.value = dataBus.value & 0xff;
            this.stateStr += "reading byte at " + byte_to_hex_string(addrBus.value);
            cpuControlBus.signals.busEnable = true;
            incrPC = false;
            break;
          case 3:
            this.stateStr += "incrementing " + byte_to_hex_string(dataBus.value & 0xff);
            this.tmpReg = ((dataBus.value & 0xff) + 1) & 0xff;
            this.update_zero(this.tmpReg);
            this.update_negative(this.tmpReg);
            incrPC = false;
            break;
          case 4:
            this.stateStr += "writing " + byte_to_hex_string(this.tmpReg);
            dataBus.value = this.tmpReg;
            /* address bus value should still be the same */
            cpuControlBus.signals.busEnable = true;
            cpuControlBus.signals.writeEnable = true;
            this.instructionCycle = 0;
            return;
        }
        break;

        /* ignore bad opcodes */
      default:
        this.stateStr = "Unknown opcode " + byte_to_hex_string(this.instructionReg) + "!";
        this.instructionCycle = 0;
        this.pcReg++;
        return;
    }

    this.instructionCycle++;
    if (incrPC == true) this.pcReg++;
  }

  update_zero(value) {
    let s = this.statusReg;
    if (value == 0)
      this.statusReg |= statusZero;
    else
      this.statusReg &= ~statusZero;    
  }

  update_negative(value) {
    let s = this.statusReg;
    if (value & (1 << 7))
      this.statusReg |= statusNegative;
    else
      this.statusReg &= ~statusNegative;    
  }
}

class VIA {
  constructor(coords, label) {
    this.registers = new Array(16);
    this.package = new ChipPackage(coords, 40, label);
    this.dirAReg = 0;
    this.dirBReg = 0;
    this.aReg = 0;
    this.bReg = 0;
  }

  draw() {
    this.package.draw();
  }

  tick() {
    if (viaControlBus.signals.chipEnable == true) {
      /* TODO: Input latching support */
      if (viaControlBus.signals.writeEnable == true) {
        let byte = dataBus.value & 0xff;
        switch (addrBus.value & 0x0f) {
          /* write B and A bus values, depending on direction */
          case 0:
            viaBBus.value =
              (this.dirBReg & byte) |
              (!this.dirBReg & (viaBBus.value & 0xff));
            this.bReg = byte;
            break;
          case 1:
            viaABus.value =
              (this.dirAReg & byte) |
              (!this.dirAReg & (viaABus.value & 0xff));
            this.aReg = byte;
            break;

          /* update B and A bus directions */
          case 2:
            this.dirBReg = byte;
            break;
          case 3:
            this.dirAReg = byte;
            break;
        }
      } else {
        switch (addrBus.value & 0x0f) {
          /* read B and A bus values, depending on direction */
          case 0:
            dataBus.value =
              (this.dirBReg & (this.bReg & 0xff)) |
              (!this.dirBReg & (viaBBus.value & 0xff));
            break;
          case 1:
            dataBus.value = viaBBus.value & 0xff;
            break;
          /* read B and A direction values */
          case 2:
            dataBus.value = this.dirBReg & 0xff;
            break;
          case 3:
            dataBus.value = this.dirAReg & 0xff;
            break;
        }
      }
    }
  }
}

class Memory {
  constructor(size, base, coords, label, controlBus, writeAllowed) {
    this.base = base;
    this.memory = new Array();
    for (let i = 0; i < size; i++)
      this.memory[i] = 0;
    this.controlBus = controlBus;
    this.writeAllowed = writeAllowed;
    this.package = new ChipPackage(coords, 28, label);
    this.viewer = new Viewer(
      createVector(coords.x + this.package.width + 50, coords.y),
      400, this.package.length, label + " contents", this.base);
  }

  draw() {
    this.package.draw();
    this.viewer.draw(this.memory);
  }

  tick() {
    if (window[this.controlBus].signals.chipEnable == true) {
      let addr = addrBus.value % this.memory.length;

      if (window[this.controlBus].signals.writeEnable == true &&
        this.writeAllowed == true) {
        /* write contents of data bus to memory */
        this.memory[addr] = dataBus.value;
      } else {
        /* read contents of memory to data bus */
        dataBus.value = this.memory[addr];
      }
    }
  }
}

class AddressDecoder {
  constructor() {}

  tick() {
    ramControlBus.signals.chipEnable = false;
    romControlBus.signals.chipEnable = false;
    viaControlBus.signals.chipEnable = false;

    ramControlBus.signals.writeEnable =
      cpuControlBus.signals.writeEnable;
    romControlBus.signals.writeEnable =
      cpuControlBus.signals.writeEnable;
    viaControlBus.signals.writeEnable =
      cpuControlBus.signals.writeEnable;

    /* if the cpu isn't using the bus, keep everything disabled */
    if (cpuControlBus.signals.busEnable != true)
      return;

    /* select a chip to enable by decoding bits 14
    and 15 of the address bus:
    bit 15  14   Chip to enable
         0   0   16KB RAM          at 0x0000
         0   1   memory-mapped VIA at 0x4000
         1   0   16KB optional ROM at 0x8000
         1   1   16KB built-in ROM at 0xC000
    */
    switch ((addrBus.value >> 14) & 0b11) {
      case 0b00:
        ramControlBus.signals.chipEnable = true;
        break;

      case 0b01:
        viaControlBus.signals.chipEnable = true;
        break;

      case 0b11:
        romControlBus.signals.chipEnable = true;
        break;
    }
  }
}