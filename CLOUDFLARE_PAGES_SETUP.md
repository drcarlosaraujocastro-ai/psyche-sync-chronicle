# PsicoNorte — Cloudflare Pages sem IA externa

Build command: `npm run build`
Output directory: `dist`
Root directory: vazio se `package.json` está na raiz.

Variáveis obrigatórias:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Remova `bun.lockb` do repositório. Use `package-lock.json` + npm.
