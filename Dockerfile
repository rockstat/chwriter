FROM node:9

# Env vars
ENV TZ UTC
ENV NODE_ENV production
ENV PORT 8080
ENV LOG_LEVEL warn
# RUN mkdir -p /app
WORKDIR /app

COPY package.json .
COPY yarn.lock .

RUN yarn install --production
RUN yarn global add pino

COPY . .
RUN ln -nsf ../dist ./node_modules/@app

CMD [ "node", "." ]
