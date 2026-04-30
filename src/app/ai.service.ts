import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

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

  messages = signal<ChatMessage[]>([]);
  isProcessing = signal(false);

  private getOfflineResponse(message: string): string {
    const text = message.toLowerCase();
    if (text.includes('hi') || text.includes('hello')) {
      return "Hello! I am your Offline System Design Assistant. You can configure LM Studio to use a local LLM in the settings, or toggle back to Gemini AI.";
    }
    if (text.includes('scale')) {
      return "For scaling, consider horizontal scaling with load balancers and sharding databases.";
    }
    return `[OFFLINE MODE] You asked: "${message}". Configure LM Studio if you have a local server running.`;
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

  async sendMessage(message: string, context?: string) {
    this.messages.update(m => [...m, { role: 'user', text: message }]);
    this.isProcessing.set(true);

    const useLmStudio = this.lmConfig().enabled;

    if (!useLmStudio && this.isOfflineMode()) {
      setTimeout(() => {
        const reply = this.getOfflineResponse(message);
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

