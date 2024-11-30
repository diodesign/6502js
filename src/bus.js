class BusLine {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;
  }

  draw() {
    line(this.x1, this.y1, this.x2, this.y2);
  }
}

class Bus {
  constructor() {
    this.lines = [];
    this.value = 0;
    this.signals = {};
  }
  
  add_line(toadd)
  {
    this.lines.push(toadd);
  }
  
  draw() {
    strokeWeight(busThickness);
    stroke(50, 150, 50);
    for (let ln of this.lines) ln.draw();
  }
}