# --- 1. Estágio de Desenvolvimento (Base) ---
FROM node:18-alpine As development

WORKDIR /usr/src/app

# Copia package.json e package-lock.json primeiro (cache de camadas)
COPY --chown=node:node package*.json ./

# Instala TODAS as dependências (incluindo devDependencies como Nest CLI)
RUN npm ci

# Copia o restante do código
COPY --chown=node:node . .

# Define usuário node por segurança
USER node

# --- 2. Estágio de Build ---
FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

# Copia as dependências instaladas do estágio anterior
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

# Gera a pasta dist
RUN npm run build

# Define NODE_ENV para production para limpar dependências de dev depois
ENV NODE_ENV production

# Limpa node_modules e deixa apenas o necessário para produção
RUN npm ci --only=production && npm cache clean --force

USER node

# --- 3. Estágio de Produção (Imagem Final) ---
FROM node:18-alpine As production

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

# Comando para iniciar em produção
CMD [ "node", "dist/main.js" ]