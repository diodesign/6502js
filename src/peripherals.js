const boxWidth = 560;
const boxHeight = 120;
const innerGap = 20;
const charTotalX = 24;
const charTotalY = 2;
const charGap = 2;
const charWidth = ((boxWidth - innerGap * 2) / charTotalX) - charGap;
const charHeight = ((boxHeight - innerGap * 2) / charTotalY) - charGap;

class Peripherals {
  constructor(
    coords,
    aBus,
    bBus) {
    this.coords = coords;
    this.width = boxWidth;
    this.height = boxHeight;
    this.aBus = aBus;
    this.bBus = bBus;
    this.lcdLatch = false;
    this.lcdPos = 0;
    this.lcdText = new Array();
    for (let i = 0; i < (charTotalX * charTotalY); i++)
    {
      this.lcdText[i] = ' ';
    }
  }

  draw() {
    fill(255);
    noStroke();
    rect(this.coords.x, this.coords.y, boxWidth, boxHeight);

    strokeWeight(1);
    stroke(255);
    text("LCD display", this.coords.x,
      this.coords.y - pinLength / 2);

    /* render characters */
    noStroke();

    let lcdX = this.coords.x + innerGap;
    let lcdY = this.coords.y + innerGap;
    
    for (let y = 0; y < charTotalY; y++) {
      for (let x = 0; x < charTotalX; x++) {
        fill(200, 255, 200);
        rect(lcdX + (x * (charWidth + charGap)),
          lcdY + (y * (charHeight + charGap)),
          charWidth,
          charHeight);
        fill(50);
        text(this.lcdText[(y * charTotalX) + x],
          lcdX + (x * (charWidth + charGap) + charGap * 2),
          lcdY + (y * (charHeight + charGap)) + textSize() + charGap * 5);
      }
    }
  }

  tick() {
    /* when bit 0 of VIA A Bus goes high, read the contents of VIA B Bus
    and update the LCD display */
    
    if ((viaABus.value & 1) && (this.lcdLatch == false))
    {
      this.lcdText[this.lcdPos++] = String.fromCharCode(viaBBus.value);
      this.lcdPos %= (charTotalX * charTotalY);
      this.lcdLatch = true;
    }
    
    /* waiting for the next high transition */
    if ((viaABus.value & 1) == 0)
      this.lcdLatch = false;
  }
}
