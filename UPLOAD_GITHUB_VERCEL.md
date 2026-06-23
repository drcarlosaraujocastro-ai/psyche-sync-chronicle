# Como aplicar este ZIP no GitHub/Vercel sem quebrar

## Regra central
Não faça upload do arquivo `.zip` para dentro do repositório. Extraia o ZIP e envie os arquivos soltos por cima do projeto.

Estrutura correta no GitHub:

```text
seu-repo/
  src/
  supabase/
  package.json
  vite.config.ts
  index.html
```

Estrutura errada:

```text
seu-repo/
  psiconorte_curve_interaction_full_upgrade.zip
```

ou:

```text
seu-repo/
  psyche-sync-chronicle-main/
    src/
```

## Opção A — GitHub Desktop, recomendado
1. Instale GitHub Desktop.
2. Clone o repositório do app.
3. Extraia este ZIP.
4. Entre na pasta extraída `psyche-sync-chronicle-main`.
5. Copie o conteúdo de dentro dela para a pasta local do repositório, substituindo os arquivos antigos.
6. Abra GitHub Desktop.
7. Revise as mudanças.
8. Commit message: `integrated clinical intelligence upgrade`.
9. Clique `Push origin`.
10. A Vercel deve fazer deploy automático.

## Opção B — navegador do GitHub
1. Extraia o ZIP.
2. Entre na pasta `psyche-sync-chronicle-main`.
3. No GitHub, abra o repositório.
4. Clique `Add file` → `Upload files`.
5. Arraste `src`, `supabase`, `package.json`, `vite.config.ts`, `index.html` e demais arquivos da raiz.
6. Não arraste a pasta externa inteira.
7. Commit direto na branch `main` se sua Vercel usa `main`.

## Como confirmar se subiu certo
No GitHub, os arquivos precisam existir exatamente nestes caminhos:

```text
src/components/clinical/IntegratedClinicalConsole.tsx
src/domain/clinicalIntelligenceEngine.ts
src/components/clinical/AdvancedCurveExplorer.tsx
src/components/clinical/DoseLogManager.tsx
src/pages/ClinicalIntelligence.tsx
src/domain/interactionEngine.ts
```

## Vercel
Se a Vercel está conectada ao GitHub, normalmente não precisa fazer nada: cada `push` na branch configurada faz deploy.

Se não atualizar:
- Vercel → Project → Deployments → Redeploy
- ou faça um novo commit vazio.

## Supabase
Esta versão não exige nova migration obrigatória além das tabelas já criadas. Se usar sincronização de knowledge base, garanta a tabela:

```text
pharmacology_knowledge_templates
```

O SQL está em migrations anteriores ou pode ser rodado pelo painel Supabase se a tela avisar.
