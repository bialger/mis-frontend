FROM nginx:stable-alpine

COPY . /usr/share/nginx/html/

# Remove server tokens for security
RUN sed -i 's/#server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

EXPOSE 80
