import { Component, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type ShapeMode = 'pen' | 'rect' | 'circle' | 'text' | 'line' | 'eraser';

interface PathShape { type: 'path'; path: {x: number, y: number}[]; color: string; width: number; }
interface RectShape { type: 'rect'; x: number; y: number; w: number; h: number; color: string; width: number; }
interface CircleShape { type: 'circle'; x: number; y: number; r: number; color: string; width: number; }
interface TextShape { type: 'text'; x: number; y: number; text: string; color: string; font: string; width?: number; }
interface LineShape { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width: number; }

type Shape = PathShape | RectShape | CircleShape | TextShape | LineShape;

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="relative w-full h-full flex flex-col bg-slate-950 border-l border-slate-800 overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
      
      @if (textInput.visible) {
        <input 
          #textInputField
          type="text"
          class="absolute z-50 bg-slate-800 text-white outline-none border border-blue-500 rounded px-2 py-1 shadow-lg"
          [style.left.px]="textInput.x"
          [style.top.px]="textInput.y - 12"
          [style.font]="currentFont"
          [style.color]="currentColor"
          (keydown.enter)="commitText($any($event).target.value)"
          (blur)="commitText($any($event).target.value)"
        />
      }
      
      <!-- Toolbar -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1.5 rounded-xl shadow-2xl backdrop-blur-md">
        @for (tool of tools; track tool.val) {
          <button 
            (click)="setMode(tool.val)"
            [class.bg-slate-800]="mode() === tool.val"
            [class.text-blue-400]="mode() === tool.val"
            [class.text-slate-300]="mode() !== tool.val"
            [class.hover:bg-slate-800]="mode() !== tool.val"
            class="p-2 rounded-lg transition-colors flex items-center justify-center outline-none focus:ring-1 focus:ring-blue-500"
            [title]="tool.name"
          >
            <mat-icon class="text-[20px] w-[20px] h-[20px]">{{tool.icon}}</mat-icon>
          </button>
        }
        
        <div class="w-px h-6 bg-slate-800 mx-1 self-center"></div>

        <!-- Color Picker -->
        <div class="flex items-center space-x-1 px-1">
           @for (color of colors; track color.val) {
             <button (click)="currentColor = color.val"
                     [title]="color.name"
                     class="w-5 h-5 rounded-full border-2 transition-transform outline-none focus:ring-1 focus:ring-blue-500"
                     [style.backgroundColor]="color.val"
                     [class.scale-125]="currentColor === color.val"
                     [class.border-white]="currentColor === color.val"
                     [class.border-transparent]="currentColor !== color.val"
             ></button>
           }
        </div>

        <div class="w-px h-6 bg-slate-800 mx-1 self-center"></div>

        <!-- Width Picker -->
        <div class="flex items-center space-x-1 px-1 text-slate-300">
           @for (width of widths; track width.val) {
             <button (click)="currentWidth = width.val"
                     [title]="width.name"
                     class="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                     [class.bg-slate-700]="currentWidth === width.val"
             >
                <div class="bg-current rounded-full" [style.width.px]="width.val" [style.height.px]="width.val"></div>
             </button>
           }
        </div>

        <div class="w-px h-6 bg-slate-800 mx-1 self-center"></div>

        <!-- Font Picker -->
        <select (change)="currentFont = $any($event.target).value" class="bg-slate-800 text-slate-300 text-xs rounded p-1 border-none outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 max-w-[80px]">
           @for (font of fonts; track font.val) {
             <option [value]="font.val" [selected]="currentFont === font.val">{{font.name}}</option>
           }
        </select>

        <div class="w-px h-6 bg-slate-800 mx-1 self-center"></div>
        
        <button (click)="clear()" class="p-2 rounded-lg transition-colors flex items-center justify-center outline-none text-rose-400/80 hover:bg-slate-800 hover:text-rose-400" title="Clear Board">
          <mat-icon class="text-[20px] w-[20px] h-[20px]">delete_outline</mat-icon>
        </button>
      </div>

      <!-- Canvas -->
      <canvas #canvas 
        class="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        style="background: transparent;"
        (mousedown)="onPointerDown($event)"
        (mousemove)="onPointerMove($event)"
        (window:mouseup)="onPointerUp()"
        (touchstart)="onPointerDown($event)"
        (touchmove)="onPointerMove($event)"
        (window:touchend)="onPointerUp()">
      </canvas>

    </div>
  `
})
export class WhiteboardComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  
  mode = signal<ShapeMode>('pen');
  isDrawing = false;
  currentColor = '#3b82f6'; // blue-500
  currentWidth = 3;
  
  colors = [
    { name: 'Blue', val: '#3b82f6' },
    { name: 'Emerald', val: '#10b981' },
    { name: 'Rose', val: '#f43f5e' },
    { name: 'Amber', val: '#f59e0b' },
    { name: 'White', val: '#f8fafc' },
    { name: 'Slate', val: '#94a3b8' },
  ];

  widths = [
    { name: 'Thin', val: 2 },
    { name: 'Normal', val: 4 },
    { name: 'Thick', val: 8 },
  ];

  fonts = [
    { name: 'Sans', val: '500 20px "Inter", sans-serif' },
    { name: 'Mono', val: '500 20px "JetBrains Mono", monospace' },
    { name: 'Serif', val: '500 20px "Playfair Display", serif' },
  ];
  
  currentFont = this.fonts[0].val;

  textInput = { visible: false, x: 0, y: 0, text: '' };

  shapes: Shape[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentShape: any = null;

  tools: {name: string, val: ShapeMode, icon: string}[] = [
    { name: 'Pen', val: 'pen', icon: 'edit' },
    { name: 'Rectangle', val: 'rect', icon: 'crop_square' },
    { name: 'Circle', val: 'circle', icon: 'radio_button_unchecked' },
    { name: 'Line', val: 'line', icon: 'horizontal_rule' },
    { name: 'Text', val: 'text', icon: 'title' },
    { name: 'Eraser', val: 'eraser', icon: 'cleaning_services' },
  ];

  ngAfterViewInit() {
    this.initCanvas();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      this.draw();
    }
  }

  draw() {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    
    // Clear
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (const shape of this.shapes) {
      this.renderShape(shape);
    }
    if (this.currentShape) {
      this.renderShape(this.currentShape);
    }
  }

  renderShape(shape: Shape) {
    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.width || 3;
    this.ctx.fillStyle = shape.color;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    if (shape.type === 'path') {
      if (shape.path.length > 0) {
        this.ctx.moveTo(shape.path[0].x, shape.path[0].y);
        for (let i = 1; i < shape.path.length; i++) {
          this.ctx.lineTo(shape.path[i].x, shape.path[i].y);
        }
        this.ctx.stroke();
      }
    } else if (shape.type === 'rect') {
      this.ctx.rect(shape.x, shape.y, shape.w, shape.h);
      this.ctx.stroke();
    } else if (shape.type === 'circle') {
      this.ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (shape.type === 'line') {
      this.ctx.moveTo(shape.x1, shape.y1);
      this.ctx.lineTo(shape.x2, shape.y2);
      this.ctx.stroke();
    } else if (shape.type === 'text') {
      this.ctx.font = shape.font || '20px "Inter", sans-serif';
      this.ctx.fillText(shape.text, shape.x, shape.y);
    }
  }

  setMode(m: ShapeMode) {
    this.mode.set(m);
  }

  clear() {
    this.shapes = [];
    this.draw();
  }

  commitText(val: string) {
    if (!this.textInput.visible) return;
    if (val && val.trim()) {
      this.shapes.push({ type: 'text', x: this.textInput.x, y: this.textInput.y, text: val.trim(), color: this.currentColor, font: this.currentFont });
      this.draw();
    }
    this.textInput.visible = false;
  }

  private getCoordinates(e: MouseEvent | TouchEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    let clientX, clientY;

    if (e instanceof TouchEvent) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  onPointerDown(e: MouseEvent | TouchEvent) {
    // Prevent default scrolling via touch
    if (e instanceof TouchEvent && e.cancelable) e.preventDefault();
    
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(e);

    const m = this.mode();
    if (m === 'pen') {
      this.currentShape = { type: 'path', path: [{x, y}], color: this.currentColor, width: this.currentWidth };
    } else if (m === 'eraser') {
      this.currentShape = { type: 'path', path: [{x, y}], color: '#020617', width: 20 };
    } else if (m === 'rect') {
      this.currentShape = { type: 'rect', x, y, w: 0, h: 0, color: this.currentColor, width: this.currentWidth };
    } else if (m === 'circle') {
      this.currentShape = { type: 'circle', x, y, r: 0, color: this.currentColor, width: this.currentWidth };
    } else if (m === 'line') {
      this.currentShape = { type: 'line', x1: x, y1: y, x2: x, y2: y, color: this.currentColor, width: this.currentWidth };
    } else if (m === 'text') {
      this.textInput = { visible: true, x, y, text: '' };
      setTimeout(() => {
        const input = document.querySelector('input.z-50') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
      this.isDrawing = false;
    }
    this.draw();
  }

  onPointerMove(e: MouseEvent | TouchEvent) {
    if (!this.isDrawing || !this.currentShape) return;
    
    if (e instanceof TouchEvent && e.cancelable) e.preventDefault();

    const { x, y } = this.getCoordinates(e);
    const m = this.mode();

    if (m === 'pen' || m === 'eraser') {
      this.currentShape.path.push({x, y});
    } else if (m === 'rect') {
      this.currentShape.w = x - this.currentShape.x;
      this.currentShape.h = y - this.currentShape.y;
    } else if (m === 'circle') {
      const dx = x - this.currentShape.x;
      const dy = y - this.currentShape.y;
      this.currentShape.r = Math.sqrt(dx*dx + dy*dy);
    } else if (m === 'line') {
      this.currentShape.x2 = x;
      this.currentShape.y2 = y;
    }
    
    this.draw();
  }

  onPointerUp() {
    if (this.isDrawing && this.currentShape) {
      this.shapes.push(this.currentShape);
      this.currentShape = null;
    }
    this.isDrawing = false;
    this.draw();
  }
}
