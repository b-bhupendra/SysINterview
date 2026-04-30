import { Component, input, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AiService } from './ai.service';
import { MatIconModule } from '@angular/material/icon';
import { SystemDesignScenario } from './knowledge-base';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <aside class="flex flex-col h-full text-sm relative glass-panel border-0">
      
      <!-- Header -->
      <div class="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <mat-icon class="text-blue-400 text-[18px]">smart_toy</mat-icon>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-100 tracking-wider">AI COPILOT</div>
            <div class="text-[9px] text-slate-500 font-mono flex items-center gap-1">
              <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
              {{ aiService.isOfflineMode() ? 'OFFLINE READY' : 'GEMINI ACTIVE' }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
           <button class="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" (click)="showSettings = true">
             <mat-icon class="text-[20px]">settings</mat-icon>
           </button>
           <button class="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" (click)="toggleOffline()">
             <mat-icon class="text-[20px]">{{ aiService.isOfflineMode() ? 'cloud_off' : 'cloud_queue' }}</mat-icon>
           </button>
        </div>
      </div>
 
      <!-- Chat Area -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" #scrollContainer>
        @if (aiService.messages().length === 0) {
           <div class="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
             <mat-icon class="text-6xl text-slate-600">forum</mat-icon>
             <p class="text-[11px] leading-relaxed max-w-[200px]">How can I assist your system design today?</p>
             
             @if (activeScenario()) {
                <div class="grid grid-cols-1 gap-2 w-full pt-4">
                  <button (click)="aiService.sendMessage('Explain the theory behind ' + activeScenario()?.title, '', activeScenario()?.id)" class="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] text-slate-400 hover:bg-white/10 transition">Explain Theory</button>
                  <button (click)="aiService.sendMessage('List critical components for ' + activeScenario()?.title, '', activeScenario()?.id)" class="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] text-slate-400 hover:bg-white/10 transition">List Components</button>
                </div>
             }
           </div>
        }
 
        @for (msg of aiService.messages(); track $index) {
          <div [class]="msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'">
            <div 
              class="px-4 py-3 rounded-2xl max-w-[90%] text-xs leading-relaxed transition-all shadow-xl"
              [class.bg-blue-600]="msg.role === 'user'"
              [class.text-white]="msg.role === 'user'"
              [class.glass-card]="msg.role === 'assistant'"
              [class.text-slate-200]="msg.role === 'assistant'"
              [class.rounded-tr-none]="msg.role === 'user'"
              [class.rounded-tl-none]="msg.role === 'assistant'"
            >
              {{msg.text}}
            </div>
            <div class="text-[8px] text-slate-600 mt-1 uppercase font-mono px-1">
              {{ msg.role === 'user' ? 'YOU' : 'COPILOT' }}
            </div>
          </div>
        }
 
        @if (aiService.isProcessing()) {
          <div class="flex items-center gap-3 text-blue-400 animate-pulse px-2">
            <div class="flex gap-1">
              <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
            </div>
            <span class="text-[10px] font-bold tracking-widest">ANALYZING</span>
          </div>
        }
      </div>
 
      <!-- Input Area -->
      <div class="p-6 bg-white/5 backdrop-blur-md border-t border-white/5 shrink-0">
        <form class="relative group" (submit)="onSubmit($event)">
          <input 
            type="text" 
            #msgInput
            placeholder="Architecture query..." 
            class="w-full glass-input pl-4 pr-12 py-3.5 text-xs text-white"
          >
          <button 
            type="submit"
            [disabled]="aiService.isProcessing()"
            class="absolute right-2 top-1.5 w-10 h-10 flex items-center justify-center text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all disabled:opacity-30"
          >
            <mat-icon>send</mat-icon>
          </button>
        </form>
      </div>
 
      <!-- Settings Overlay (Simplified) -->
      @if (showSettings) {
        <div class="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col p-8 animate-in fade-in duration-300">
           <div class="flex items-center justify-between mb-8">
             <h3 class="text-lg font-bold text-white tracking-tight">Copilot Engine</h3>
             <button (click)="showSettings = false" class="p-2 text-slate-500 hover:text-white rounded-lg transition-all"><mat-icon>close</mat-icon></button>
           </div>
 
           <div class="flex-1 space-y-8 overflow-y-auto custom-scrollbar">
              <div class="space-y-4">
                 <label class="flex items-center justify-between p-4 glass-card rounded-2xl cursor-pointer group">
                   <div class="flex items-center gap-3">
                     <div class="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-all text-purple-400">
                       <mat-icon>dns</mat-icon>
                     </div>
                     <span class="text-xs font-bold text-slate-200">Local LLM Interface</span>
                   </div>
                   <input type="checkbox" [checked]="aiService.lmConfig().enabled" (change)="toggleLmStudio($event)" class="w-10 h-5 appearance-none bg-slate-800 rounded-full relative cursor-pointer checked:bg-blue-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all checked:after:translate-x-5">
                 </label>
                 
                 @if (aiService.lmConfig().enabled) {
                   <div class="space-y-4 animate-in slide-in-from-top-4 duration-300">
                     <div>
                       <label class="block text-[10px] text-slate-500 font-bold uppercase mb-2 ml-1">Endpoint API</label>
                       <input type="text" [value]="aiService.lmConfig().endpoint" (change)="updateEndpoint($event)" class="w-full glass-input px-4 py-3 text-xs">
                     </div>
                     <div>
                       <label class="block text-[10px] text-slate-500 font-bold uppercase mb-2 ml-1">Preferred Model</label>
                       @if (aiService.availableModels().length > 0) {
                         <select (change)="updateModel($event)" class="w-full glass-input px-4 py-3 text-xs appearance-none">
                           @for (model of aiService.availableModels(); track model) {
                              <option [value]="model" [selected]="aiService.lmConfig().model === model">{{model}}</option>
                           }
                         </select>
                       } @else {
                         <input type="text" [value]="aiService.lmConfig().model" (input)="updateModel($event)" class="w-full glass-input px-4 py-3 text-xs">
                       }
                     </div>
                   </div>
                 }
              </div>
           </div>

           <div class="pt-8 flex flex-col gap-3">
              <button (click)="testLmStudio()" [disabled]="!aiService.lmConfig().enabled" class="w-full py-4 glass-card text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest disabled:opacity-20">Test Connectivity</button>
              <button class="w-full py-4 bg-blue-600 text-white text-xs font-bold rounded-2xl hover:bg-blue-500 shadow-xl transition-all uppercase tracking-widest" (click)="showSettings = false">Save Configuration</button>
           </div>
        </div>
      }
    </aside>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
  `]
})
export class AiAssistantComponent implements AfterViewChecked {
  aiService = inject(AiService);
  activeScenario = input<SystemDesignScenario | null>(null);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('msgInput') private msgInput!: ElementRef;

  showSettings = false;
  testResult = '';
  testSuccess = false;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch { 
      // Ignored
    }
  }

  toggleOffline() {
    this.aiService.isOfflineMode.update(m => !m);
  }

  toggleLmStudio(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.aiService.lmConfig.update(c => ({ ...c, enabled: checked }));
    this.testResult = '';
    if (checked) {
      this.aiService.fetchLmStudioModels(this.aiService.lmConfig().endpoint);
    }
  }

  updateEndpoint(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.aiService.lmConfig.update(c => ({ ...c, endpoint: val }));
    this.aiService.fetchLmStudioModels(val);
  }

  updateModel(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.aiService.lmConfig.update(c => ({ ...c, model: val }));
  }

  updateTemperature(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.aiService.lmConfig.update(c => ({ ...c, temperature: val }));
  }

  async testLmStudio() {
    this.testResult = 'Testing connection...';
    await this.aiService.fetchLmStudioModels(this.aiService.lmConfig().endpoint);
    const success = await this.aiService.checkLmStudio(this.aiService.lmConfig().endpoint);
    this.testSuccess = success;
    if (success) {
      this.testResult = 'Connection successful!';
    } else {
      this.testResult = 'Connection failed. Verify endpoint URL, ensure LM Studio server is running, and CORS is enabled in LM Studio settings.';
    }
  }

  onSubmit(e: Event) {
    e.preventDefault();
    const val = this.msgInput.nativeElement.value.trim();
    if (!val || this.aiService.isProcessing()) return;
    
    this.msgInput.nativeElement.value = '';
    
    const context = this.activeScenario() 
      ? `Scenario: ${this.activeScenario()?.title}. Requirements: ${this.activeScenario()?.requirements.join(', ')}`
      : 'No active scenario selected.';

    this.aiService.sendMessage(val, context, this.activeScenario()?.id);
  }
}

