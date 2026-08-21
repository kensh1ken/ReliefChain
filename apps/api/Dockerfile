FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY package*.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN npm install
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build -w @reliefchain/contracts && npm run build -w @reliefchain/api
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages/contracts/dist packages/contracts/dist
COPY --from=build /workspace/packages/contracts/package.json packages/contracts/
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/package.json apps/api/
USER node
CMD ["node","apps/api/dist/main.js"]
