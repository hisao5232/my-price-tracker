FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Next.js の開発サーバーを起動
CMD ["npm", "run", "dev"]
