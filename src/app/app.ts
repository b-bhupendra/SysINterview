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
                <button (click)="toggleBook(scenario, $event)"
                   class="mt-3 w-full py-1.5 flex items-center justify-center gap-1.5 text-[11px] rounded transition-colors font-medium border"
                   [class.bg-blue-500]="activeScenario()?.id === scenario.id"
                   [class.text-white]="activeScenario()?.id === scenario.id"
                   [class.border-blue-400]="activeScenario()?.id === scenario.id"
                   [class.hover:bg-blue-400]="activeScenario()?.id === scenario.id"
                   [class.bg-slate-800/80]="activeScenario()?.id !== scenario.id"
                   [class.border-slate-700]="activeScenario()?.id !== scenario.id"
                   [class.text-slate-300]="activeScenario()?.id !== scenario.id"
                   [class.hover:bg-slate-700]="activeScenario()?.id !== scenario.id"
                >
                   <mat-icon class="text-[16px] w-[16px] h-[16px]">menu_book</mat-icon> Open Handbook
                </button>
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

        <!-- Book Mode Overlay -->
        @if (bookMode() && activeScenario()) {
          <div class="absolute inset-4 z-30 flex items-stretch shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden animate-in zoom-in-95 duration-300">
             <!-- Book Layout -->
             <div class="flex-1 flex bg-[#fefcf8] text-stone-900 border-2 border-stone-300/50 relative">
               
               <!-- Close Button -->
               <button (click)="bookMode.set(false)" class="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 transition z-50 rounded-full hover:bg-stone-200">
                  <mat-icon>close</mat-icon>
               </button>

               <!-- Left Page (Theory & Components) -->
               <div class="flex-1 border-r border-[#e5e0d8] shadow-[2px_0_15px_rgba(0,0,0,0.05)] p-12 overflow-y-auto font-serif relative">
                  <!-- Decorative spine gradient -->
                  <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#ebe5db] to-transparent pointer-events-none"></div>
                  
                  <div class="max-w-xl mx-auto space-y-8 relative z-10">
                     <p class="text-xs font-sans tracking-widest uppercase text-stone-400 font-bold mb-2">Architect's Reference &bull; {{activeScenario()?.difficulty || 'General'}}</p>
                     <h2 class="text-4xl font-bold tracking-tight text-stone-800">{{activeScenario()?.title}}</h2>
                     <p class="text-lg italic text-stone-600 font-medium">"{{activeScenario()?.description}}"</p>
                     
                     <div class="space-y-4 pt-4">
                       <h3 class="text-2xl font-bold text-stone-800 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
                         <mat-icon class="text-indigo-600">auto_stories</mat-icon> Concept & Theory
                       </h3>
                       <p class="text-[15px] text-stone-700 leading-relaxed text-justify">{{activeScenario()?.theory || 'Theory not available offline.'}}</p>
                     </div>

                     @if (activeScenario()?.key_topics) {
                        <div class="space-y-4 pt-4">
                          <h3 class="text-2xl font-bold text-stone-800 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
                            <mat-icon class="text-emerald-700">stars</mat-icon> Key Topics
                          </h3>
                          <ul class="flex flex-wrap gap-2 text-stone-700 text-[13px] leading-relaxed">
                            @for (topic of activeScenario()?.key_topics; track topic) {
                              <li class="bg-stone-200/60 px-3 py-1 rounded-full text-stone-700 border border-stone-300">{{topic}}</li>
                            }
                          </ul>
                        </div>
                     }

                     <div class="space-y-4 pt-4">
                       <h3 class="text-2xl font-bold text-stone-800 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
                         <mat-icon class="text-emerald-700">hub</mat-icon> Core Components
                       </h3>
                       <ul class="list-none space-y-3">
                         @for (comp of activeScenario()?.components; track comp) {
                           <li class="flex items-start gap-2">
                             <mat-icon class="text-emerald-600 text-[20px] w-5 h-5 mt-0.5 shrink-0">check_circle</mat-icon>
                             <span class="text-stone-700 text-[15px]">{{comp}}</span>
                           </li>
                         }
                       </ul>
                     </div>
                  </div>
               </div>

               <!-- Right Page (Bottlenecks & Diagram Hints) -->
               <div class="flex-1 p-12 overflow-y-auto font-serif relative">
                  <!-- Decorative spine gradient -->
                  <div class="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#e5e0d8] via-[#f1eee8] to-transparent pointer-events-none"></div>

                  <div class="max-w-xl mx-auto space-y-8 pt-8 relative z-10">
                     
                     <div class="space-y-4">
                       <h3 class="text-2xl font-bold text-stone-800 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
                         <mat-icon class="text-rose-600">warning_amber</mat-icon> Bottlenecks & Tradeoffs
                       </h3>
                       <ul class="list-disc list-outside pl-6 space-y-3 text-stone-700 text-[15px] leading-relaxed marker:text-rose-500">
                         @for (bot of activeScenario()?.bottlenecks; track bot) {
                           <li>{{bot}}</li>
                         }
                       </ul>
                     </div>

                     <div class="space-y-4 pt-6">
                       <h3 class="text-2xl font-bold text-stone-800 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
                         <mat-icon class="text-amber-700">draw</mat-icon> Architect's Sketchpad
                       </h3>
                       <div class="bg-[#f2efe9] p-6 rounded-lg text-stone-800 text-[15px] leading-relaxed border border-stone-300 shadow-inner font-sans">
                         {{activeScenario()?.diagramHints || 'No diagram hints available.'}}
                       </div>
                       
                       <div class="mt-12 flex justify-center">
                         <button (click)="bookMode.set(false)" class="flex items-center gap-2 px-8 py-3.5 rounded-full bg-stone-800 text-stone-100 font-sans text-sm font-semibold hover:bg-stone-700 transition shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 duration-200 outline-none focus:ring-4 focus:ring-stone-800/30">
                           Close Book and Start Drawing
                           <mat-icon class="text-[18px] w-[18px] h-[18px]">edit</mat-icon>
                         </button>
                       </div>
                     </div>
                  </div>
               </div>

             </div>
          </div>
        }

      </main>

      <!-- Right Sidebar (AI Copilot) -->
      <app-ai-assistant class="shrink-0 z-20"></app-ai-assistant>

    </div>
  `
})
export class App {
  scenarios = SCENARIOS;
  activeScenario = signal<SystemDesignScenario | null>(null);
  bookMode = signal<boolean>(false);

  selectScenario(scenario: SystemDesignScenario) {
    this.activeScenario.set(scenario);
    this.bookMode.set(false);
  }

  toggleBook(scenario: SystemDesignScenario, event: Event) {
    event.stopPropagation();
    if (this.activeScenario()?.id !== scenario.id) {
      this.activeScenario.set(scenario);
    }
    this.bookMode.set(!this.bookMode());
  }
}
