# Etiquetas, Drive no cliente e equipe por empresa

## 1. Etiquetas (Projetos, CRM, Clientes, Financeiro)
- Cadastro de etiquetas com nome e cor (em Configurações e também "+ Nova etiqueta" direto no campo).
- Cada etiqueta pode ser usada nas 4 áreas; cada item pode ter várias.
- Aparecem como selos coloridos nos cards, listas e planilhas, e viram filtro em cada tela.

## 2. Drive no cliente
- Campo "Link da pasta do Drive" na ficha do cliente, com botão "Abrir no Drive".
- O envio de arquivos atual continua igual.

## 3. Equipe por empresa (estilo Linear)
- Em cada empresa, aba "Equipe": adicionar pessoa por e-mail, com tipo (Sócio ou Funcionário) e nível:
  - **Visualizar**: só vê.
  - **Editor**: vê e edita, sem excluir.
  - **Admin**: tudo, incluindo excluir e gerenciar a equipe (inclusive outros admins).
- Para Funcionário você também marca quais abas ele vê (CRM, Clientes, Projetos, Financeiro, Mentorados, Contabilidade, Conteúdo).
- Sócio admin tem as mesmas permissões que você.
- A pessoa só vê os dados das empresas em que foi cadastrada.
- Convite por e-mail: a pessoa recebe um link para criar senha. Só e-mails convidados conseguem criar conta, o "Criar conta (em breve)" continua fechado para o resto.
- Cada pessoa tem perfil com nome e foto.

## 4. Quem lançou
- Todo registro novo grava automaticamente quem criou, com opção de trocar o responsável.
- Foto e nome aparecem nos itens, e dá para filtrar por "Lançado por" no Financeiro e demais telas.

## Cuidados com seus dados
- Nada do que já existe é apagado ou alterado; os registros atuais continuam seus e passam a ser vistos pela equipe da empresa correspondente.
- Registros antigos aparecem como "lançado por você".

## Detalhes técnicos
- Novas tabelas: tags, item_tags, company_members (role viewer/editor/admin, kind socio/funcionario, allowed_tabs), invites; colunas novas: clients.drive_url, created_by, profiles.full_name/avatar_url.
- RLS passa de "own rows" para: dono OU membro da empresa do registro, com funções security definer can_view/can_edit/can_delete por empresa e aba.
- Convites via server function com admin client após checar que o chamador é admin da empresa; signup liberado só para e-mails com convite pendente (trigger).
- Testes para as regras de cada nível de acesso.

Ordem sugerida: 1 e 2 primeiro (rápidos), depois 3 e 4 juntos.
