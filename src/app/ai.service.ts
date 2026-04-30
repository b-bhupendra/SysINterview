import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { SCENARIOS } from './knowledge-base';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
}

export interface LmStudioConfig {
  enabled: boolean;
  endpoint: string;
  model: string;
  temperature: number;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  isOfflineMode = signal(false);

  lmConfig = signal<LmStudioConfig>({
    enabled: false,
    endpoint: 'http://localhost:1234/v1/chat/completions',
    model: 'local-model',
    temperature: 0.7
  });

  availableModels = signal<string[]>([]);

  messages = signal<ChatMessage[]>([]);
  isProcessing = signal(false);

  private getOfflineResponse(message: string, scenarioId?: string): string {
    const text = message.toLowerCase();
    
    // Fallback/Generic Offline Matching
    if (!scenarioId) {
      if (text.includes('hi') || text.includes('hello')) {
        return "Hello! I am your Offline System Design Assistant. You can ask me to 'explain theory', 'list components', or 'show bottlenecks' if you select a scenario. Or you can configure LM Studio in the AI Settings.";
      }
      if (text.includes('scale')) {
        return "For scaling, consider horizontal scaling with load balancers and sharding databases.";
      }
      return `[OFFLINE MODE] You asked: "${message}". Select a scenario from the sidebar and ask me to 'explain theory', or configure LM Studio if you have a local server running.`;
    }

    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      return `[OFFLINE MODE] Unknown scenario selected.`;
    }

    if (text.includes('theory') || text.includes('explain') || text.includes('summary')) {
      return `**Theory for ${scenario.title}**\n\n${scenario.theory || 'No detailed theory available offline.'}\n\n*Would you like to know the main components or bottlenecks?*`;
    }
    
    if (text.includes('component') || text.includes('architecture') || text.includes('high-level')) {
      if (scenario.components && scenario.components.length > 0) {
        return `**Main Components for ${scenario.title}:**\n\n` + scenario.components.map(c => `- ${c}`).join('\n');
      }
      return 'No specific components listed offline for this scenario.';
    }

    if (text.includes('bottleneck') || text.includes('tradeoff') || text.includes('issue')) {
      if (scenario.bottlenecks && scenario.bottlenecks.length > 0) {
        return `**Bottlenecks & Tradeoffs:**\n\n` + scenario.bottlenecks.map(b => `- ${b}`).join('\n');
      }
      return 'No specific bottlenecks listed offline for this scenario.';
    }

    if (text.includes('diagram') || text.includes('draw') || text.includes('whiteboard') || text.includes('hint')) {
      return `**Diagram Hints:**\n\n${scenario.diagramHints || 'Draw a standard 3-tier web architecture: Load Balancer -> Web Servers -> Cache/Database.'}`;
    }

    return `[OFFLINE MODE] Scenario: ${scenario.title}.\n\nI am currently offline. You can ask me to:\n- Explain the theory\n- List the components\n- Discuss the bottlenecks\n- Give diagram hints\n\nAlternatively, switch to Gemini AI or connect to a local LM Studio server in the settings.`;
  }

  async fetchLmStudioModels(endpoint: string) {
    try {
      const modelsEndpoint = endpoint.replace('/chat/completions', '/models');
      const res = await fetch(modelsEndpoint);
      if (res.ok) {
        const data = await res.json();
        const models = data.data.map((m: any) => m.id);
        this.availableModels.set(models);
        if (models.length > 0 && !models.includes(this.lmConfig().model)) {
          this.lmConfig.update(c => ({...c, model: models[0]}));
        }
        return true;
      }
    } catch {
      this.availableModels.set([]);
    }
    return false;
  }

  async checkLmStudio(endpoint: string): Promise<boolean> {
    try {
      const modelsEndpoint = endpoint.replace('/chat/completions', '/models');
      const res = await fetch(modelsEndpoint);
      return res.ok;
    } catch {
      return false;
    }
  }

  async sendMessage(message: string, context?: string, scenarioId?: string) {
    this.messages.update(m => [...m, { role: 'user', text: message }]);
    this.isProcessing.set(true);

    const useLmStudio = this.lmConfig().enabled;

    if (!useLmStudio && this.isOfflineMode()) {
      setTimeout(() => {
        const reply = this.getOfflineResponse(message, scenarioId);
        this.messages.update(m => [...m, { role: 'assistant', text: reply }]);
        this.isProcessing.set(false);
      }, 1000);
      return;
    }

    try {
      const prompt = context 
        ? `Scenario Context: ${context}\n\nUser: ${message}\n\nPlease act as a system design interviewer and assistant. Keep answers concise, and focus on scalable systems concepts.`
        : message;

      if (useLmStudio) {
        const res = await fetch(this.lmConfig().endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.lmConfig().model,
            messages: [
              { role: 'system', content: 'You are an expert system design interviewer.' },
              { role: 'user', content: prompt }
            ],
            temperature: this.lmConfig().temperature
          })
        });
        const data = await res.json();
        const reply = data.choices[0].message.content;
        this.messages.update(m => [...m, { role: 'assistant', text: reply }]);
      } else {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        this.messages.update(m => [...m, { role: 'assistant', text: response.text || 'No response.' }]);
      }
    } catch (e: unknown) {
      this.messages.update(m => [...m, { role: 'assistant', text: `[Error] ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      this.isProcessing.set(false);
    }
  }

  clearChat() {
    this.messages.set([]);
  }
}

