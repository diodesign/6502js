/** 
 *
 * Simple 6502 CPU system emulator
 *
 * (c) Chris Williams, April 2020. MIT license. https://diodesign.org/
 *
 * There's a rise in interest in building simple 8-bit systems to
 * teach people the fundamentals of how computers work. Which is great.
 *
 * However, it can be a pain to order, store, and assemble the parts.
 * So this is an in-browser simulator of a basic 6502-based system to
 * make life easier for those of us who don't have the space or budget.
 *
 * Press play to run the simulation. Drag the slider to change the speed.
 * Left is faster, right is slower. It sets the number of milliseconds
 * between each CPU clock cycle, 1000ms being one second per cycle.
 * 
 * If there's interest in this, I'll finish it.
 * 
 * Currently implemented:
 * 6502 CPU (LDA, STA, INC, JMP)
 * ROM + RAM
 * VIA interface chip (ORB, ORA, DIRA, DIRB registers, non-latching)
 * Simple LCD screen
 * Address decoding logic
 *
 * The ROM, RAM and VIA are attached to the CPU's 16-bit address and 8-bit
 * data buses. Address decoding circuitry ensures the ROM, RAM or VIA chip
 * are only individually enabled when the CPU needs to access them.
 * The LCD screen is attached to the VIA's B and A buses; B connects to the
 * screen's data register, where it reads in characters to display, and A
 * connects to the screen's control signals, telling the display when it's
 * clear to read in a character. The CPU sends these signals to the B and A
 * bus by writing to VIA registers mapped to the addresses below.
 *
 * The memory map is:
 * 0x0000 - 0x3FFF: 16KB RAM
 * 
 * 0x4000: LCD data register via VIA ORB register
 * 0x4001: LCD control register via VIA ORA register
 * (toggle bit 0 to read and display character at 0x4000)
 *
 * 0x4002: VIA DIRB register
 * 0x4003: VIA DIRA register
 *
 * 0xC000 - 0xFFFF: 16KB ROM
 *
 * On startup, the CPU fetches the 16-bit address at the reset vector 0xFFFC,
 * and jumps to it. That address is 0xC000, which is the start of the program.
 *
 * That program does the following:
 * 1. Write 0xFF to DIRB and DIRA so that signals to the VIA chip from the CPU
 *    are output to the LCD screen. This connects the CPU to the LCD via the VIA.
 * 2. Write ASCII code for 'H' (0x48) to the LCD screen data register by writing
 *    to the VIA ORB register at 0x4000. The VIA passes these signals to the LCD.
 * 3. Toggle bit 0 of the VIA ORA register at 0x4001 to 1 and then 0. This is
 *    passed onto the LCD by the VIA chip, signalling it's time to read the data
 *    register and display the character. The LCD automatically displays one
 *    charatcter after another when it's signalled to read in characters from its
 *    data register.
 * 4. Repeat steps 2 and 3 with the characters 'i' and ' ' (0x69 and 0x20) to spell
 *    out 'Hi ' on the screen.
 * 5. Increment the memory location 0x0000 in RAM. This acts as a counter variable
 *    for the number of 'Hi's printed.
 * 6. Loop back to step 2.
 *
*/

var defaultClockTickRate = 2000;
var nextClockTick = 0;
var clockSlider;

var logic;
var cpu;
var rom;
var ram;
var via;
var io;

var addrBus;
var dataBus;
var cpuControlBus;
var ramControlBus;
var romControlBus;
var viaControlBus;
var viaABus;
var viaBBus;

