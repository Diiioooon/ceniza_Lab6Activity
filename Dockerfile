FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN chmod +x node_modules/.bin/tsc
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]