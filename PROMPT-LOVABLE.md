# PROMPT PARA A LOVABLE - Upper Agency Sistema

Copie o texto abaixo e cole como primeiro prompt em um projeto NOVO na Lovable. Depois suba a pasta `imagens/` no mesmo projeto.

---

Crie o Upper Agency Sistema, um sistema web de gestão empresarial, em português (pt-BR), visual escuro estilo Power BI, fundo preto puro. Apenas gestão, sem aba de conteúdo, sem criação de posts.

## Estrutura - menu lateral nesta ordem exata
Dashboard, CRM, Clientes, Projetos, Mentorados, Financeiro, Empresas, Contabilidade. No rodapé da lateral: Caixa de Entrada (só ícone, com selo de não lidas) e Configurações. No celular, o menu vira uma grade dentro do conteúdo, abaixo do cabeçalho, porque barra fixa embaixo fica escondida.

## Login e assinatura (eu vou configurar depois, deixe pronto)
Login individual com e-mail e senha usando Supabase Auth. Cada usuário só vê os próprios dados. Nada de dados de exemplo. Tela de login, cadastro, esqueci a senha. Depois vou ligar o Stripe para mensalidade, deixe um campo de status da assinatura no perfil do usuário (ativo, vencido) e bloqueie o acesso quando estiver vencido.

## Regras importantes
- Nunca invente clientes, valores ou dados. Comece com os dados reais dos arquivos CSV em `dados/`.
- Nunca use R$ como padrão. Valores seguem a moeda escolhida em cada lançamento. São 20 moedas.
- Nunca apague nem modifique dados já lançados ao fazer uma alteração. Mudança vale só para os próximos cadastros.
- Sem travessão nos textos. Use vírgula.

## Dashboard
Abertura padrão em Últimos 30 dias, com opções de 60 e 90 dias e Por ano. Cards: Receita do mês (só o que já foi pago), Saldo do mês (receita recebida no mês menos despesas pagas no mês), A receber neste mês, A receber total. Gráficos: Vendas totais por mês (área crescente), Receitas x Despesas, Novos clientes, pizza Situação das receitas (recebido, pendente, vencido). Boards: Receita por empresa (mostrar TODAS as empresas cadastradas, mesmo sem lançamento), Previsão de recebimentos em 30, 60 e 90 dias, Funil de vendas, Ticket médio e inadimplência, Meta do mês vs realizado (3 velocímetros em uma board preta só, com botão Editar dentro). Filtros curtos nesta ordem: País, Empresa, Moeda, Situação. Sem botão Todos ou Todas.

## CRM
Kanban com colunas lado a lado, sem barra de rolagem visível, o resto se vê arrastando para o lado com o dedo ou o mouse. Etapas: lead, negociação, fechado, sem interesse, follow-up. Cada lead tem origem e data de retorno de contato.

## Clientes
Ficha só pessoal: nome, contato, endereço, empresa, país. Sem valor, sem serviço contratado, sem evolução no cadastro. Cliente novo sempre entra em Ativos e só muda de etapa arrastando o cartão para Pausados ou Encerrados. Compras são lançadas no Financeiro, vinculadas ao cliente. Anexos PDF ou PNG por cliente.

## Financeiro
Lançamentos de receita e despesa com cliente, empresa, moeda, vencimento, parcelas e recorrência. Parcelas lançam uma entrada por mês. Ao marcar como pago, gravar a data da baixa no histórico. Separar Pendentes neste mês de Pendentes geral. Exportar em Excel.

## Empresas
Cadastro de empresa: nome, razão social, CNPJ, segmento, contatos, logo. As 4 empresas reais são: NEXO (NEXO GROUP, Consultoria e Vendas), UPPER BR (UPPER AGENCY COMPANY BRASIL, Marketing), UPPER US (UPPER AGENCY COMPANY EUA, Marketing), OLIARIS (OLIARIS FINE JEWELRY, Ouro). Renomear uma empresa atualiza o nome em clientes, leads e lançamentos. Logo em `imagens/logo-nexo.png` para NEXO e `imagens/Oliaris_Logo.pdf` para OLIARIS.

## Mentorados
Sessão puxa o nome dos clientes cadastrados, com tema, data que fechou, data da mentoria, resumo do que foi trabalhado, próximo passo combinado e data para entrar em contato e verificar se executou.

## Contabilidade
Checklist do MEI editável: DAS mensal, relatório de receitas, DASN-SIMEI anual e outras obrigações, cada uma com data real de vencimento editável. Valores em reais, porque DAS e teto do MEI são em reais. Chat do contador dentro da aba, respondendo só sobre fiscal e MEI.

## Caixa de Entrada
Avisar tudo 7 dias antes, 3 dias antes, no dia e enquanto estiver vencido: renovação de cliente, financeiro a receber e a pagar, obrigações da Contabilidade, prazos de projetos, data de contato das mentorias. Filtros Não lidas e Lidas. Só sai da contagem de não lidas quando marcado com check.

## Configurações
Idioma (só a sigla PT, EN, ES), tema (Escuro, Claro, Automático), fonte, e aba Exportar (Excel de clientes e despesas, PDF de clientes com nome da empresa, CNPJ e logo no cabeçalho).

## Banco de dados (Supabase)
Tabelas em `dados/schema-supabase.sql`. Importe os CSVs em `dados/` para começar com os dados reais: 4 empresas, 13 clientes, 130 lançamentos financeiros, 1 lead, 4 obrigações de contabilidade.
