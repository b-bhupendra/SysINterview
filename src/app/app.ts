import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SCENARIOS, SystemDesignScenario } from './knowledge-base';
import { WhiteboardComponent } from './whiteboard.component';
import { AiAssistantComponent } from './ai-assistant.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [WhiteboardComponent, AiAssistantComponent, MatIconModule],
  template: `
    <div class="h-screen w-full flex overflow-hidden font-sans bg-slate-950 text-slate-200">
      
      <!-- Left Sidebar (Knowledge Base & Scenarios) -->
      <aside class="w-80 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900 z-20">
        <div class="p-5 border-b border-slate-800 shrink-0">
          <h1 class="text-lg font-semibold tracking-tight text-slate-100 flex items-center gap-3">
             <mat-icon class="text-blue-400">architecture</mat-icon>
             SysDes Board
          </h1>
          <p class="text-[11px] text-slate-400 mt-2 leading-relaxed italic">System design interview prep and collaborative problem-solving knowledge base.</p>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
           <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Scenarios</h3>
           @for (scenario of scenarios; track scenario.id) {
             <button 
                (click)="selectScenario(scenario)"
                class="w-full text-left p-3 rounded-lg border transition-all outline-none focus:ring-1 focus:ring-blue-500 group"
                [class.bg-blue-600]="activeScenario()?.id === scenario.id"
                [class.border-blue-500]="activeScenario()?.id === scenario.id"
                [class.text-white]="activeScenario()?.id === scenario.id"
                [class.bg-slate-800/50]="activeScenario()?.id !== scenario.id"
                [class.border-slate-700/50]="activeScenario()?.id !== scenario.id"
                [class.hover:bg-slate-800]="activeScenario()?.id !== scenario.id"
             >
                <div class="text-[11px] font-medium truncate flex items-center space-x-2"
                     [class.text-white]="activeScenario()?.id === scenario.id"
                     [class.text-slate-300]="activeScenario()?.id !== scenario.id"
                >
                  <mat-icon class="text-[16px] h-[16px] w-[16px]">description</mat-icon>
                  <span>{{scenario.title}}</span>
                </div>
                <p class="text-[10px] leading-snug italic mt-2 line-clamp-2"
                   [class.text-blue-200]="activeScenario()?.id === scenario.id"
                   [class.text-slate-500]="activeScenario()?.id !== scenario.id"
                >
                   "{{scenario.description}}"
                </p>
             </button>
           }
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 relative flex flex-col z-10">
        <!-- Top banner for active scenario requirements -->
        @if (activeScenario()) {
          <header class="min-h-16 flex items-center justify-between px-6 bg-slate-900/50 border-b border-slate-800 backdrop-blur-sm z-20 shadow-sm pointer-events-none">
             <div class="flex items-center space-x-4 shrink-0">
                <h1 class="text-base font-semibold tracking-tight text-slate-100">{{activeScenario()?.title}}</h1>
                <span class="px-2 py-0.5 bg-indigo-900/40 text-indigo-300 text-[10px] font-mono rounded border border-indigo-500/30 uppercase tracking-widest">Interview Mode</span>
             </div>
             <div class="ml-6 py-2">
                   <ul class="text-[11px] text-slate-400 flex flex-wrap justify-end gap-x-4 gap-y-1 list-none">
                     @for (req of activeScenario()?.requirements; track req) {
                       <li class="flex items-center space-x-1"><div class="w-1 h-1 bg-amber-500 rounded-full mt-0.5 shrink-0"></div><span class="line-clamp-1 truncate max-w-[200px]" [title]="req">{{req}}</span></li>
                     }
                   </ul>
             </div>
          </header>
        }
        
        <app-whiteboard class="flex-1 relative block overflow-hidden"></app-whiteboard>
      </main>

      <!-- Right Sidebar (AI Copilot) -->
      <app-ai-assistant class="shrink-0 z-20"></app-ai-assistant>

    </div>
  `
})
export class App {
  scenarios = SCENARIOS;
  activeScenario = signal<SystemDesignScenario | null>(null);

  selectScenario(scenario: SystemDesignScenario) {
    this.activeScenario.set(scenario);
  }
}
