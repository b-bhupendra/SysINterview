import { Component, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

type ShapeMode = 'pen' | 'rect' | 'circle' | 'text' | 'line' | 'eraser';

interface PathShape { type: 'path'; path: {x: number, y: number}[]; color: string; width: number; }
interface RectShape { type: 'rect'; x: number; y: number; w: number; h: number; color: string; width: number; }
interface CircleShape { type: 'circle'; x: number; y: number; r: number; color: string; width: number; }
interface TextShape { type: 'text'; x: number; y: number; text: string; color: string; font: string; width?: number; }
interface LineShape { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width: number; }

type Shape = PathShape | RectShape | CircleShape | TextShape | LineShape;

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  shapes: Shape[];
  groupId?: string;
}

interface LayerGroup {
  id: string;
  name: string;
  expanded: boolean;
  layerIds: string[];
}

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="relative w-full h-full flex flex-col bg-slate-950 border-l border-slate-800 overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
      
      @if (textInput.visible) {
        <input 
          #textInputField
          type="text"
          class="absolute z-50 bg-transparent outline-none border border-blue-500/50 focus:border-blue-500 border-dashed rounded px-1 py-0.5 shadow-xl"
          [style.left.px]="textInput.x"
          [style.top.px]="textInput.y - 12"
          [style.font]="currentFont"
          [style.color]="currentColor"
          placeholder="Type here..."
          (keydown.enter)="commitText($any($event).target.value)"
          (blur)="commitText($any($event).target.value)"
        />
      }

      <!-- Undo/Redo Floating -->
      <div class="absolute top-4 left-4 z-20 flex gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
        <button (click)="undo()" [disabled]="historyIndex <= 0" 
                class="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition">
          <mat-icon class="text-[18px] w-[18px] h-[18px]">undo</mat-icon>
        </button>
        <button (click)="redo()" [disabled]="historyIndex >= history.length - 1" 
                class="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition">
          <mat-icon class="text-[18px] w-[18px] h-[18px]">redo</mat-icon>
        </button>
      </div>

      <!-- Layers Panel -->
      <div class="absolute top-4 right-4 z-20 w-64 bg-slate-900/90 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col transition-all h-fit max-h-[80vh]">
        <div class="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layers</span>
          <div class="flex gap-1">
            <button (click)="addGroup()" class="text-amber-500/80 hover:text-amber-400 transition" title="New Group">
              <mat-icon class="text-[18px] w-[18px] h-[18px]">create_new_folder</mat-icon>
            </button>
            <button (click)="addLayer()" class="text-blue-400 hover:text-blue-300 transition" title="New Layer">
              <mat-icon class="text-[18px] w-[18px] h-[18px]">add_circle</mat-icon>
            </button>
          </div>
        </div>
        
        <div class="overflow-y-auto pt-2 pb-4">
          <!-- Groups -->
          @for (group of groups; track group.id) {
            <div class="mb-1">
              <div class="flex items-center px-3 py-1.5 gap-2 group/group bg-slate-800/10 hover:bg-slate-800/30 transition-colors">
                <button (click)="group.expanded = !group.expanded" class="text-slate-500 hover:text-slate-300">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">{{ group.expanded ? 'expand_more' : 'chevron_right' }}</mat-icon>
                </button>
                <mat-icon class="text-[14px] w-[14px] h-[14px] text-amber-500/70">folder</mat-icon>
                <div class="flex-1 min-w-0">
                  <span class="text-[10px] font-bold text-slate-500 uppercase truncate block">{{ group.name }}</span>
                </div>
                <div class="flex items-center opacity-0 group-hover/group:opacity-100 transition-opacity">
                  <button (click)="$event.stopPropagation(); removeGroup(group.id)" class="text-rose-500/50 hover:text-rose-500 ml-1">
                    <mat-icon class="text-[14px] w-[14px] h-[14px]">delete</mat-icon>
                  </button>
                </div>
              </div>
              
              @if (group.expanded) {
                <div class="pl-4 border-l-2 border-slate-800/50 ml-5 mr-2 space-y-0.5 mt-1">
                  @for (layerId of group.layerIds; track layerId) {
                    @let nestedLayer = getLayerById(layerId);
                    @if (nestedLayer) {
                      <ng-container [ngTemplateOutlet]="layerRow" [ngTemplateOutletContext]="{ layer: nestedLayer }"></ng-container>
                    }
                  }
                  @if (group.layerIds.length === 0) {
                    <div class="text-[9px] text-slate-600 italic py-1">Empty group</div>
                  }
                </div>
              }
            </div>
          }

          <!-- Ungrouped Layers Header -->
          @if (hasUngroupedLayers()) {
            <div class="px-3 py-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-2 mb-1">Ungrouped</div>
          }

          @for (layer of layers; track layer.id) {
            @if (!layer.groupId) {
              <ng-container [ngTemplateOutlet]="layerRow" [ngTemplateOutletContext]="{ layer: layer }"></ng-container>
            }
          }
        </div>
      </div>

      <ng-template #layerRow let-layer="layer">
        <div 
          class="flex items-center px-3 py-1.5 gap-2 group/layer transition-all border border-transparent mx-2 rounded-lg cursor-pointer hover:bg-slate-800/40"
          [class.bg-blue-600/20]="activeLayerId === layer.id"
          [class.border-blue-500/30]="activeLayerId === layer.id"
          (click)="activeLayerId = layer.id"
        >
          <button (click)="$event.stopPropagation(); layer.visible = !layer.visible; saveHistory(); draw()" 
                  class="text-slate-600 hover:text-blue-400 transition"
                  [class.text-blue-500]="layer.visible">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">{{ layer.visible ? 'visibility' : 'visibility_off' }}</mat-icon>
          </button>
          <span class="flex-1 text-[11px] font-medium truncate" 
                [class.text-slate-200]="activeLayerId === layer.id"
                [class.text-slate-500]="activeLayerId !== layer.id">
            {{ layer.name }}
          </span>
          <div class="flex items-center gap-1 opacity-0 group-hover/layer:opacity-100 transition-opacity">
            @if (!layer.groupId) {
              <button (click)="$event.stopPropagation(); moveLayer(layer.id, -1)" 
                      class="text-slate-500 hover:text-white" [disabled]="isFirst(layer.id)">
                <mat-icon class="text-[14px] w-[14px] h-[14px]">expand_less</mat-icon>
              </button>
            }
            <button (click)="$event.stopPropagation(); openMoveToGroup(layer.id)" class="text-slate-500 hover:text-amber-500" title="Move to group">
               <mat-icon class="text-[14px] w-[14px] h-[14px]">drive_file_move</mat-icon>
            </button>
            @if (layers.length > 1) {
              <button (click)="$event.stopPropagation(); removeLayer(layer.id)" 
                      class="text-rose-500/30 hover:text-rose-500">
                <mat-icon class="text-[14px] w-[14px] h-[14px]">remove_circle</mat-icon>
              </button>
            }
          </div>
        </div>
      </ng-template>
      
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

  layers: Layer[] = [
    { id: 'l1', name: 'Base Architecture', visible: true, locked: false, shapes: [] }
  ];
  groups: LayerGroup[] = [];
  activeLayerId = 'l1';

  // History system
  history: { layers: Layer[], groups: LayerGroup[] }[] = [];
  historyIndex = -1;

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

  constructor() {
    this.saveHistory();
  }

  get activeLayer() {
    return this.layers.find(l => l.id === this.activeLayerId)!;
  }

  addLayer() {
    const id = 'l' + Date.now();
    this.layers.unshift({
      id,
      name: `Layer ${this.layers.length + 1}`,
      visible: true,
      locked: false,
      shapes: []
    });
    this.activeLayerId = id;
    this.saveHistory();
  }

  addGroup() {
    const id = 'g' + Date.now();
    this.groups.unshift({
      id,
      name: `Group ${this.groups.length + 1}`,
      expanded: true,
      layerIds: []
    });
    this.saveHistory();
  }

  removeGroup(id: string) {
    const group = this.groups.find(g => g.id === id);
    if (!group) return;
    
    // Dissolve group: layers stay but lose groupId
    this.layers.map(l => {
      if (l.groupId === id) l.groupId = undefined;
    });
    this.groups = this.groups.filter(g => g.id !== id);
    this.saveHistory();
  }

  getLayerById(id: string) {
    return this.layers.find(l => l.id === id);
  }

  hasUngroupedLayers() {
    return this.layers.some(l => !l.groupId);
  }

  openMoveToGroup(layerId: string) {
    if (this.groups.length === 0) {
      alert('Create a group first!');
      return;
    }
    const gId = prompt('Move to group ID (Enter group index 1, 2... or group name):');
    if (!gId) return;

    const group = this.groups.find(g => g.name === gId || g.id === gId || this.groups.indexOf(g) + 1 === parseInt(gId));
    if (group) {
      const layer = this.layers.find(l => l.id === layerId);
      if (layer) {
        // Remove from old group if any
        if (layer.groupId) {
          const oldG = this.groups.find(g => g.id === layer.groupId);
          if (oldG) oldG.layerIds = oldG.layerIds.filter(id => id !== layerId);
        }
        layer.groupId = group.id;
        group.layerIds.push(layerId);
        this.saveHistory();
      }
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.applyHistory();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.applyHistory();
    }
  }

  saveHistory() {
    // Clone state
    const state = {
      layers: JSON.parse(JSON.stringify(this.layers)),
      groups: JSON.parse(JSON.stringify(this.groups))
    };
    
    // Truncate future if any
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    this.history.push(state);
    if (this.history.length > 50) this.history.shift(); // Limit history
    this.historyIndex = this.history.length - 1;
  }

  private applyHistory() {
    const state = this.history[this.historyIndex];
    this.layers = JSON.parse(JSON.stringify(state.layers));
    this.groups = JSON.parse(JSON.stringify(state.groups));
    
    // Ensure activeLayerId is still valid
    if (!this.layers.find(l => l.id === this.activeLayerId)) {
      this.activeLayerId = this.layers[0].id;
    }
    this.draw();
  }

  removeLayer(id: string) {
    if (this.layers.length <= 1) return;
    const layer = this.layers.find(l => l.id === id);
    if (layer?.groupId) {
      const g = this.groups.find(group => group.id === layer.groupId);
      if (g) g.layerIds = g.layerIds.filter(lid => lid !== id);
    }
    this.layers = this.layers.filter(l => l.id !== id);
    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers[0].id;
    }
    this.saveHistory();
    this.draw();
  }

  moveLayer(id: string, delta: number) {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return;
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= this.layers.length) return;
    
    const element = this.layers[index];
    this.layers.splice(index, 1);
    this.layers.splice(newIndex, 0, element);
    this.draw();
  }

  isFirst(id: string) {
    return this.layers[0].id === id;
  }

  isLast(id: string) {
    return this.layers[this.layers.length - 1].id === id;
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Key bindings for undo/redo
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
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
    
    // Draw layers from bottom to top (reverse array for painting order)
    [...this.layers].reverse().forEach(layer => {
      if (layer.visible) {
        for (const shape of layer.shapes) {
          this.renderShape(shape);
        }
      }
    });

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

  commitText(val: string) {
    if (!this.textInput.visible) return;
    if (val && val.trim()) {
      this.activeLayer.shapes.push({ type: 'text', x: this.textInput.x, y: this.textInput.y, text: val.trim(), color: this.currentColor, font: this.currentFont });
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
      this.activeLayer.shapes.push(this.currentShape);
      this.currentShape = null;
      this.saveHistory();
    }
    this.isDrawing = false;
    this.draw();
  }

  clear() {
    this.activeLayer.shapes = [];
    this.saveHistory();
    this.draw();
  }
}
