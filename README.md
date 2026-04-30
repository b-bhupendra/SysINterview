# SysDes Board - System Design Whiteboard & Copilot

SysDes Board is a specialized whiteboard application built to help developers structure, practice, and evaluate system design interviews. It features an integrated knowledge base of classic system design scenarios and a versatile AI copilot to guide you through your architecture decisions.

## 🚀 Features

*   **Interactive Whiteboard:** Infinite drawing canvas with pens, shapes, lines, and text tools to draft system architectures.
*   **Knowledge Base:** Built-in guidance for standard system design patterns (e.g., URL Shortener, Newsfeed, Chat App, Ride Hailing).
*   **Versatile AI Copilot:** Ask questions and get feedback on your designs. The AI can run entirely locally, connect to the cloud, or operate in a disconnected fallback mode.

## 🧠 AI Support Modes

The application is built to be resilient and privacy-conscious, offering three distinct modes for the AI Copilot. You can toggle between these modes using the **Settings (gear icon)** or the cloud toggle icon in the AI Copilot sidebar.

### 1. Online Mode (Gemini AI)
By default, if you have internet access and an API key configured, the app uses Google's Gemini AI to provide deep, context-aware feedback on your system design questions.
*   **Setup:** Make sure the `GEMINI_API_KEY` is provided in your environment variables.

### 2. Local Desktop Mode (LM Studio)
Want to keep your interview prep entirely private without sending data to the cloud? You can connect the app to a local LLM running on your machine via [LM Studio](https://lmstudio.ai/).
*   **Setup:**
    1. Download and open LM Studio.
    2. Load your preferred model (e.g., Llama 3, Mistral, etc.).
    3. Start the Local Server in LM Studio (typically runs on `http://localhost:1234/v1/chat/completions`).
    4. **Important:** Ensure CORS is enabled in LM Studio's server settings.
    5. In the SysDes Board app, open the AI Settings, toggle **Enable Local LLM**, and verify the endpoint and model name.
    6. Click **Test Connection** to ensure the app can talk to your local model.

### 3. Offline / Fallback Mode
No internet? No local LLM running? No problem.
If you toggle to **Offline Mode** (or if external AI services are unavailable), the app falls back to a built-in, heuristic-based offline assistant.
*   **How it works:** The offline assistant scans your inputs for system design keywords (like *scale*, *database*, *cache*, *rate limiter*, *real-time*) and provides deterministic, best-practice advice derived from the offline knowledge base.
*   It ensures you are never left completely without guidance, even on an airplane or a disconnected environment.

## 🛠️ How to deploy and run

### Local Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run start
   ```
4. Open the provided `http://localhost:3000` URL in your browser.

### Deploying to Vercel
This is a standard Angular application. You can easily deploy it to Vercel:
1. Push your code to a GitHub repository.
2. Import the project in Vercel.
3. Vercel will automatically detect the Angular framework and configure the build command (`npm run build`) and output directory (`dist/app/browser` or `dist/` depending on the build configuration).
4. Add your `GEMINI_API_KEY` to the Vercel Environment Variables if you wish to use the Online Mode in production.
