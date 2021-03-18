FROM node:15.11-buster

ENV NODE_ENV production

# Create and set the working directory.
RUN mkdir -p /opt/kdot-port-reverse
WORKDIR /opt/kdot-port-reverse

# Install dependencies.
COPY yarn.lock .
COPY package.json .
COPY apps/kdot-port-reverse/package.json .
RUN yarn

# Copy all of the other files over.
COPY apps/kdot-port-reverse .

CMD ["yarn", "serve:app"]
