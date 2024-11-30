class Viewer {
  constructor(coords, sizeX, sizeY, label, base) {
    this.coords = coords;
    this.width = sizeX;
    this.height = sizeY;
    this.label = label;
    this.offset = 0;
    this.base = base;
  }

  draw(data) {
    fill(255);
    strokeWeight(1);
    stroke(255);
    text(this.label, this.coords.x,
      this.coords.y - pinLength / 2);
    
    noStroke();
    let rows = this.height / textSize();
    let cols = 8;
    for (let y = 0; y < rows; y++)
    {
      let addr = this.offset + (y * cols);
      let ypos = this.coords.y + ((y + 1) * textSize());
      let output = word_to_hex_string(this.base + addr) + ": ";
      fill(255);
      text(output, this.coords.x, ypos);
      
      for (let x = 0; x < cols; x++)
      {
        if (cpuControlBus.signals.busEnable == true &&
            addrBus.value == (addr + this.base + x))
        {
          if (cpuControlBus.signals.writeEnable == true)
            fill(255, 0, 0);
          else
            fill(0, 255, 0);
        }
        else
          fill(255);
        
        output = byte_to_hex_string(data[addr + x]);
        text(output, this.coords.x + 90 + (x * 60), ypos);
      }
    }
  }
}

function byte_to_hex_string(value)
{
  if (value < 0x10)
    return "0x0" + value.toString(16);
  return "0x" + value.toString(16);
}

function word_to_hex_string(value)
{
  if (value < 0x10)
    return "0x000" + value.toString(16);
  if (value < 0x100)
    return "0x00" + value.toString(16);
  if (value < 0x1000)
    return "0x0" + value.toString(16);
  return "0x" + value.toString(16);
}

function byte_to_binary_string(value)
{
  if (value < 0b1)
    return "0b00000000";
  if (value < 0b10)
    return "0b0000000" + value.toString(2);
  if (value < 0b100)
    return "0b000000" + value.toString(2);
  if (value < 0b1000)
    return "0b00000" + value.toString(2);
  if (value < 0b10000)
    return "0b0000" + value.toString(2);
  if (value < 0b100000)
    return "0b000" + value.toString(2);
  if (value < 0b1000000)
    return "0b00" + value.toString(2);
  if (value < 0b10000000)
    return "0b0" + value.toString(2);
  return "0b" + value.toString(2);
}