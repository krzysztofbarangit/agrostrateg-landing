FROM nginx:alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY robots.txt /usr/share/nginx/html/robots.txt
COPY assets/ /usr/share/nginx/html/assets/
COPY hub/index.html /usr/share/nginx/html/hub/index.html
EXPOSE 80
