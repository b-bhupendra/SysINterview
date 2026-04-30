import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  isOfflineMode = signal(false);
  messages = signal<ChatMessage[]>([]);
  isProcessing = signal(false);

  private getOfflineResponse(message: string): string {
    const text = message.toLowerCase();
    
    // Pattern matching to simulate an offline LLM specifically testing system design principles
    if (text.includes('hi') || text.includes('hello')) {
      return "Hello! I am your System Design Interview Assistant. I can operate in offline (mock) mode or online (Gemini). How can I help you structuralize your system?";
    }
    
    if (text.includes('scale') || text.includes('scaling')) {
      return "Since we expect huge growth, horizontal scaling is preferable. We can add more application servers and load balancers. For databases, consider sharding based on a unique identifier (like UserID) combined with consistent hashing to prevent hotspots.";
    }
    
    if (text.includes('database') || text.includes('db') || text.includes('sql')) {
      return "For the database, relational databases (SQL) give ACID guarantees but can be hard to scale horizontally. NoSQL (like Cassandra, MongoDB) offers high availability and easier horizontal scaling, but might sacrifice immediate consistency (eventual consistency). What does this scenario prioritize?";
    }

    if (text.includes('cache') || text.includes('caching') || text.includes('redis') || text.includes('memcached')) {
      return "Caching is vital for read-heavy systems. We can use Memcached or Redis. A common strategy is to use caching with a Least Recently Used (LRU) eviction policy. Remember the 80-20 rule - 20% of the content generates 80% of the traffic.";
    }
    
    if (text.includes('rate') || text.includes('limiter')) {
      return "For a rate limiter, consider using the Sliding Window with Counters algorithm. It mixes the memory efficiency of fixed windows with the accuracy of sliding windows. Using a Redis hash to store timestamps and counters works very well in a distributed environment.";
    }

    if (text.includes('real-time') || text.includes('websocket') || text.includes('message')) {
      return "To achieve a real-time experience with minimum latency, we can use WebSockets or HTTP Long-Polling. WebSockets form a full-duplex communication channel and are mostly preferred over long-polling to reduce HTTP overhead.";
    }
    
    // Default fallback mock
    return `[OFFLINE MODE] You asked: "${message}". Consider breaking the problem into: 1. Requirements & Scaling Limits, 2. API Design, 3. Database Schema, 4. High-Level Design, 5. Bottlenecks & Caching. Are you considering tradeoffs carefully?`;
  }

  async sendMessage(message: string, context?: string) {
    this.messages.update(m => [...m, { role: 'user', text: message }]);
    this.isProcessing.set(true);

    if (this.isOfflineMode()) {
      // Simulate delay
      setTimeout(() => {
        const reply = this.getOfflineResponse(message);
        this.messages.update(m => [...m, { role: 'assistant', text: reply }]);
        this.isProcessing.set(false);
      }, 1000);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const prompt = context 
        ? `Scenario Context: ${context}\n\nUser:${message}\n\nPlease act as a system design interviewer and assistant. Keep answers concise, and focus on scalable systems concepts.`
        : message;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      this.messages.update(m => [...m, { role: 'assistant', text: response.text || 'No response.' }]);
    } catch (e: unknown) {
      this.messages.update(m => [...m, { role: 'assistant', text: `[Error via API] ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      this.isProcessing.set(false);
    }
  }

  clearChat() {
    this.messages.set([]);
  }
}
