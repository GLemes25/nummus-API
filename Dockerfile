# Usa uma versão leve do Node 20
FROM node:20-slim

# Instala o OpenSSL (obrigatório para o Prisma rodar no Linux slim)
RUN apt-get update -y && apt-get install -y openssl

# Habilita o pnpm via Corepack (usa a versão travada em package.json)
RUN corepack enable

# Define a pasta de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência primeiro (cache de layers)
# prisma.config.ts precisa estar presente antes do "prisma generate",
# pois é ele (e não mais o schema.prisma) que resolve a DATABASE_URL
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma/

# Instala todas as dependências (mantendo o Prisma CLI vivo)
RUN pnpm install --frozen-lockfile

# Injeta uma URL falsa temporária apenas para o Prisma gerar as tipagens sem
# reclamar (prisma.config.ts exige DATABASE_URL só para carregar a config;
# a URL real é injetada em runtime via secrets do Fly)
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"

RUN pnpm prisma generate

# Copia o restante do código
COPY . .

# Compila o TypeScript (gera dist/server.js)
RUN pnpm build

# Expõe a porta que o Fly.io espera
EXPOSE 8080

# Inicia a aplicação (usa o script "start" do package.json)
CMD ["pnpm", "start"]
