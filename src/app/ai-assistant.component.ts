import { Component, input, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AiService } from './ai.service';
import { MatIconModule } from '@angular/material/icon';
import { SystemDesignScenario } from './knowledge-base';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <aside class="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-sm">
      <!-- Header -->
      <div class="p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div class="flex items-center gap-2 text-slate-300 font-medium tracking-wide">
          <mat-icon class="text-blue-500 text-[20px] h-[20px] w-[20px]">smart_toy</mat-icon>
          AI Copilot
        </div>
        <button 
          class="text-slate-500 hover:text-blue-400 transition-colors outline-none" 
          (click)="toggleOffline()"
          [title]="'Current: ' + (aiService.isOfflineMode() ? 'Offline (Fast)' : 'Online (Gemini)')"
        >
          <mat-icon class="text-[20px] h-[20px] w-[20px]">{{ aiService.isOfflineMode() ? 'cloud_off' : 'cloud_queue' }}</mat-icon>
        </button>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 font-sans" #scrollContainer>
        @if (aiService.messages().length === 0) {
           <div class="text-slate-500 flex flex-col items-center justify-center h-full gap-3 opacity-60">
             <mat-icon class="text-4xl w-10 h-10">waving_hand</mat-icon>
             <p class="text-center px-4 text-xs leading-relaxed">I'm your System Design Interview assistant. Tell me about your architecture!</p>
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
          <div class="w-2 h-2 rounded-full" [class.bg-blue-500]="!aiService.isOfflineMode()" [class.bg-slate-500]="aiService.isOfflineMode()"></div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ aiService.isOfflineMode() ? 'Offline Mode' : 'Gemini AI' }}</span>
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
    </aside>
  `
})
export class AiAssistantComponent implements AfterViewChecked {
  aiService = inject(AiService);
  activeScenario = input<SystemDesignScenario | null>(null);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('msgInput') private msgInput!: ElementRef;

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

  onSubmit(e: Event) {
    e.preventDefault();
    const val = this.msgInput.nativeElement.value.trim();
    if (!val || this.aiService.isProcessing()) return;
    
    this.msgInput.nativeElement.value = '';
    
    const context = this.activeScenario() 
      ? `Scenario: ${this.activeScenario()?.title}. Requirements: ${this.activeScenario()?.requirements.join(', ')}`
      : 'No active scenario selected.';

    this.aiService.sendMessage(val, context);
  }
}
