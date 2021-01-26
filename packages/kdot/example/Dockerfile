FROM node:15.4-buster

ENV NODE_ENV production

RUN mkdir /opt/app
WORKDIR /opt/app

COPY yarn.lock .
COPY package.json .
RUN yarn

COPY packages/kdot/example/ .

CMD ["node", "index.js"]
