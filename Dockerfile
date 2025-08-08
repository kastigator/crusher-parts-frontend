# --- Этап 1: Сборка фронтенда ---
FROM node:20 AS build
WORKDIR /app

# --- Аргументы окружения, передающиеся при сборке ---
ARG VITE_API_URL
ARG VITE_DADATA_API_KEY
ARG VITE_YANDEX_MAPS_API_KEY

# --- Переводим их в ENV, чтобы Vite мог прочитать ---
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_DADATA_API_KEY=${VITE_DADATA_API_KEY}
ENV VITE_YANDEX_MAPS_API_KEY=${VITE_YANDEX_MAPS_API_KEY}

# --- Установка зависимостей ---
COPY package*.json ./
RUN npm install

# --- Копируем остальной проект и запускаем сборку ---
COPY . .
RUN npm run build

# --- Этап 2: nginx контейнер ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# --- Конфиг для history mode (SPA) ---
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
