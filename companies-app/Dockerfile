FROM node:10

WORKDIR /companies-app

COPY ./index.js ./
COPY ./package.json ./
COPY ./css ./css
COPY ./views ./views
RUN npm install


ENTRYPOINT [ "node", "index.js" ]
EXPOSE 3000
