FROM node:17-buster-slim

ENV NODE_ENV production

RUN mkdir /opt/app
WORKDIR /opt/app

COPY yarn.lock .
COPY package.json .
RUN yarn

COPY packages/kdot/example/ .

CMD ["node", "index.js"]
