# Upper Agency Sistema - Pacote Lovable

Apenas o sistema de gestão, sem Conteúdo Nexo.

O que é este zip: não é o código do Muse, o Muse não libera o código do sistema. É o pacote para recriar o sistema na Lovable, com o visual, as telas, os dados reais e as imagens.

## O que tem dentro
- `PROMPT-LOVABLE.md`: o texto para colar no primeiro prompt da Lovable, nome Upper Agency Sistema.
- `dados/backup-2026-11-11.json`: backup completo do sistema em 11/11/2026, com 4 empresas, 13 clientes, 130 lançamentos financeiros, 1 lead e 4 obrigações de contabilidade.
- `dados/*.csv`: os mesmos dados em planilhas, prontos para importar no Supabase.
- `dados/schema-supabase.sql`: as tabelas para criar no Supabase.
- `imagens/logo-nexo.png`: logo da NEXO.
- `imagens/Oliaris_Logo.pdf`: logo da OLIARIS.

## Passo a passo na Lovable
1. Crie um projeto NOVO na Lovable.
2. Suba a pasta `imagens/` no projeto.
3. Cole o texto de `PROMPT-LOVABLE.md` como primeiro prompt.
4. Conecte o Supabase na Lovable e rode o `schema-supabase.sql` no SQL Editor.
5. Importe os CSVs da pasta `dados/` no Supabase.
6. Ative o Supabase Auth para login individual com e-mail e senha.
7. Conecte o Stripe para a mensalidade, com bloqueio quando vencer.

## Sobre as imagens
As logos da UPPER BR e da UPPER US ficam dentro do Muse e não dá para baixar de lá. Suba os arquivos originais da logo da Upper que você já tem no computador.
