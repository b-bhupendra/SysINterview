import { Component, input, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AiService } from './ai.service';
import { MatIconModule } from '@angular/material/icon';
import { SystemDesignScenario } from './knowledge-base';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <aside class="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-sm relative">
      <!-- Header -->
      <div class="p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div class="flex items-center gap-2 text-slate-300 font-medium tracking-wide">
          <mat-icon class="text-blue-500 text-[20px] h-[20px] w-[20px]">smart_toy</mat-icon>
          AI Copilot
        </div>
        <div class="flex items-center gap-2">
           <button class="text-slate-500 hover:text-blue-400 transition-colors outline-none" (click)="showSettings = true" title="Settings">
             <mat-icon class="text-[20px] h-[20px] w-[20px]">settings</mat-icon>
           </button>
           <button 
             class="text-slate-500 hover:text-blue-400 transition-colors outline-none" 
             (click)="toggleOffline()"
             [title]="'Current: ' + (aiService.isOfflineMode() ? 'Offline (Fast)' : 'Online (Gemini)')"
           >
             <mat-icon class="text-[20px] h-[20px] w-[20px]">{{ aiService.isOfflineMode() ? 'cloud_off' : 'cloud_queue' }}</mat-icon>
           </button>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 font-sans" #scrollContainer>
        @if (aiService.messages().length === 0) {
           <div class="text-slate-500 flex flex-col items-center justify-center h-full gap-3 opacity-60">
             <mat-icon class="text-4xl w-10 h-10">waving_hand</mat-icon>
             <p class="text-center px-4 text-xs leading-relaxed">I'm your System Design Interview assistant. Tell me about your architecture!</p>
             
             @if (activeScenario()) {
               <div class="flex flex-col gap-2 mt-4 items-stretch w-full max-w-[200px]">
                 <button (click)="aiService.sendMessage('Explain theory', '', activeScenario()?.id)" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-emerald-400 hover:bg-slate-700 transition">Explain Theory</button>
                 <button (click)="aiService.sendMessage('List components', '', activeScenario()?.id)" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-emerald-400 hover:bg-slate-700 transition">List Components</button>
                 <button (click)="aiService.sendMessage('Show bottlenecks', '', activeScenario()?.id)" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-emerald-400 hover:bg-slate-700 transition">Show Bottlenecks</button>
                 <button (click)="aiService.sendMessage('Diagram hints', '', activeScenario()?.id)" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-emerald-400 hover:bg-slate-700 transition">Diagram Hints</button>
               </div>
             }
           </div>
        }

        @for (msg of aiService.messages(); track $index) {
          <div [class]="msg.role === 'user' ? 'text-right' : 'text-left'">
            <div 
              class="inline-block px-3 py-2 rounded-lg max-w-[90%] text-left whitespace-pre-wrap leading-relaxed shadow-sm text-xs border"
              [class.bg-blue-600]="msg.role === 'user'"
              [class.bg-slate-800/50]="msg.role === 'assistant'"
              [class.text-white]="msg.role === 'user'"
              [class.text-slate-300]="msg.role === 'assistant'"
              [class.border-blue-500]="msg.role === 'user'"
              [class.border-slate-700/50]="msg.role === 'assistant'"
            >
              {{msg.text}}
            </div>
          </div>
        }

        @if (aiService.isProcessing()) {
          <div class="flex items-center gap-2 text-slate-500">
            <mat-icon class="animate-spin text-[16px] h-[16px] w-[16px]">hourglass_empty</mat-icon>
            <span class="text-[11px]">Thinking...</span>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div class="mt-auto p-4 bg-slate-950 border-t border-slate-800 shrink-0">
        <div class="mb-3 flex items-center space-x-2">
          <div class="w-2 h-2 rounded-full" [class.bg-blue-500]="!aiService.isOfflineMode() && !aiService.lmConfig().enabled" [class.bg-emerald-500]="aiService.lmConfig().enabled" [class.bg-slate-500]="aiService.isOfflineMode() && !aiService.lmConfig().enabled"></div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ aiService.lmConfig().enabled ? 'LM Studio' : (aiService.isOfflineMode() ? 'Offline Mode' : 'Gemini AI') }}</span>
        </div>
        <form class="relative" (submit)="onSubmit($event)">
          <input 
            type="text" 
            #msgInput
            placeholder="Ask about the design..." 
            class="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
          >
          <button 
            type="submit"
            [disabled]="aiService.isProcessing()"
            class="absolute right-2 top-2 text-slate-500 hover:text-blue-400 disabled:opacity-50 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
          </button>
        </form>
      </div>

      <!-- Settings Modal -->
      @if (showSettings) {
        <div class="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl">
          <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl w-full max-w-sm flex flex-col relative z-20">
             <div class="flex items-center justify-between mb-4">
               <h3 class="text-white font-medium text-sm">AI Settings</h3>
               <button (click)="showSettings = false" class="text-slate-400 hover:text-white"><mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon></button>
             </div>

             <div class="space-y-4">
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" [checked]="aiService.lmConfig().enabled" (change)="toggleLmStudio($event)" class="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900">
                  Enable Local LLM (LM Studio)
                </label>
                
                @if (aiService.lmConfig().enabled) {
                  <div class="space-y-3 pt-2">
                    <div>
                      <label for="endpoint-input" class="block text-[10px] uppercase text-slate-500 mb-1 tracking-wider font-semibold">Endpoint (Requires CORS)</label>
                      <input id="endpoint-input" type="text" [value]="aiService.lmConfig().endpoint" (input)="updateEndpoint($event)" class="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                    <div>
                      <label for="model-input" class="block text-[10px] uppercase text-slate-500 mb-1 tracking-wider font-semibold">Model Name</label>
                      <input id="model-input" type="text" [value]="aiService.lmConfig().model" (input)="updateModel($event)" class="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                    <div>
                      <label for="temperature-input" class="block text-[10px] uppercase text-slate-500 mb-1 tracking-wider font-semibold">Temperature ({{aiService.lmConfig().temperature}})</label>
                      <input id="temperature-input" type="range" min="0" max="2" step="0.1" [value]="aiService.lmConfig().temperature" (input)="updateTemperature($event)" class="w-full accent-blue-500">
                    </div>
                    <div>
                      <button (click)="testLmStudio()" class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-xs transition-colors font-medium">Test Connection</button>
                      @if (testResult) {
                         <p class="text-[10px] mt-2 whitespace-pre-wrap" [class.text-emerald-400]="testSuccess" [class.text-rose-400]="!testSuccess">{{testResult}}</p>
                      }
                    </div>
                  </div>
                }
             </div>
             <div class="mt-6 flex justify-end">
                <button class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-medium transition-colors" (click)="showSettings = false">Done</button>
             </div>
          </div>
        </div>
      }
    </aside>
  `
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
  }

  updateEndpoint(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.aiService.lmConfig.update(c => ({ ...c, endpoint: val }));
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

