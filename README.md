## Overview

This is a basic visual cycle-level emulation of a 6502 CPU and assorted integrated circuits, and an LCD screen, written in JavaScript using [p5.js](https://p5js.org/). The aim is to provide an educational introduction to simple computing systems, and the building blocks of much more complex and interesting systems.

To this aim, it display register contents and the current action of the CPU core on a per-clock-tick basis, allowing you to see exactly what the processor is doing at each stage and for each instruction.

Currently implemented:

 * 6502 CPU (LDA, STA, INC, JMP)
 * ROM and RAM
 * VIA interface chip (ORB, ORA, DIRA, DIRB registers, non-latching)
 * Simple LCD screen
 * Address decoding logic

## Try it live

* Play a recent version of the code [here](https://editor.p5js.org/diodesign/full/l1hndGSAK) in your browser.
* Tweak and play a recent version of the code [here](https://editor.p5js.org/diodesign/sketches/l1hndGSAK) in your browser.

Slide the speed control to the left to increase the processing rate, and to the right to decrease. The default program prints `Hi ` repeatedly. This can be changed by editing the opcodes in the `rom` array in `src/sketch.js`.

## Memory map

Peripherals and memories are placed within the following physical CPU memory map:

| Address range   | Description |
|-----------------|-------------|
| 0x0000 - 0x3FFF | 16KB RAM |
| 0x4000          | LCD data register via VIA ORB register |
| 0x4001          | LCD control register via VIA ORA register (toggle bit 0 to read and display character at 0x4000) |
| 0x4002          | VIA DIRB register |
| 0x4003          | VIA DIRA register |
| 0xC000 - 0xFFFF | 16KB ROM |

## Future work

* Fully implement the 6502 CPU
* Implement a means of user input, such as a keyboard
* Implement a frame buffer for more interesting graphical output
* Allow the loading of user programs in ROM and RAM space

## Copyright, contact, and usage

Copyright &copy; Chris Williams, 2020, 2024. See [LICENSE](LICENSE) for contact information and for distribution and use of source code, binaries, and documentation.
