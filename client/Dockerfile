FROM node:12-alpine

RUN apk add --no-cache git curl bash

COPY package.json /client/package.json
COPY package-lock.json /client/package-lock.json
WORKDIR /client
RUN npm install

COPY . /client

CMD ["npm", "start"]
