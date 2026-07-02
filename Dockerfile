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

# Gera o cliente do Prisma
RUN pnpm prisma generate

# Copia o restante do código
COPY . .

# Compila o TypeScript (gera dist/server.js)
RUN pnpm build

# Expõe a porta que o Fly.io espera
EXPOSE 8080

# Inicia a aplicação (usa o script "start" do package.json)
CMD ["pnpm", "start"]
