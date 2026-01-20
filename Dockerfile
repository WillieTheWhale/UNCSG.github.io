FROM nginx:alpine

# Copy static site files to nginx html directory
COPY . /usr/share/nginx/html/

# Remove unnecessary files from the container
RUN rm -f /usr/share/nginx/html/Dockerfile \
    && rm -f /usr/share/nginx/html/openshift.yaml \
    && rm -f /usr/share/nginx/html/nginx.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (OpenShift runs as non-root)
EXPOSE 8080

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
