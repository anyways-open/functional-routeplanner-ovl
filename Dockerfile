FROM mhart/alpine-node:16 AS build
WORKDIR /app
COPY . .

# To handle 'not get uid/gid'
RUN npm config set unsafe-perm true
RUN npm ci
RUN npm run build

# production environment
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/public /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]