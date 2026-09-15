FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./

# The frontend has a postinstall script that needs project files, so defer scripts
# until after the source has been copied.
RUN npm ci --ignore-scripts

COPY . .

RUN npm run postinstall

# Your Nuxt CSP is computed during the production build, therefore the local
# Strapi origin must also be supplied while building the image.
ARG NUXT_PUBLIC_STRAPI_URL=http://localhost:1337
ENV NUXT_PUBLIC_STRAPI_URL=${NUXT_PUBLIC_STRAPI_URL}

RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
