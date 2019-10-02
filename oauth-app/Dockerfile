FROM node:10

WORKDIR /oauth-app

COPY ./index.js ./
COPY ./package.json ./
COPY ./css ./css
COPY ./html ./html
RUN npm install


ENTRYPOINT [ "node", "index.js" ]
EXPOSE 3000
