FROM rockstat/band-base-ts:latest

LABEL band.service.version="1.1.4"
LABEL band.service.title="Clickhouse Writer"
LABEL band.service.def_position="3x1"

WORKDIR /app

COPY package.json .
COPY yarn.lock .

RUN yarn link "@rockstat/rock-me-ts" \
  && yarn install \
  && yarn cache clean

COPY . .
ENV NODE_ENV production

RUN ln -nsf ../dist ./node_modules/@app \
  && yarn build

CMD [ "yarn", "start:prod"]
