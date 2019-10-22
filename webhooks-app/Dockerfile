FROM node:10

WORKDIR /webhook-app

COPY src/index.js ./
COPY src/package.json ./
COPY ./public ./public
COPY src/views ./views
COPY ./js ./js
RUN npm install


ENTRYPOINT [ "node", "index.js" ]
EXPOSE 3000
