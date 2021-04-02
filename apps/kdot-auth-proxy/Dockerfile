FROM node:15.13-buster

ENV NODE_ENV production

# Create and set the working directory.
RUN mkdir -p /opt/kdot-auth-proxy
WORKDIR /opt/kdot-auth-proxy

# Install dependencies.
COPY yarn.lock .
COPY package.json .
COPY apps/kdot-auth-proxy/package.json .
RUN yarn

# Copy all of the other files over.
COPY apps/kdot-auth-proxy .

CMD ["yarn", "serve:app"]
