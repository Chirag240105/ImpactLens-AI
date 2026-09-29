# Build from the repository root so the shared constants are included:
#   docker build -f server/Dockerfile -t impactlens-api .
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --workspaces=false --omit=dev
COPY server ./
EXPOSE 5000
CMD ["npm", "start"]
