<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VUnzpjIWariesh7t580-uVEEKiCvkSbW

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set your Groq key in [.env.local](.env.local):
   - `GROQ_API_KEY=...`
   - Optional: `GROQ_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct`
   (Backward compatibility: `XAI_API_KEY`, `GROK_API_KEY`, or `GEMINI_API_KEY` are also accepted.)
3. Run the app (single server):
   `npm run dev`
