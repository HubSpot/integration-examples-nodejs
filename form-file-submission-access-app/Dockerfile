FROM node:10

RUN apt-get update 

WORKDIR /app/src

COPY src/package.json ./
RUN npm install

EXPOSE 3000
