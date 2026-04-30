import { Component, ElementRef, ViewChild, AfterViewInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

type ShapeMode = 'select' | 'pen' | 'rect' | 'circle' | 'text' | 'line' | 'eraser';

interface BaseShape {
  id: string;
  color: string;
  width: number;
  isSelected?: boolean;
}

interface PathShape extends BaseShape { type: 'path'; path: {x: number, y: number}[]; }
interface RectShape extends BaseShape { type: 'rect'; x: number; y: number; w: number; h: number; }
interface CircleShape extends BaseShape { type: 'circle'; x: number; y: number; r: number; }
interface TextShape extends BaseShape { type: 'text'; x: number; y: number; text: string; font: string; }
interface LineShape extends BaseShape { type: 'line'; x1: number; y1: number; x2: number; y2: number; }

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
  imports: [CommonModule, MatIconModule, DragDropModule],
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

      <!-- Undo/Redo/Delete Floating -->
      <div class="absolute top-4 left-4 z-20 flex gap-2">
        <div class="flex gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg backdrop-blur-md">
          <button (click)="undo()" [disabled]="historyIndex <= 0" 
                  class="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition">
            <mat-icon class="text-[18px] w-[18px] h-[18px]">undo</mat-icon>
          </button>
          <button (click)="redo()" [disabled]="historyIndex >= history.length - 1" 
                  class="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition">
            <mat-icon class="text-[18px] w-[18px] h-[18px]">redo</mat-icon>
          </button>
        </div>
        
        @if (selectedShape) {
          <div class="flex gap-1 bg-rose-900/40 border border-rose-500/30 p-1 rounded-lg backdrop-blur-md">
            <button (click)="deleteSelected()" 
                    class="p-2 text-rose-400 hover:text-rose-200 transition">
              <mat-icon class="text-[18px] w-[18px] h-[18px]">delete</mat-icon>
            </button>
          </div>
        }
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
        
        <div class="overflow-y-auto pt-2 pb-4" cdkDropList (cdkDropListDropped)="onLayerDrop($event)">
          <!-- Groups -->
          @for (group of groups; track group.id) {
            <div class="mb-1" cdkDrag [cdkDragDisabled]="false">
              <div class="flex items-center px-3 py-1.5 gap-2 group/group bg-slate-800/10 hover:bg-slate-800/30 transition-colors cursor-move">
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
                <div class="pl-4 border-l-2 border-slate-800/50 ml-5 mr-2 space-y-0.5 mt-1" cdkDropList [cdkDropListData]="group.layerIds" (cdkDropListDropped)="onNestedLayerDrop($event, group)">
                  @for (layerId of group.layerIds; track layerId) {
                    @let nestedLayer = getLayerById(layerId);
                    @if (nestedLayer) {
                      <div cdkDrag>
                        <ng-container [ngTemplateOutlet]="layerRow" [ngTemplateOutletContext]="{ layer: nestedLayer }"></ng-container>
                      </div>
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
              <div cdkDrag>
                <ng-container [ngTemplateOutlet]="layerRow" [ngTemplateOutletContext]="{ layer: layer }"></ng-container>
              </div>
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
        class="absolute inset-0 w-full h-full touch-none"
        [class.cursor-crosshair]="mode() !== 'select'"
        [class.cursor-default]="mode() === 'select'"
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
  currentColor = '#3b82f6';
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
  selectedShape: { shape: Shape, layerId: string } | null = null;
  dragStartPos = { x: 0, y: 0 };

  // History system
  history: { layers: Layer[], groups: LayerGroup[] }[] = [];
  historyIndex = -1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentShape: any = null;

  tools: {name: string, val: ShapeMode, icon: string}[] = [
    { name: 'Select', val: 'select', icon: 'near_me' },
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

  hasUngroupedLayers() {
    return this.layers.some(l => !l.groupId);
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
    this.layers.forEach(l => {
      if (l.groupId === id) l.groupId = undefined;
    });
    this.groups = this.groups.filter(g => g.id !== id);
    this.saveHistory();
  }

  getLayerById(id: string) {
    return this.layers.find(l => l.id === id);
  }

  onLayerDrop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.layers, event.previousIndex, event.currentIndex);
    this.saveHistory();
    this.draw();
  }

  onNestedLayerDrop(event: CdkDragDrop<string[]>, group: LayerGroup) {
    moveItemInArray(group.layerIds, event.previousIndex, event.currentIndex);
    this.saveHistory();
    this.draw();
  }

  openMoveToGroup(layerId: string) {
    const names = this.groups.map((g, i) => `${i+1}: ${g.name}`).join('\n');
    const input = prompt(`Move to group:\n${names}\n(Enter number)`);
    if (!input) return;
    const idx = parseInt(input) - 1;
    if (this.groups[idx]) {
      const targetGroup = this.groups[idx];
      const layer = this.layers.find(l => l.id === layerId);
      if (layer) {
        if (layer.groupId) {
          const oldG = this.groups.find(g => g.id === layer.groupId);
          if (oldG) oldG.layerIds = oldG.layerIds.filter(id => id !== layerId);
        }
        layer.groupId = targetGroup.id;
        targetGroup.layerIds.push(layerId);
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
    if (!this.layers.find(l => l.id === this.activeLayerId)) {
      this.activeLayerId = this.layers[0]?.id || '';
    }
    this.selectedShape = null;
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
    if (this.activeLayerId === id) this.activeLayerId = this.layers[0].id;
    this.saveHistory();
    this.draw();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); this.undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); this.redo(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { 
      if (this.selectedShape && !this.textInput.visible) {
        this.deleteSelected();
      }
    }
    if (e.key === 'Escape') { this.selectedShape = null; this.draw(); }
    
    // Nudge selected shape
    if (this.selectedShape && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 2;
      this.nudgeShape(e.key, step);
    }
  }

  nudgeShape(key: string, step: number) {
    if (!this.selectedShape) return;
    const s = this.selectedShape.shape;
    if (s.type === 'rect' || s.type === 'circle' || s.type === 'text') {
      if (key === 'ArrowUp') s.y -= step;
      if (key === 'ArrowDown') s.y += step;
      if (key === 'ArrowLeft') s.x -= step;
      if (key === 'ArrowRight') s.x += step;
    } else if (s.type === 'line') {
      if (key === 'ArrowUp') { s.y1 -= step; s.y2 -= step; }
      if (key === 'ArrowDown') { s.y1 += step; s.y2 += step; }
      if (key === 'ArrowLeft') { s.x1 -= step; s.x2 -= step; }
      if (key === 'ArrowRight') { s.x1 += step; s.x2 += step; }
    } else if (s.type === 'path') {
      s.path.forEach(p => {
        if (key === 'ArrowUp') p.y -= step;
        if (key === 'ArrowDown') p.y += step;
        if (key === 'ArrowLeft') p.x -= step;
        if (key === 'ArrowRight') p.x += step;
      });
    }
    this.draw();
  }

  deleteSelected() {
    if (!this.selectedShape) return;
    const layer = this.layers.find(l => l.id === this.selectedShape!.layerId);
    if (layer) {
      layer.shapes = layer.shapes.filter(s => s.id !== this.selectedShape!.shape.id);
      this.selectedShape = null;
      this.saveHistory();
      this.draw();
    }
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
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = '#020617';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid dots
    this.ctx.fillStyle = '#1e293b';
    for (let x = 0; x < canvas.width; x += 24) {
      for (let y = 0; y < canvas.height; y += 24) {
        this.ctx.fillRect(x, y, 1, 1);
      }
    }

    [...this.layers].reverse().forEach(layer => {
      if (layer.visible) {
        layer.shapes.forEach(shape => this.renderShape(shape));
      }
    });

    if (this.currentShape) this.renderShape(this.currentShape);
  }

  renderShape(shape: Shape) {
    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.width;
    this.ctx.fillStyle = shape.color;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (shape === this.selectedShape?.shape) {
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeStyle = '#3b82f6';
    } else {
      this.ctx.setLineDash([]);
    }

    this.ctx.beginPath();
    if (shape.type === 'path') {
      if (shape.path.length > 0) {
        this.ctx.moveTo(shape.path[0].x, shape.path[0].y);
        shape.path.forEach(p => this.ctx.lineTo(p.x, p.y));
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
      this.ctx.font = shape.font;
      this.ctx.fillText(shape.text, shape.x, shape.y);
    }
    this.ctx.setLineDash([]);
  }

  setMode(m: ShapeMode) {
    this.mode.set(m);
    this.selectedShape = null;
    this.draw();
  }

  commitText(val: string) {
    if (!this.textInput.visible) return;
    if (val && val.trim()) {
      this.activeLayer.shapes.push({ 
        id: 's' + Date.now(),
        type: 'text', 
        x: this.textInput.x, 
        y: this.textInput.y, 
        text: val.trim(), 
        color: this.currentColor, 
        font: this.currentFont,
        width: 2
      });
      this.saveHistory();
      this.draw();
    }
    this.textInput.visible = false;
  }

  private getCoordinates(e: MouseEvent | TouchEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const clientX = e instanceof TouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  onPointerDown(e: MouseEvent | TouchEvent) {
    if (e instanceof TouchEvent && e.cancelable) e.preventDefault();
    const { x, y } = this.getCoordinates(e);
    this.dragStartPos = { x, y };

    if (this.mode() === 'select') {
      this.isDrawing = true;
      this.handleSelection(x, y);
      return;
    }

    this.isDrawing = true;
    const m = this.mode();
    const id = 's' + Date.now();
    if (m === 'pen') this.currentShape = { id, type: 'path', path: [{x, y}], color: this.currentColor, width: this.currentWidth };
    else if (m === 'eraser') this.currentShape = { id, type: 'path', path: [{x, y}], color: '#020617', width: 20 };
    else if (m === 'rect') this.currentShape = { id, type: 'rect', x, y, w: 0, h: 0, color: this.currentColor, width: this.currentWidth };
    else if (m === 'circle') this.currentShape = { id, type: 'circle', x, y, r: 0, color: this.currentColor, width: this.currentWidth };
    else if (m === 'line') this.currentShape = { id, type: 'line', x1: x, y1: y, x2: x, y2: y, color: this.currentColor, width: this.currentWidth };
    else if (m === 'text') {
      this.textInput = { visible: true, x, y, text: '' };
      setTimeout(() => (document.querySelector('input.z-50') as HTMLInputElement)?.focus(), 0);
      this.isDrawing = false;
    }
    this.draw();
  }

  handleSelection(x: number, y: number) {
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      for (const shape of [...layer.shapes].reverse()) {
        if (this.isHit(shape, x, y)) {
          this.selectedShape = { shape, layerId: layer.id };
          this.activeLayerId = layer.id;
          this.draw();
          return;
        }
      }
    }
    this.selectedShape = null;
    this.draw();
  }

  isHit(s: Shape, x: number, y: number): boolean {
    if (s.type === 'rect') return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
    if (s.type === 'circle') return Math.sqrt((x - s.x)**2 + (y - s.y)**2) <= s.r + 5;
    if (s.type === 'text') return Math.abs(x - s.x) < 50 && Math.abs(y - s.y) < 20;
    if (s.type === 'line') {
      const dist = Math.abs((s.y2 - s.y1)*x - (s.x2 - s.x1)*y + s.x2*s.y1 - s.y2*s.x1) / Math.sqrt((s.y2-s.y1)**2 + (s.x2-s.x1)**2);
      return dist < 10;
    }
    if (s.type === 'path') {
      return s.path.some(p => Math.sqrt((x - p.x)**2 + (y - p.y)**2) < 10);
    }
    return false;
  }

  onPointerMove(e: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    if (e instanceof TouchEvent && e.cancelable) e.preventDefault();
    const { x, y } = this.getCoordinates(e);

    if (this.mode() === 'select' && this.selectedShape) {
      const dx = x - this.dragStartPos.x;
      const dy = y - this.dragStartPos.y;
      this.moveShape(this.selectedShape.shape, dx, dy);
      this.dragStartPos = { x, y };
      this.draw();
      return;
    }

    if (!this.currentShape) return;
    const m = this.mode();
    if (m === 'pen' || m === 'eraser') this.currentShape.path.push({x, y});
    else if (m === 'rect') { this.currentShape.w = x - this.currentShape.x; this.currentShape.h = y - this.currentShape.y; }
    else if (m === 'circle') this.currentShape.r = Math.sqrt((x - this.currentShape.x)**2 + (y - this.currentShape.y)**2);
    else if (m === 'line') { this.currentShape.x2 = x; this.currentShape.y2 = y; }
    this.draw();
  }

  moveShape(s: Shape, dx: number, dy: number) {
    if (s.type === 'rect' || s.type === 'circle' || s.type === 'text') { s.x += dx; s.y += dy; }
    else if (s.type === 'line') { s.x1 += dx; s.y1 += dy; s.x2 += dx; s.y2 += dy; }
    else if (s.type === 'path') s.path.forEach(p => { p.x += dx; p.y += dy; });
  }

  onPointerUp() {
    if (this.isDrawing) {
      if (this.currentShape) {
        this.activeLayer.shapes.push(this.currentShape);
        this.currentShape = null;
        this.saveHistory();
      } else if (this.mode() === 'select' && this.selectedShape) {
        this.saveHistory();
      }
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
