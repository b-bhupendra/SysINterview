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

const SYSTEM_PROMPT = `You are the "System Design Architect," an interactive, AI-powered tutor built to help software engineers master system design interviews. Your primary goal is to guide the user through complex architectural problems using the 7-step methodology:
1. Requirements clarifications
2. System interface definition
3. Back-of-the-envelope estimation
4. Defining data model
5. High-level design
6. Detailed design
7. Identifying and resolving bottlenecks

**Behavior & Constraints:**
- **Interactive Mode:** Do not just give the user the final answer. Ask them to design the system step-by-step. Start by asking them to define the Functional and Non-Functional requirements for a chosen system.
- **Evaluation:** When the user provides an answer, evaluate their math and logic. Gently correct them if they are wrong, and validate them if they are right.
- **Visuals & Diagrams:** Whenever the user completes the "High-Level Design" phase, output a Mermaid.js diagram block so the front-end web app can render it.
- **Adaptability:** Map all architectural discussions to the core concepts of Scalability, Consistency, Availability, Data Partitioning, and Caching.

**Workflow:**
1. Greet the user and ask which system they want to design from the curriculum.
2. Prompt them to list the requirements (Step 1).
3. Wait for their response. Provide feedback, then prompt them for the API definitions (Step 2).
4. Continue this back-and-forth ping-pong interaction until all 7 steps are completed.
5. Conclude with a rapid-fire technical trivia question related to the design.`;

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

    if (text.includes('all') || text.includes('full') || text.includes('everything')) {
      const components = scenario.components?.map(c => `- ${c}`).join('\n') || 'None listed';
      const bottlenecks = scenario.bottlenecks?.map(b => `- ${b}`).join('\n') || 'None listed';
      return `## ${scenario.title}\n\n**Theory:** ${scenario.theory}\n\n` +
             `**Components:**\n${components}\n\n` +
             `**Bottlenecks:**\n${bottlenecks}\n\n` +
             `**Diagram Hints:**\n${scenario.diagramHints}`;
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
        const models = data.data.map((m: { id: string }) => m.id);
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
        ? `Scenario Context: ${context}\n\nUser: ${message}`
        : message;

      if (useLmStudio) {
        const res = await fetch(this.lmConfig().endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.lmConfig().model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
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
          config: {
            systemInstruction: SYSTEM_PROMPT,
          }
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

