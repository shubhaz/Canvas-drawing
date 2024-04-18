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
  private drawingMode: string = 'rectangle'; // Current drawing mode ('rectangle', 'text', 'freedraw')
  private imgLoaded: boolean = false; // Flag to track if image is loaded
  private img: HTMLImageElement = new Image(); // Create image element
  private isErasing: boolean = false; // New property for eraser mode
  private previousDrawingMode: string = '';

  ngAfterViewInit() {
    const canvas = this.canvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 400;
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  toggleEraser() {
    if (!this.isErasing) {
      // Store the previous drawing mode before toggling to eraser mode
      this.previousDrawingMode = this.drawingMode;
      this.drawingMode = 'eraser'; // Set drawing mode to 'eraser'
    } else {
      this.drawingMode = this.previousDrawingMode; // Restore previous drawing mode
    }
    this.isErasing = !this.isErasing; // Toggle eraser mode
  
    // Reset currentElement to null when eraser is toggled off
    if (!this.isErasing) {
      this.currentElement = null;
    }
  }
  
  
  

  loadImage(event: any) {
    const fileInput = event.target as HTMLInputElement;
    const files = fileInput.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        if (event.target && typeof event.target.result === 'string') {
          this.img.src = event.target.result as string;
          this.img.onload = () => {
            this.ctx.drawImage(this.img, 0, 0);
            this.imgLoaded = true;
            this.drawElements(); // Draw elements on top of the image
          };
        }
      };
      reader.readAsDataURL(file);
    }
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
  
    if (!this.isErasing) {
      // Handle drawing when not erasing
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
    } else {
      // Implement eraser logic
      this.eraseElement(offsetX, offsetY);
    }
  }
  
  eraseElement(offsetX: number, offsetY: number) {
    const radius = 10; // Adjust the eraser size as needed
  
    this.elements = this.elements.filter(element => {
      switch (element.type) {
        case 'rectangle':
          return !(
            offsetX + radius >= element.x &&
            offsetX - radius <= element.x + element.width &&
            offsetY + radius >= element.y &&
            offsetY - radius <= element.y + element.height
          );
        case 'text':
          return !(
            offsetX >= element.x &&
            offsetX <= element.x + this.ctx.measureText(element.text).width &&
            offsetY >= element.y - 20 &&
            offsetY <= element.y
          );
        case 'freedraw':
          const points = element.points || [];
          // Filter out all points within the radius of the eraser
          element.points = points.filter(([x, y]) => !(
            offsetX + radius >= x &&
            offsetX - radius <= x &&
            offsetY + radius >= y &&
            offsetY - radius <= y
          ));
          return element.points.length > 0; // Keep the freedraw element if it still has points
        default:
          return true;
      }
    });
  
    // Redraw the canvas after erasing elements
    this.redrawCanvas();
  }
  
  
  
  // Method to check if a point is inside a path
  isPointInPath(path: number[][], point: number[]): boolean {
    const [x, y] = point;
    return path.some(p => {
      const [px, py] = p;
      const dx = x - px;
      const dy = y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 10; // Adjust the distance threshold as needed
    });
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
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    
    // Redraw the image if it's loaded
    if (this.imgLoaded) {
      this.ctx.drawImage(this.img, 0, 0);
    }
    
    // Draw elements on top of the image
    this.drawElements();
  }
  
  
  
  
  saveDrawingAsJSON() {
   
 
   const drawingData = {
     imageData: this.canvas.nativeElement.toDataURL(),
     elements: this.elements
   };
 
   // Here you can store drawingData in your desired format, e.g., save to a database
   console.log(drawingData); // Log drawingData to verify the content
 

  }
  dataURLtoBlob(dataURL: string): Blob {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  }

  setDrawingMode(mode: string) {
    if (this.isErasing) {
      this.isErasing = false; // Turn off eraser mode when switching to another mode
    }
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

  loadImageFromDataURL(dataURL: string) {
    this.img.src = dataURL;
  }
  
  loadImageFromBlob(blob: Blob) {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      if (event.target && typeof event.target.result === 'string') {
        this.img.src = event.target.result;
      }
    };
    reader.readAsDataURL(blob);
  }
  
  
  
  loadDrawingFromJSON(jsonData: string) {
    try {
      const drawingData = JSON.parse(jsonData);
      if (drawingData && drawingData.elements) {
        this.elements = drawingData.elements;
        
        // Set the src attribute of the img element and draw it on the canvas
        this.img.src = drawingData.imageData;
        this.img.onload = () => {
          this.ctx.drawImage(this.img, 0, 0);
          this.imgLoaded = true;
          this.drawElements(); // Draw elements on top of the image
        };
      }
    } catch (error) {
      console.error('Error loading drawing from JSON:', error);
    }
  }
  
  
}