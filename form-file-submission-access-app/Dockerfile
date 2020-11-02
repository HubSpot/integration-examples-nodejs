FROM node:10

RUN apt-get update 
RUN apt-get install -y vim 

WORKDIR /app/src

COPY src/package.json ./
RUN npm install --force

EXPOSE 3000
