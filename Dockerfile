FROM nginx:alpine AS web
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
