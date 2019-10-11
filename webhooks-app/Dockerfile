FROM node:10

WORKDIR /webhook-app

COPY ./index.js ./
COPY ./package.json ./
COPY ./css ./css
COPY ./views ./views
COPY ./js ./js
RUN npm install


ENTRYPOINT [ "node", "index.js" ]
EXPOSE 3000
