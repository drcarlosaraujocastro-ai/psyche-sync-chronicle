# Atualização limpa no Lovable/GitHub

Este pacote remove IA externa/Gemini e mantém somente inteligência clínica local.

Se você vinha fazendo upload por cima de versões antigas, apague do repositório os arquivos antigos abaixo, porque upload pelo navegador NÃO remove arquivos que não existem mais no ZIP:

- bun.lockb
- api/
- netlify/functions/
- supabase/functions/clinical-ai-analyze/
- supabase/functions/clinical-ai-health/
- src/lib/ai/
- src/components/clinical/ClinicalAIPanel.tsx
- src/components/clinical/ClinicalAIResultViewer.tsx
- src/components/clinical/ClinicalAIStatusPanel.tsx
- src/components/clinical/ClinicalAIKeyManager.tsx
- src/pages/ClinicalAI.tsx
- src/pages/ClinicalAIHistory.tsx
- GEMINI_SETUP.md
- AI_MULTI_PLATFORM_SETUP.md
- NETLIFY_SETUP.md

Depois suba os arquivos deste pacote na raiz do repositório.
Build command recomendado: npm ci && npm run build
Output: dist
