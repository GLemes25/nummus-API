# Fluxo de Trabalho Git — Nummus API

Este documento define as regras rígidas de versionamento do repositório. Todos os agentes de IA e desenvolvedores humanos devem segui-las estritamente.

## Regras

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
