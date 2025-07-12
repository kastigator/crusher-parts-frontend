# Используем образ с Node.js
FROM node:20 AS build
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем остальные файлы и собираем проект
COPY . .
RUN npm run build

# Используем nginx для отдачи статики
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Добавим конфиг для поддержки history mode в SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
