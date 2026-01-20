FROM nginxinc/nginx-unprivileged:alpine

# Copy static site files
COPY --chown=nginx:nginx . /usr/share/nginx/html/

# Remove unnecessary files
RUN rm -f /usr/share/nginx/html/Dockerfile \
    && rm -f /usr/share/nginx/html/openshift.yaml \
    && rm -f /usr/share/nginx/html/nginx.conf

# Copy custom nginx config
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
