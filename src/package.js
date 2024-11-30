const busThickness = 5;
const chipWidth = 40;
const pinLength = 5;
const pinWidth = 2;
const pinGap = 5;

class ChipPackage {
  /* ccords = top left corner of the chip package
     pins = total number of pins (will round down to multiple of 2)
     label = text to show on packaging */
  constructor(coords, pins, label) {
    this.pins = floor(pins / 2) * 2;
    this.coords = coords;
    this.length = ((this.pins / 2) * (pinLength + pinGap));
    this.width = chipWidth;
    this.label = label;
  }

  draw() {    
    /* draw chip package */
    fill(50);
    stroke(255);
    strokeWeight(1);
    rect(this.coords.x, this.coords.y, this.width, this.length);

    /* draw pins */
    let x = this.coords.x - pinWidth;
    for (let pin = 0; pin < this.pins / 2; pin++) {
      let y = (this.coords.y + 
               (pinGap / 2) + pin * (pinLength + pinGap));
      fill(255);
      rect(x, y, pinWidth, pinLength);
      rect(x + this.width + pinWidth, y, pinWidth, pinLength);
    }

    /* draw pin 1 circle */
    fill(255);
    circle(this.coords.x + pinLength,
           this.coords.y + pinLength,
           pinWidth);

    /* draw chip labeling */
    text(this.label, this.coords.x,
         this.coords.y - pinLength / 2);
  }
}