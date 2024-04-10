import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

interface ElementData {
  type: string;
  x: number;
  y: number;
  width?: number; // Make width optional
  height?: number; // Make height optional
  angle?: number; // Make angle optional
  strokeColor: string;
  backgroundColor?: string; // Make backgroundColor optional
  strokeWidth: number;
  points?: number[][];
  text?: string;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild('myCanvas') canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private currentElement: ElementData | null = null;
  private elements: ElementData[] = [];
  private strokeColor: string = '#000000'; // Default stroke color
  private drawingMode: string = ''; // Current drawing mode ('rectangle', 'text', 'freedraw')
  private img: HTMLImageElement = new Image(); // Create image element

  ngAfterViewInit() {
    const canvas = this.canvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 400;
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load the image onto the canvas
      this.img.onload = () => {
        this.ctx.drawImage(this.img, 0, 0);
        this.drawElements(); // Draw elements on top of the image
      };
      this.img.src = 'assets/Scan.jpg'; // Replace with the path to your image
  }

  onMouseDown(event: MouseEvent) {
    this.isDrawing = true;
    const offsetX = event.offsetX !== undefined ? event.offsetX : event.layerX;
    const offsetY = event.offsetY !== undefined ? event.offsetY : event.layerY;
  
    switch (this.drawingMode) {
      case 'rectangle':
        this.startX = offsetX;
        this.startY = offsetY;
        // Initialize the rectangle element
        this.currentElement = {
          type: 'rectangle',
          x: offsetX,
          y: offsetY,
          width: 0,
          height: 0,
          strokeColor: this.strokeColor,
          strokeWidth: 2
        };
        this.elements.push(this.currentElement);
        break;
      case 'text':
        const text = prompt('Enter text:');
        if (text) {
          this.currentElement = {
            type: 'text',
            x: offsetX,
            y: offsetY,
            strokeColor: this.strokeColor,
            strokeWidth: 2,
            text: text
          };
          this.elements.push(this.currentElement);
          this.drawText(this.currentElement);
        }
        break;
      case 'freedraw':
        this.currentElement = {
          type: 'freedraw',
          x: offsetX,
          y: offsetY,
          strokeColor: this.strokeColor,
          strokeWidth: 2,
          points: [[offsetX, offsetY]] // Start a new path
        };
        this.elements.push(this.currentElement);
        break;
    }
  }
  
  onMouseMove(event: MouseEvent) {
    if (!this.isDrawing || !this.currentElement) return;
    const offsetX = event.offsetX !== undefined ? event.offsetX : event.layerX;
    const offsetY = event.offsetY !== undefined ? event.offsetY : event.layerY;
  
    switch (this.drawingMode) {
      case 'rectangle':
        const width = offsetX - this.startX;
        const height = offsetY - this.startY;
        // Update the rectangle width and height
        this.currentElement.width = width;
        this.currentElement.height = height;
        this.redrawCanvas();
        this.drawRectangle(this.currentElement);
        break;
      case 'text':
        // No preview text for mouse move
        break;
      case 'freedraw':
        this.currentElement.points.push([offsetX, offsetY]);
        this.redrawCanvas();
        this.drawFreeDraw(this.currentElement);
        break;
    }
  }
  
  onMouseUp(event: MouseEvent) {
    if (!this.isDrawing || !this.currentElement) return;
  
    switch (this.drawingMode) {
      case 'rectangle':
        // Rectangle drawing is completed on mouse up
        break;
      case 'text':
        // Text already added on mouse down, nothing to do here
        break;
      case 'freedraw':
        // Freedraw path already drawn on mouse move, nothing to do here
        break;
    }
    this.isDrawing = false;
  }
  

  drawRectangle(rect: ElementData) {
    this.ctx.beginPath();
    this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.strokeStyle = rect.strokeColor;
    this.ctx.lineWidth = rect.strokeWidth;
    this.ctx.stroke();
  }

  drawText(textElement: ElementData) {
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = textElement.strokeColor;
    this.ctx.fillText(textElement.text || '', textElement.x, textElement.y);
  }

  drawFreeDraw(element: ElementData) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = element.strokeColor;
    this.ctx.lineWidth = element.strokeWidth;
    if (element.points) {
        element.points.forEach((point, index) => {
            const [x, y] = point;
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
    }
    this.ctx.stroke();
}


  drawPreviewRect(x: number, y: number, width: number, height: number) {
    this.redrawCanvas();
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.drawImage(this.img, 0, 0); // Redraw the image
    this.drawElements();
  }
  
  saveDrawingAsJSON() {
    const drawingData = {
      imageData: this.canvas.nativeElement.toDataURL(), // Convert canvas to data URL
      elements: this.elements
    };
    const jsonData = JSON.stringify(drawingData);
    console.log(jsonData);
    // Here you can store jsonData in your desired format

  }

  setDrawingMode(mode: string) {
    this.drawingMode = mode;
    this.isDrawing = false;
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.elements = [];
    this.isDrawing = false; // Reset drawing state
    this.currentElement = null; // Reset current element being drawn
    this.redrawCanvas(); // Call redrawCanvas() to prevent accidental redraws
  }
  
  drawElements() {
    this.elements.forEach(element => {
      switch (element.type) {
        case 'rectangle':
          this.drawRectangle(element);
          break;
        case 'text':
          this.drawText(element);
          break;
        case 'freedraw':
          this.drawFreeDraw(element);
          break;
      }
    });
  }
  loadDrawingFromJSON(jsonData: string) {
    try {
      const drawingData = JSON.parse(jsonData);
      if (drawingData && drawingData.elements) {
        this.elements = drawingData.elements;
        this.redrawCanvas();
      }
    } catch (error) {
      console.error('Error loading drawing from JSON:', error);
    }
  }
  
}
