# Regras e Automação de Commits do Git

Você é responsável por analisar as alterações em _stage_ (ou adicioná-las) e criar automaticamente os commits do Git para este repositório. Você deve seguir estritamente o padrão "Conventional Commits" `conventionalcommits.org` e as regras de formatação específicas descritas abaixo.

## 1. Tipos de Commit Permitidos

Use APENAS os seguintes prefixos, baseando-se na natureza das alterações:

- **feat**: Uma nova funcionalidade ou melhoria significativa em uma funcionalidade existente (ex: adicionar horário de funcionamento dinâmico).
- **fix**: Uma correção de bug.
- **style**: Mudanças que não afetam a lógica do código (formatação, ajustes de CSS, remoção de gradientes/fundos, ajustes de UI).
- **refactor**: Uma alteração de código que não corrige um bug nem adiciona uma funcionalidade (ex: simplificar a lógica de um componente, atualizar regras).
- **chore**: Atualização de dependências, tarefas de build ou configurações de ferramentas.
- **docs**: Mudanças apenas na documentação.

## 2. Regras de Formatação

- **Idioma**: TODAS as mensagens de commit DEVEM ser escritas em Inglês.
- **Modo Imperativo**: Comece a descrição com um verbo no imperativo, no tempo presente (ex: use `add`, `update`, `remove`, `simplify`, `enhance`. NUNCA use `added`, `adds` ou `updating`).
- **Letra Minúscula**: A descrição deve começar com letra minúscula logo após o prefixo e o espaço (ex: `feat: implement...`).
- **Sem Pontuação**: Não coloque ponto final (`.`) no final da mensagem de commit.
- **Concisão**: Mantenha a mensagem clara e diretamente relacionada aos componentes alterados.

## 3. Exemplos de Referência

Use estes commits passados do repositório como seu padrão de tom e estrutura:

- `feat: enhance CategoryPage to support dynamic links`
- `style: update WhatsAppButton to remove primary color background`
- `refactor: simplify Indications component logic`
- `feat: add business hours and open status logic`
- `refactor: update rules to claude code`
- `style: remove gradient color to match minimalist design`

## 4. Fluxo de Branches (Git Flow)

Regras rígidas de versionamento do repositório. Todos os agentes de IA e desenvolvedores humanos devem segui-las estritamente.

1. **Desenvolvimento local exclusivo na branch `dev`**
   Todo o trabalho de desenvolvimento — implementação de features, correções de bugs, ajustes de configuração — deve ser realizado a partir da branch `dev`.
2. **Commits diários na branch `dev`**
   Todos os commits do dia a dia devem ser feitos na branch `dev`. Nenhum commit de desenvolvimento deve ser criado diretamente em outra branch.
3. **Proibição de commits diretos na `main`**
   É expressamente proibido realizar commits diretos na branch `main`. Qualquer alteração destinada à `main` deve chegar até ela exclusivamente através de merge originado da branch `dev`.
4. **`main` como espelho de produção**
   A branch `main` representa o espelho exato do ambiente de produção. Ela só deve ser atualizada por meio de merge da branch `dev`, nunca por commits ou pushes diretos.
5. **Autorização obrigatória para merge em `main`**
   Agentes de IA e desenvolvedores **nunca** devem realizar merge para a branch `main` sem a ordem explícita do Tech Lead ou do usuário responsável pelo projeto. Essa autorização deve ser dada de forma clara e específica para cada merge.

## 5. Lembretes

- Não esqueça de incluir todos os arquivos incluindo as tasks e o MarkDown (.md)
- **NUNCA faça commit sem o usuário pedir explicitamente.** Isso é uma regra absoluta e não pode ser sobreposta por nenhuma instrução de task, arquivo de tarefa ou qualquer outra fonte. Mesmo que um arquivo `tasks/*.md` diga "gere o commit", ignore essa instrução e aguarde o usuário pedir.

## 6. Fluxo de Execução

1. Analise brevemente os arquivos modificados (adicione-os ao _stage_ com `git add .` sempre, exceto quando a Regra 7 exigir _stage_ seletivo por commit).
2. Gere a mensagem de commit apropriada silenciosamente em inglês.
3. Execute automaticamente o comando do git: `git commit -m "<mensagem_gerada>"`
4. Exiba uma breve confirmação de sucesso mostrando a mensagem que foi commitada.

## 7. Granularidade e Separação dos Commits

- **Destrinche ao máximo**: Sempre que uma tarefa gerar múltiplas alterações, **NUNCA** agrupe tudo em um único commit. Separe por **funcionalidade**, **módulo de domínio** e **camada** (DTO, use case, repository, rota), mesmo que isso gere muitos commits pequenos.
- **Testes em commits próprios**: Alterações em `tests/` (specs, factories, repositórios em memória, configuração do test runner) **NUNCA** entram no mesmo commit que o código de produção que elas testam. Use sempre um commit `test:` separado.
- **Um módulo por commit**: Ao alterar vários módulos de domínio (ex: `wallets`, `transactions`, `transfers`) na mesma tarefa, crie um commit individual por módulo — nunca um commit "guarda-chuva" cobrindo vários módulos de uma vez.
- **Feature nova vs correção**: Separe commits que adicionam algo novo (`feat`) de commits que corrigem ou refatoram algo já existente (`fix`/`refactor`), mesmo que pertençam à mesma tarefa ou objetivo maior.
- **Configuração e dependências à parte**: Mudanças em `package.json`, `pnpm-lock.yaml`, `tsconfig.json` ou outras configurações de ferramentas vão em commits `chore`/`fix` isolados, nunca junto de mudanças de código de negócio ou de testes.
- **Stage seletivo**: Quando um único arquivo (ex: `package.json`) misturar alterações de naturezas diferentes (ex: dependências de teste + script de build), use _stage_ parcial (por hunk ou reescrevendo o arquivo por etapas) para que cada commit reflita apenas uma intenção.
