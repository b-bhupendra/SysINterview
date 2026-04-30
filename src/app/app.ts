import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { SCENARIOS, FUNDAMENTALS, FLASHCARDS, QUIZZES, SystemDesignScenario, Fundamental, Flashcard, QuizQuestion } from './knowledge-base';
import { WhiteboardComponent } from './whiteboard.component';
import { AiAssistantComponent } from './ai-assistant.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

type ViewMode = 'whiteboard' | 'study' | 'curriculum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, WhiteboardComponent, AiAssistantComponent, MatIconModule],
  template: `
    <div class="h-screen w-full flex overflow-hidden font-sans bg-slate-950 text-slate-200 relative">
      
      <!-- Ambient Background Gradients -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <!-- Left Sidebar (Glass Navigation) -->
      <aside class="w-20 lg:w-72 flex-shrink-0 flex flex-col glass-panel z-40 border-r border-white/5">
        <div class="p-6 border-b border-white/5">
          <h1 class="hidden lg:flex text-xl font-display font-extrabold text-gradient items-center gap-3">
             <mat-icon class="text-blue-400">architecture</mat-icon>
             SYSMASTER
          </h1>
          <div class="lg:hidden flex justify-center">
            <mat-icon class="text-blue-400">architecture</mat-icon>
          </div>
        </div>
        
        <div class="flex-1 flex flex-col p-4 space-y-4">
          <!-- Main Nav -->
          @for (nav of mainNav; track nav.id) {
            <button 
              (click)="viewMode.set(nav.id)"
              class="w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group relative"
              [class.bg-white/10]="viewMode() === nav.id"
              [class.text-white]="viewMode() === nav.id"
              [class.text-slate-400]="viewMode() !== nav.id"
              [class.hover:bg-white/5]="viewMode() !== nav.id"
            >
              <mat-icon [class.text-blue-400]="viewMode() === nav.id">{{nav.icon}}</mat-icon>
              <span class="hidden lg:block font-medium tracking-wide">{{nav.label}}</span>
              @if (viewMode() === nav.id) {
                <div class="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_15px_#3b82f6]"></div>
              }
            </button>
          }

          <div class="pt-6">
            <h3 class="hidden lg:block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-3">Quick Search</h3>
            <div class="relative px-2">
              <mat-icon class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</mat-icon>
              <input 
                type="text" 
                [value]="searchQuery()" 
                (input)="searchQuery.set($any($event).target.value)"
                placeholder="Topic..." 
                class="w-full glass-input pl-10 text-xs py-2.5"
              >
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto space-y-2 mt-4 custom-scrollbar">
            @if (viewMode() === 'whiteboard') {
              @for (scenario of filteredScenarios(); track scenario.id) {
                <button 
                  (click)="selectScenario(scenario)"
                  class="w-full text-left p-3 rounded-xl border border-transparent transition-all outline-none"
                  [class.bg-blue-600/20]="activeScenario()?.id === scenario.id"
                  [class.border-blue-500/30]="activeScenario()?.id === scenario.id"
                  [class.hover:bg-white/5]="activeScenario()?.id !== scenario.id"
                >
                  <div class="text-[11px] font-bold flex items-center gap-2"
                       [class.text-blue-400]="activeScenario()?.id === scenario.id"
                       [class.text-slate-200]="activeScenario()?.id !== scenario.id"
                  >
                    <mat-icon class="text-[14px] w-[14px] h-[14px]">psychology</mat-icon>
                    <span class="truncate">{{scenario.title}}</span>
                  </div>
                </button>
              }
            }
          </div>
        </div>

        <div class="p-6 border-t border-white/5 text-[10px] text-slate-500 font-mono">
           v2.1.0 &bull; OFFLINE READY
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 relative flex flex-col overflow-hidden">
        
        <!-- Top Bar -->
        <header class="h-16 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-md z-30">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-display font-semibold">{{ currentViewTitle() }}</h2>
            @if (activeScenario() && viewMode() === 'whiteboard') {
              <div class="flex items-center gap-2 ml-4">
                <span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-mono rounded border border-blue-500/20">CASE #{{activeScenario()?.id}}</span>
                <span class="text-xs text-slate-500 truncate max-w-[200px]">{{activeScenario()?.title}}</span>
              </div>
            }
          </div>
          
          <div class="flex items-center gap-4">
            @if (viewMode() === 'whiteboard' && activeScenario()) {
              <button (click)="toggleBook()" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/20">
                <mat-icon class="text-[18px]">menu_book</mat-icon>
                STUDY CASE
              </button>
            }
            <div class="h-8 w-[1px] bg-white/5"></div>
            <div class="flex -space-x-2">
              <div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-500 flex items-center justify-center text-[10px] font-bold">ME</div>
            </div>
          </div>
        </header>

        <!-- View Content -->
        <div class="flex-1 relative overflow-hidden">
          
          <!-- Whiteboard View -->
          @if (viewMode() === 'whiteboard') {
            <app-whiteboard class="w-full h-full block"></app-whiteboard>
          }

          <!-- Curriculum View -->
          @if (viewMode() === 'curriculum') {
            <div class="w-full h-full overflow-y-auto p-12 bg-slate-900/20">
               <div class="max-w-4xl mx-auto space-y-12">
                  <div class="flex flex-col gap-2">
                    <h1 class="text-5xl font-display font-black text-gradient">Masterclass Course</h1>
                    <p class="text-slate-400 text-lg">A structured journey from beginner to distributed systems expert.</p>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (scenario of SCENARIOS; track scenario.id) {
                      <div class="glass-card p-6 rounded-2xl group cursor-pointer" (click)="selectScenario(scenario); viewMode.set('whiteboard')">
                        <div class="flex justify-between items-start mb-4">
                          <span class="text-[10px] font-mono text-blue-400 uppercase tracking-widest">{{scenario.difficulty}}</span>
                          <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:scale-110 group-hover:text-white transition">
                            <mat-icon>arrow_forward</mat-icon>
                          </div>
                        </div>
                        <h3 class="text-xl font-bold mb-2">{{scenario.title}}</h3>
                        <p class="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">{{scenario.description}}</p>
                        <div class="flex flex-wrap gap-2">
                          @for (topic of scenario.key_topics?.slice(0, 3); track topic) {
                            <span class="text-[10px] px-2 py-1 bg-white/5 rounded-md text-slate-500">{{topic}}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <div class="p-8 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4">
                      <mat-icon class="text-[120px] w-full h-full leading-none">school</mat-icon>
                    </div>
                    <div class="relative z-10">
                      <h4 class="text-2xl font-bold mb-2">Fundamentals Library</h4>
                      <p class="text-blue-100/70 mb-6 max-w-md">Master the core building blocks of large-scale architecture.</p>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        @for (fnd of FUNDAMENTALS.slice(0, 4); track fnd.name) {
                          <div class="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/5 hover:bg-white/20 transition cursor-default">
                             <div class="font-bold text-white underline decoration-white/30">{{fnd.name}}</div>
                             <p class="text-[10px] text-blue-100 mt-1">{{fnd.definition}}</p>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          }

          <!-- Study Center View -->
          @if (viewMode() === 'study') {
            <div class="w-full h-full overflow-y-auto p-12 bg-slate-900/20">
               <div class="max-w-4xl mx-auto space-y-12">
                  <h1 class="text-5xl font-display font-black text-gradient">Study Center</h1>
                  
                  <!-- Flashcards Section -->
                  <section class="space-y-6">
                    <div class="flex items-center justify-between">
                      <h2 class="text-2xl font-bold flex items-center gap-2">
                        <mat-icon class="text-amber-400">style</mat-icon> Flashcards
                      </h2>
                      <div class="text-xs text-slate-500">{{flashcardIndex() + 1}} of {{FLASHCARDS.length}}</div>
                    </div>
                    
                    <div class="flex flex-col items-center gap-8">
                       <!-- Card -->
                       <div class="w-full max-w-lg aspect-video perspective-1000 group cursor-pointer" (click)="flipCard()">
                          <div class="relative w-full h-full transition-transform duration-700 transform-style-3d shadow-2xl" [class.rotate-y-180]="isFlipped()">
                             <!-- Front -->
                             <div class="absolute inset-0 backface-hidden glass-card rounded-3xl flex flex-col items-center justify-center p-12 overflow-hidden">
                                <div class="absolute top-4 left-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest">{{FLASHCARDS[flashcardIndex()].category}}</div>
                                <h3 class="text-3xl font-display font-bold text-center leading-tight">{{FLASHCARDS[flashcardIndex()].term}}</h3>
                                <div class="mt-8 text-xs text-blue-400 animate-pulse">Click to reflect</div>
                             </div>
                             <!-- Back -->
                             <div class="absolute inset-0 backface-hidden rotate-y-180 bg-blue-600 rounded-3xl flex flex-col items-center justify-center p-12 text-blue-50 overflow-hidden">
                                <p class="text-xl font-medium text-center leading-relaxed">{{FLASHCARDS[flashcardIndex()].definition}}</p>
                             </div>
                          </div>
                       </div>
                       
                       <div class="flex gap-4">
                          <button (click)="prevFlashcard()" class="p-3 glass-card rounded-full hover:bg-white/10 disabled:opacity-30" [disabled]="flashcardIndex() <= 0">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <button (click)="nextFlashcard()" class="p-3 glass-card rounded-full hover:bg-white/10 disabled:opacity-30" [disabled]="flashcardIndex() >= FLASHCARDS.length - 1">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                       </div>
                    </div>
                  </section>

                  <!-- Quiz Section -->
                  <section class="space-y-6 pt-12">
                    <h2 class="text-2xl font-bold flex items-center gap-2">
                      <mat-icon class="text-emerald-400">rebase_edit</mat-icon> Interactive Quiz
                    </h2>
                    
                    <div class="glass-panel p-8 rounded-3xl space-y-6 relative overflow-hidden">
                       @if (!quizFinished()) {
                         <div class="space-y-6">
                            <div class="flex justify-between items-center text-xs font-mono">
                               <span class="text-emerald-400">QUESTION {{quizIndex() + 1}} / {{QUIZZES.length}}</span>
                               <span class="text-slate-500">SCORE: {{quizScore()}}</span>
                            </div>
                            <h3 class="text-xl font-medium leading-relaxed">{{QUIZZES[quizIndex()].question}}</h3>
                            
                            <div class="grid grid-cols-1 gap-3">
                               @for (option of QUIZZES[quizIndex()].options; track option; let idx = $index) {
                                 <button 
                                   (click)="selectOption(idx)"
                                   [disabled]="optionSelected() !== null"
                                   class="w-full text-left p-4 rounded-xl border border-white/5 transition-all outline-none flex items-center gap-3"
                                   [class.bg-white/5]="optionSelected() === null"
                                   [class.border-emerald-500/50]="optionSelected() !== null && idx === QUIZZES[quizIndex()].correctAnswer"
                                   [class.bg-emerald-500/10]="optionSelected() !== null && idx === QUIZZES[quizIndex()].correctAnswer"
                                   [class.border-rose-500/50]="optionSelected() === idx && idx !== QUIZZES[quizIndex()].correctAnswer"
                                   [class.bg-rose-500/10]="optionSelected() === idx && idx !== QUIZZES[quizIndex()].correctAnswer"
                                 >
                                    <div class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-mono shrink-0">
                                      {{ ['A', 'B', 'C', 'D'][idx] }}
                                    </div>
                                    <span>{{option}}</span>
                                    @if (optionSelected() !== null && idx === QUIZZES[quizIndex()].correctAnswer) {
                                      <mat-icon class="ml-auto text-emerald-500">check_circle</mat-icon>
                                    }
                                 </button>
                               }
                            </div>
                            
                            @if (optionSelected() !== null) {
                               <div class="p-4 bg-white/5 rounded-xl text-xs text-slate-400 italic animate-in fade-in slide-in-from-top-2">
                                  <strong>Explanation:</strong> {{QUIZZES[quizIndex()].explanation}}
                               </div>
                               <button (click)="nextQuiz()" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all">
                                  {{ quizIndex() === QUIZZES.length - 1 ? 'FINISH QUIZ' : 'NEXT QUESTION' }}
                               </button>
                            }
                         </div>
                       } @else {
                         <div class="py-12 flex flex-col items-center justify-center text-center space-y-6">
                            <mat-icon class="text-[80px] w-auto h-auto text-amber-400 animate-bounce">emoji_events</mat-icon>
                            <h3 class="text-3xl font-display font-black text-gradient">Quiz Complete!</h3>
                            <p class="text-slate-400">You scored <strong>{{quizScore()}} / {{QUIZZES.length}}</strong></p>
                            <button (click)="resetQuiz()" class="px-8 py-3 bg-white text-slate-950 font-bold rounded-full hover:bg-slate-200 transition shadow-xl">RETRIED</button>
                         </div>
                       }
                    </div>
                  </section>
               </div>
            </div>
          }
        </div>

        <!-- Book Mode Overlay (Over whiteboard) -->
        @if (bookMode() && activeScenario() && viewMode() === 'whiteboard') {
          <div class="absolute inset-8 z-50 flex items-stretch glass-panel border border-white/20 rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
             <div class="flex-1 flex text-slate-100 relative">
               
               <button (click)="bookMode.set(false)" class="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition z-60 rounded-full hover:bg-white/10">
                  <mat-icon>close</mat-icon>
               </button>

               <div class="flex-1 p-12 overflow-y-auto custom-scrollbar border-r border-white/5">
                  <div class="max-w-xl mx-auto space-y-10">
                     <div class="space-y-4">
                       <p class="text-[10px] font-mono tracking-[0.3em] uppercase text-blue-400 font-bold animate-float inline-block px-3 py-1 bg-blue-500/10 rounded-full">DESIGN BRIEF &bull; {{activeScenario()?.difficulty}}</p>
                       <h2 class="text-5xl font-display font-extrabold tracking-tight leading-none text-gradient">{{activeScenario()?.title}}</h2>
                       <p class="text-xl text-slate-400 italic leading-relaxed border-l-4 border-blue-600 pl-6">"{{activeScenario()?.description}}"</p>
                     </div>
                     
                     <div class="space-y-6 pt-6">
                       <h3 class="text-2xl font-bold flex items-center gap-3 border-b border-white/5 pb-4">
                         <mat-icon class="text-blue-500">insights</mat-icon> Logical Architecture
                       </h3>
                       <p class="text-[15px] text-slate-300 leading-relaxed text-justify">{{activeScenario()?.theory}}</p>
                     </div>

                     <div class="space-y-6 pt-6">
                       <h3 class="text-2xl font-bold flex items-center gap-3 border-b border-white/5 pb-4">
                         <mat-icon class="text-emerald-500">layers</mat-icon> Critical Building Blocks
                       </h3>
                       <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         @for (comp of activeScenario()?.components; track comp) {
                           <div class="p-4 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3">
                              <mat-icon class="text-emerald-400 text-[18px] w-[18px] h-[18px] mt-0.5">verified</mat-icon>
                              <span class="text-[13px] text-slate-200">{{comp}}</span>
                           </div>
                         }
                       </div>
                     </div>

                     @if (activeScenario()?.deep_dive) {
                        <div class="p-8 rounded-3xl bg-linear-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-400/20 shadow-2xl">
                          <h3 class="text-xl font-bold flex items-center gap-3 mb-4">
                             <mat-icon class="text-indigo-400">psychology</mat-icon> Advanced Analysis
                          </h3>
                          <p class="text-sm text-indigo-100/80 leading-relaxed italic">{{activeScenario()?.deep_dive}}</p>
                        </div>
                     }
                  </div>
               </div>

               <div class="flex-1 p-12 overflow-y-auto custom-scrollbar bg-slate-950/30">
                  <div class="max-w-xl mx-auto space-y-10">
                     <div class="space-y-6">
                       <h3 class="text-2xl font-bold flex items-center gap-3 border-b border-white/5 pb-4">
                         <mat-icon class="text-rose-500">dangerous</mat-icon> Failure Modes & Bottlenecks
                       </h3>
                       <div class="space-y-4">
                          @for (bot of activeScenario()?.bottlenecks; track bot) {
                            <div class="flex items-start gap-4 p-4 glass-card rounded-2xl border-rose-500/10">
                               <div class="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                                 <mat-icon class="text-[14px]">priority_high</mat-icon>
                               </div>
                               <span class="text-sm text-slate-300 leading-relaxed">{{bot}}</span>
                            </div>
                          }
                       </div>
                     </div>

                     <div class="space-y-6 pt-6">
                       <div class="flex items-center justify-between border-b border-white/5 pb-4">
                          <h3 class="text-2xl font-bold flex items-center gap-3">
                            <mat-icon class="text-amber-500">polyline</mat-icon> Implementation Blueprint
                          </h3>
                       </div>
                       <div class="glass-panel p-6 rounded-2xl text-slate-300 text-[14px] leading-relaxed border-amber-500/20 font-mono italic">
                         {{activeScenario()?.diagramHints}}
                       </div>
                       
                       <div class="mt-12 flex justify-center pt-8">
                          <button (click)="bookMode.set(false)" class="group relative px-10 py-4 bg-white text-slate-950 rounded-full font-bold text-sm tracking-widest shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden uppercase">
                             <span class="relative z-10">GENERATE BLUEPRINT</span>
                             <div class="absolute inset-0 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></div>
                             <span class="absolute inset-0 z-20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">LET'S DRAW</span>
                          </button>
                       </div>
                     </div>
                  </div>
               </div>
             </div>
          </div>
        }

      </main>

      <!-- Right Sidebar (AI Assistant) -->
      <app-ai-assistant class="shrink-0 z-40 lg:w-96 glass-panel border-l border-white/5"></app-ai-assistant>

    </div>
  `,
  styles: [`
    :host { display: block; }
    .perspective-1000 { perspective: 1000px; }
    .transform-style-3d { transform-style: preserve-3d; }
    .backface-hidden { backface-visibility: hidden; }
    .rotate-y-180 { transform: rotateY(180deg); }
    .rotate-x-180 { transform: rotateX(180deg); }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
  `]
})
export class App {
  viewMode = signal<ViewMode>('curriculum');
  searchQuery = signal('');
  activeScenario = signal<SystemDesignScenario | null>(null);
  bookMode = signal<boolean>(false);
  