function setup() {
  createCanvas(850, 720);
  textSize(chipWidth / 2);
  textAlign(LEFT, BOTTOM);
  textFont('Courier');
  
  clockSlider = createSlider(0, 4000, defaultClockTickRate);
  clockSlider.position(280, height);
  clockSlider.style('width', (width / 2) + "px");

  addrBus = new Bus();
  dataBus = new Bus();
  cpuControlBus = new Bus();
  ramControlBus = new Bus();
  romControlBus = new Bus();
  viaControlBus = new Bus();
  viaABus = new Bus();
  viaBBus = new Bus();

  logic = new AddressDecoder();

  cpu = new Microprocessor(
    createVector(30, 100),
    "CPU");

  rom = new Memory(
    16 * 1024, 0xC000,
    createVector(
      cpu.package.coords.x + cpu.package.width + 100,
      cpu.package.coords.y),
    "ROM", 'romControlBus', false);

  /* make the reset vector at 0xFFFC point to the start of ROM at 0xC000 */
  rom.memory[0x3FFC] = 0x00;
  rom.memory[0x3FFD] = 0xC0;
  
  /* our test code, starting at 0xC000 in the memory map,
  but 0x0000 from the base of the 16KB built-in ROM */
  let addr = 0;
  /* write 0xFF into VIA B and A direction registers
  at 0x4002 and 0x4003, indicating all output bits */
  rom.memory[addr++] = 0xA9; // LDA #0xFF
  rom.memory[addr++] = 0xFF;
  rom.memory[addr++] = 0x8D; // STA 0x4002
  rom.memory[addr++] = 0x02;
  rom.memory[addr++] = 0x40;
  rom.memory[addr++] = 0x8D; // STA 0x4003
  rom.memory[addr++] = 0x03;
  rom.memory[addr++] = 0x40;
  let loop_start = addr;
  /* write 'H' (0x48) to VIA B bus at 0x4000 and toggle bit 0
  of VIA A bus at 0x4000 to send the character to the LCD display */
  rom.memory[addr++] = 0xA9; // LDA #0x48
  rom.memory[addr++] = 0x48;
  rom.memory[addr++] = 0x8D; // STA 0x4000
  rom.memory[addr++] = 0x00;
  rom.memory[addr++] = 0x40;
  rom.memory[addr++] = 0xA9; // LDA #0x01
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x8D; // STA 0x4001
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x40;
  rom.memory[addr++] = 0xA9; // LDA #0x00
  rom.memory[addr++] = 0x00;
  rom.memory[addr++] = 0x8D; // STA 0x4001
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x40;
  /* write 'i' (0x69) to VIA B bus at 0x4000 and toggle bit 0
  of VIA A bus at 0x4000 to send the character to the LCD display */
  rom.memory[addr++] = 0xA9; // LDA #0x69
  rom.memory[addr++] = 0x69;
  rom.memory[addr++] = 0x8D; // STA 0x4000
  rom.memory[addr++] = 0x00;
  rom.memory[addr++] = 0x40;
  rom.memory[addr++] = 0xA9; // LDA #0x01
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x8D; // STA 0x4001
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x40;
  rom.memory[addr++] = 0xA9; // LDA #0x00
  rom.memory[addr++] = 0x00;
  rom.memory[addr++] = 0x8D; // STA 0x4001
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x40;
  /* write ' ' (0x20) to VIA B bus at 0x4000 and toggle bit 0
  of VIA A bus at 0x4000 to send the character to the LCD display */
  rom.memory[addr++] = 0xA9; // LDA #0x20
  rom.memory[addr++] = 0x20;
  rom.memory[addr++] = 0x8D; // STA 0x4000
  rom.memory[addr++] = 0x00;
  rom.memory[addr++] = 0x40;
  rom.memory[addr++] = 0xA9; // LDA #0x01
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x8D; // STA 0x4001
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x40;
  rom.memory[addr++] = 0xA9; // LDA #0x00
  rom.memory[addr++] = 0x00;
  rom.memory[addr++] = 0x8D; // STA 0x4001
  rom.memory[addr++] = 0x01;
  rom.memory[addr++] = 0x40;
  /* increment counter at RAM address 0x0000 */
  rom.memory[addr++] = 0xE6; // INC #0x00 (zp)
  rom.memory[addr++] = 0x00;
  /* infinite loop */
  rom.memory[addr++] = 0x4C; // JMP loop_start
  rom.memory[addr++] = loop_start;
  rom.memory[addr++] = 0xC0;

  via = new VIA(
    createVector(
      rom.package.coords.x,
      rom.package.coords.y + rom.package.length + 50),
    "VIA");

  ram = new Memory(
    16 * 1024, 0x0000,
    createVector(
      via.package.coords.x,
      via.package.coords.y + via.package.length + 50),
    "RAM", 'ramControlBus', true);

  io = new Peripherals(
    createVector(
      via.package.coords.x + via.package.width + 50,
      via.package.coords.y));
  
  /* we'll only draw 2 buses: the address and VIA A bus */
  addrBus.add_line(new BusLine(
    cpu.package.coords.x + cpu.package.width,
    rom.package.coords.y + rom.package.length / 2,
    rom.package.coords.x,
    rom.package.coords.y + rom.package.length / 2
  ));
  
  addrBus.add_line(new BusLine(
    cpu.package.coords.x + cpu.package.width + 
    (via.package.coords.x - (cpu.package.coords.x + cpu.package.width)) / 2,
    via.package.coords.y + via.package.length / 2,
    via.package.coords.x,
    via.package.coords.y + via.package.length / 2
  ));
  
  addrBus.add_line(new BusLine(
    cpu.package.coords.x + cpu.package.width + 
    (via.package.coords.x - (cpu.package.coords.x + cpu.package.width)) / 2,
    ram.package.coords.y + ram.package.length / 2,
    ram.package.coords.x,
    ram.package.coords.y + ram.package.length / 2
  ));
  
  addrBus.add_line(new BusLine(
    cpu.package.coords.x + cpu.package.width + 
    (rom.package.coords.x - (cpu.package.coords.x + cpu.package.width)) / 2,
    rom.package.coords.y + rom.package.length / 2,
    cpu.package.coords.x + cpu.package.width + 
    (rom.package.coords.x - (cpu.package.coords.x + cpu.package.width)) / 2,
    ram.package.coords.y + ram.package.length / 2
  ));
  
  viaABus.add_line(new BusLine(
    io.coords.x, io.coords.y + io.height / 2,
    via.package.coords.x + via.package.width,
    io.coords.y + io.height / 2
  ));
}

function draw() {
  background(0);
  noStroke();
  fill(255);
  text("Speed (" + clockSlider.value() + "ms/tick)", 10, height + 1);
  
  /* draw buses */
  addrBus.draw();
  viaABus.draw()

  /* update and draw chips */
  let timeNow = millis();
  if (timeNow > nextClockTick)
  {
    /* cpu must be processed first to drive the buses,
    then address + IO logic, then memory and memory-mapped IO */
    cpu.tick();
    logic.tick();
    via.tick();
    rom.tick();
    ram.tick();
    io.tick();
    
    nextClockTick = timeNow + clockSlider.value();
  }
  
  /* draw the visible chips */
  cpu.draw();
  rom.draw();
  ram.draw();
  via.draw();
  io.draw();
}