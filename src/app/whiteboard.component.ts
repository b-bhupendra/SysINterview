import { Component, ElementRef, ViewChild, AfterViewInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

type ShapeMode = 'select' | 'pen' | 'rect' | 'circle' | 'text' | 'line' | 'eraser';

interface BaseShape {
  id: string;
  color: string;
  strokeWidth: number;
  opacity?: number;
  isSelected?: boolean;
}

interface PathShape extends BaseShape { type: 'path'; path: {x: number, y: number}[]; }
interface RectShape extends BaseShape { type: 'rect'; x: number; y: number; width: number; height: number; }
interface CircleShape extends BaseShape { type: 'circle'; x: number; y: number; radius: number; }
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
    <div class="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      
      <!-- Canvas Layer -->
      <canvas #canvas 
        class="absolute inset-0 w-full h-full touch-none z-0"
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

      @if (textInput.visible) {
        <input 
          #textInputField
          type="text"
          class="absolute z-50 bg-slate-900/80 backdrop-blur-md outline-none border border-blue-500/50 focus:border-blue-500 border-dashed rounded px-3 py-1 shadow-2xl text-white"
          [style.left.px]="textInput.x"
          [style.top.px]="textInput.y - 20"
          [style.font]="currentFont"
          [style.color]="currentColor"
          placeholder="Type label..."
          (keydown.enter)="commitText($any($event).target.value)"
          (blur)="commitText($any($event).target.value)"
        />
      }

      <!-- Floating Toolbars -->
      
      <!-- History & Global Actions -->
      <div class="absolute top-6 left-6 z-20 flex flex-col gap-4">
        <div class="flex items-center gap-1 glass-panel p-1.5 rounded-2xl animate-in slide-in-from-left duration-500">
          <button (click)="undo()" [disabled]="historyIndex <= 0" 
                  class="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">
            <mat-icon class="text-[20px]">undo</mat-icon>
          </button>
          <div class="w-px h-5 bg-white/5 mx-1"></div>
          <button (click)="redo()" [disabled]="historyIndex >= history.length - 1" 
                  class="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">
            <mat-icon class="text-[20px]">redo</mat-icon>
          </button>
        </div>
        
        @if (selectedShape) {
          <div class="flex items-center gap-2 glass-panel p-1.5 rounded-2xl border-rose-500/20 animate-in zoom-in duration-300">
            <button (click)="deleteSelected()" 
                    class="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all font-bold text-xs uppercase tracking-widest">
              <mat-icon class="text-[18px]">delete</mat-icon>
              Remove
            </button>
          </div>
        }
      </div>

      <!-- Layers & Library Sidebar -->
      <div class="absolute top-6 right-6 z-20 w-72 flex flex-col glass-panel rounded-3xl overflow-hidden animate-in slide-in-from-right duration-500 max-h-[calc(100vh-120px)] border border-white/5">
        
        <div class="flex border-b border-white/5 bg-white/5">
           <button (click)="sidebarTab.set('layers')" class="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all" [class.text-blue-400]="sidebarTab() === 'layers'" [class.text-slate-500]="sidebarTab() !== 'layers'">Layers</button>
           <button (click)="sidebarTab.set('library')" class="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all" [class.text-blue-400]="sidebarTab() === 'library'" [class.text-slate-500]="sidebarTab() !== 'library'">Components</button>
        </div>

        @if (sidebarTab() === 'layers') {
          <div class="p-4 flex items-center justify-between border-b border-white/5 bg-white/5">
            <div class="flex items-center gap-2">
              <mat-icon class="text-blue-400 text-sm">layers</mat-icon>
              <span class="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Hierarchy</span>
            </div>
            <div class="flex gap-2">
              <button (click)="addGroup()" class="p-1.5 text-slate-400 hover:text-amber-400 transition" title="New Group">
                <mat-icon class="text-[18px]">create_new_folder</mat-icon>
              </button>
              <button (click)="addLayer()" class="p-1.5 text-slate-400 hover:text-blue-400 transition" title="New Layer">
                <mat-icon class="text-[18px]">add_box</mat-icon>
              </button>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto pt-4 pb-6 custom-scrollbar" cdkDropList (cdkDropListDropped)="onLayerDrop($event)">
            <!-- Groups -->
            @for (group of groups; track group.id) {
              <div class="mb-2 px-3" cdkDrag>
                <div class="flex items-center p-3 gap-3 group/group glass-card rounded-2xl hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing border-white/5">
                  <button (click)="group.expanded = !group.expanded" class="text-slate-500 hover:text-slate-300">
                    <mat-icon class="text-[18px]">{{ group.expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}</mat-icon>
                  </button>
                  <div class="flex-1 min-w-0">
                    <span class="text-[11px] font-bold text-slate-200 uppercase truncate block tracking-wide">{{ group.name }}</span>
                  </div>
                  <button (click)="$event.stopPropagation(); removeGroup(group.id)" class="opacity-0 group-hover/group:opacity-100 transition-opacity text-slate-500 hover:text-rose-400">
                    <mat-icon class="text-[16px]">delete</mat-icon>
                  </button>
                </div>
                
                @if (group.expanded) {
                  <div class="mt-2 ml-4 pl-4 border-l border-white/10 space-y-2" cdkDropList [cdkDropListData]="group.layerIds" (cdkDropListDropped)="onNestedLayerDrop($event, group)">
                    @for (layerId of group.layerIds; track layerId) {
                      @let nestedLayer = getLayerById(layerId);
                      @if (nestedLayer) {
                        <div cdkDrag>
                          <ng-container [ngTemplateOutlet]="layerRow" [ngTemplateOutletContext]="{ layer: nestedLayer }"></ng-container>
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            }

            <div class="px-6 py-2">
              @if (hasUngroupedLayers()) {
                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-50">Base Layers</div>
              }
              @for (layer of layers; track layer.id) {
                @if (!layer.groupId) {
                  <div cdkDrag class="mb-2 last:mb-0">
                    <ng-container [ngTemplateOutlet]="layerRow" [ngTemplateOutletContext]="{ layer: layer }"></ng-container>
                  </div>
                }
              }
            </div>
          </div>
        } @else {
          <!-- Component Library -->
          <div class="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div class="grid grid-cols-2 gap-3">
              @for (node of nodeLibrary; track node.name) {
                <button (click)="addNode(node)" class="flex flex-col items-center gap-2 p-4 glass-card rounded-2xl hover:bg-white/10 group transition-all">
                  <div class="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                    <mat-icon class="text-blue-400">{{node.icon}}</mat-icon>
                  </div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{node.name}}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <ng-template #layerRow let-layer="layer">
        <div 
          class="flex items-center p-3 gap-3 group/layer transition-all border border-transparent rounded-2xl cursor-pointer"
          [class.bg-blue-600/30]="activeLayerId === layer.id"
          [class.border-blue-500/20]="activeLayerId === layer.id"
          [class.bg-white/5]="activeLayerId !== layer.id"
          [class.hover:bg-white/10]="activeLayerId !== layer.id"
          (click)="activeLayerId = layer.id"
        >
          <button (click)="$event.stopPropagation(); layer.visible = !layer.visible; saveHistory(); draw()" 
                  class="text-slate-500 transition"
                  [class.text-blue-400]="layer.visible">
            <mat-icon class="text-[18px]">{{ layer.visible ? 'visibility' : 'visibility_off' }}</mat-icon>
          </button>
          
          <span class="flex-1 text-[11px] font-medium truncate tracking-wide" 
                [class.text-white]="activeLayerId === layer.id"
                [class.text-slate-400]="activeLayerId !== layer.id">
            {{ layer.name }}
          </span>
          
          <div class="flex items-center gap-1 opacity-0 group-hover/layer:opacity-100 transition-opacity">
            <button (click)="$event.stopPropagation(); openMoveToGroup(layer.id)" class="text-slate-500 hover:text-amber-400">
               <mat-icon class="text-[16px]">folder_shared</mat-icon>
            </button>
            @if (layers.length > 1) {
              <button (click)="$event.stopPropagation(); removeLayer(layer.id)" class="text-slate-500 hover:text-rose-400">
                <mat-icon class="text-[16px]">remove_circle</mat-icon>
              </button>
            }
          </div>
        </div>
      </ng-template>
      
      <!-- Main Bottom Toolbar -->
      <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center p-2 glass-panel rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 animate-in slide-in-from-bottom duration-700">
        <div class="flex items-center bg-white/5 rounded-2xl p-1 shrink-0">
          @for (tool of tools; track tool.val) {
            <button 
              (click)="setMode(tool.val)"
              [class.bg-blue-600]="mode() === tool.val"
              [class.text-white]="mode() === tool.val"
              [class.shadow-lg]="mode() === tool.val"
              [class.shadow-blue-600/40]="mode() === tool.val"
              [class.text-slate-400]="mode() !== tool.val"
              [class.hover:text-white]="mode() !== tool.val"
              [class.hover:bg-white/5]="mode() !== tool.val"
              class="w-10 h-10 rounded-xl transition-all flex items-center justify-center outline-none relative group"
              [title]="tool.name"
            >
              <mat-icon class="text-[20px]">{{tool.icon}}</mat-icon>
              @if (mode() === tool.val) {
                <div class="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>
              }
            </button>
          }
        </div>
        
        <div class="w-px h-8 bg-white/10 mx-3"></div>

        <!-- Color Palette -->
        <div class="flex items-center gap-2 px-2 shrink-0">
           @for (color of colors; track color.val) {
             <button (click)="currentColor = color.val"
                     class="w-6 h-6 rounded-full border-2 transition-all hover:scale-125 hover:shadow-lg"
                     [style.backgroundColor]="color.val"
                     [style.borderColor]="currentColor === color.val ? 'white' : 'transparent'"
                     [class.scale-125]="currentColor === color.val"
             ></button>
           }
        </div>

        <div class="w-px h-8 bg-white/10 mx-3"></div>

        <!-- Stroke Width -->
        <div class="flex items-center gap-1 px-1 text-slate-400 shrink-0">
           @for (width of widths; track width.val) {
             <button (click)="currentWidth = width.val"
                     class="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/10"
                     [class.bg-white/10]="currentWidth === width.val"
                     [class.text-blue-400]="currentWidth === width.val"
             >
                <div class="bg-current rounded-full" [style.width.px]="width.val" [style.height.px]="width.val"></div>
             </button>
           }
        </div>

        <div class="w-px h-8 bg-white/10 mx-3"></div>

        <!-- Utility -->
        <button (click)="clear()" class="w-10 h-10 rounded-xl transition-all flex items-center justify-center text-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400" title="Clear Board">
          <mat-icon class="text-[20px]">delete_sweep</mat-icon>
        </button>
      </div>

    </div>
  `,
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
  
  sidebarTab = signal<'layers' | 'library'>('layers');
  
  nodeLibrary = [
    { name: 'Load Balancer', icon: 'alt_route', type: 'rect', color: '#6366f1' },
    { name: 'Database', icon: 'storage', type: 'circle', color: '#f59e0b' },
    { name: 'Cache', icon: 'bolt', type: 'rect', color: '#10b981' },
    { name: 'Server', icon: 'dns', type: 'rect', color: '#3b82f6' },
    { name: 'CDN', icon: 'public', type: 'circle', color: '#ec4899' },
    { name: 'Message Queue', icon: 'swap_horiz', type: 'rect', color: '#8b5cf6' },
    { name: 'User', icon: 'person', type: 'circle', color: '#94a3b8' },
    { name: 'Firewall', icon: 'security', type: 'rect', color: '#ef4444' }
  ];

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

  addNode(node: any) {
    const id = 's' + Date.now();
    const centerX = 400;
    const centerY = 300;
    
    // Create correct shape type based on node
    let container: Shape;
    if (node.type === 'circle') {
      container = {
        id,
        type: 'circle',
        x: centerX,
        y: centerY,
        radius: 40,
        color: node.color,
        strokeWidth: 2,
        opacity: 0.2
      };
    } else {
      container = {
        id,
        type: 'rect',
        x: centerX - 40,
        y: centerY - 40,
        width: 80,
        height: 80,
        color: node.color,
        strokeWidth: 2,
        opacity: 0.2
      };
    }

    // Add a label
    const label: Shape = {
      id: id + '_label',
      type: 'text',
      x: centerX,
      y: centerY + 55,
      color: '#ffffff',
      strokeWidth: 1,
      text: node.name,
      font: '500 10px "Inter", sans-serif'
    };

    this.activeLayer.shapes.push(container, label);
    this.draw();
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

  renderShape(shape: any) {
    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.strokeWidth;
    this.ctx.fillStyle = shape.color;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    if (shape.opacity !== undefined) {
      this.ctx.globalAlpha = shape.opacity;
    } else {
      this.ctx.globalAlpha = 1.0;
    }

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
        shape.path.forEach((p: any) => this.ctx.lineTo(p.x, p.y));
        this.ctx.stroke();
      }
    } else if (shape.type === 'rect') {
      this.ctx.rect(shape.x, shape.y, shape.width, shape.height);
      this.ctx.stroke();
      if (shape.opacity !== undefined) this.ctx.fill();
    } else if (shape.type === 'circle') {
      this.ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      if (shape.opacity !== undefined) this.ctx.fill();
    } else if (shape.type === 'line') {
      this.ctx.moveTo(shape.x1, shape.y1);
      this.ctx.lineTo(shape.x2, shape.y2);
      this.ctx.stroke();
    } else if (shape.type === 'text') {
      this.ctx.font = shape.font;
      this.ctx.fillText(shape.text, shape.x, shape.y);
    }
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;
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
        strokeWidth: 2
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
    if (m === 'pen') this.currentShape = { id, type: 'path', path: [{x, y}], color: this.currentColor, strokeWidth: this.currentWidth };
    else if (m === 'eraser') this.currentShape = { id, type: 'path', path: [{x, y}], color: '#020617', strokeWidth: 20 };
    else if (m === 'rect') this.currentShape = { id, type: 'rect', x, y, width: 0, height: 0, color: this.currentColor, strokeWidth: this.currentWidth };
    else if (m === 'circle') this.currentShape = { id, type: 'circle', x, y, radius: 0, color: this.currentColor, strokeWidth: this.currentWidth };
    else if (m === 'line') this.currentShape = { id, type: 'line', x1: x, y1: y, x2: x, y2: y, color: this.currentColor, strokeWidth: this.currentWidth };
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
    if (s.type === 'rect') return x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height;
    if (s.type === 'circle') return Math.sqrt((x - s.x)**2 + (y - s.y)**2) <= s.radius + 5;
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
    else if (m === 'rect') { this.currentShape.width = x - this.currentShape.x; this.currentShape.height = y - this.currentShape.y; }
    else if (m === 'circle') this.currentShape.radius = Math.sqrt((x - this.currentShape.x)**2 + (y - this.currentShape.y)**2);
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
