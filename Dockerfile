FROM nginxinc/nginx-unprivileged:alpine

# Copy static site files (excluded files in .dockerignore)
COPY . /usr/share/nginx/html/

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