  // Study State
  flashcardIndex = signal(0);
  isFlipped = signal(false);
  
  quizIndex = signal(0);
  quizScore = signal(0);
  optionSelected = signal<number | null>(null);
  quizFinished = signal(false);

  SCENARIOS = SCENARIOS;
  FUNDAMENTALS = FUNDAMENTALS;
  FLASHCARDS = FLASHCARDS;
  QUIZZES = QUIZZES;

  mainNav: { id: ViewMode, label: string, icon: string }[] = [
    { id: 'curriculum', label: 'Masterclass', icon: 'school' },
    { id: 'whiteboard', label: 'Whiteboard', icon: 'auto_fix_high' },
    { id: 'study', label: 'Study Center', icon: 'bolt' },
  ];

  currentViewTitle = computed(() => {
    const mode = this.viewMode();
    if (mode === 'curriculum') return 'Course Path';
    if (mode === 'whiteboard') return 'Architecture Lab';
    if (mode === 'study') return 'Study Center';
    return '';
  });

  filteredScenarios = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return SCENARIOS;
    return SCENARIOS.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.description.toLowerCase().includes(query) ||
      s.key_topics?.some(t => t.toLowerCase().includes(query))
    );
  });

  selectScenario(scenario: SystemDesignScenario) {
    this.activeScenario.set(scenario);
    this.bookMode.set(false);
  }

  toggleBook() {
    this.bookMode.set(!this.bookMode());
  }

  // Flashcards
  flipCard() { this.isFlipped.set(!this.isFlipped()); }
  nextFlashcard() {
    this.isFlipped.set(false);
    this.flashcardIndex.update(i => i + 1);
  }
  prevFlashcard() {
    this.isFlipped.set(false);
    this.flashcardIndex.update(i => i - 1);
  }

  // Quiz
  selectOption(idx: number) {
    this.optionSelected.set(idx);
    if (idx === QUIZZES[this.quizIndex()].correctAnswer) {
      this.quizScore.update(s => s + 1);
    }
  }
  nextQuiz() {
    if (this.quizIndex() < QUIZZES.length - 1) {
      this.quizIndex.update(i => i + 1);
      this.optionSelected.set(null);
    } else {
      this.quizFinished.set(true);
    }
  }
  resetQuiz() {
    this.quizIndex.set(0);
    this.quizScore.set(0);
    this.optionSelected.set(null);
    this.quizFinished.set(false);
  }
}
