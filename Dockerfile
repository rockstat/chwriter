ARG BASE_CONTAINER=rockstat/band-base-ts:ng

FROM $BASE_CONTAINER

LABEL band.service.version="2.0.1"
LABEL band.service.title="Clickhouse Writer"
LABEL band.service.def_position="3x1"


ENV REDIS_DSN redis://redis:6379
WORKDIR /app

# COPY package.json .
# COPY yarn.lock .
COPY package.json .
COPY package-lock.json .

# RUN yarn link @rockstat/rock-me-ts
# RUN npm install
# RUN yarn link @rockstat/rock-me-ts
COPY .npmrc .

RUN npm link @rockstat/rock-me-ts --save --loglevel http 
RUN npm i  --loglevel http && npm cache clean --force  --loglevel http
# RUN --mount=type=secret,id=npm,target=./.npmrc,uid=1000 npm ci
# RUN yarn link "@rockstat/rock-me-ts" \
  # && yarn install \
  # && yarn cache clean



COPY . .
RUN rm .npmrc

RUN npm run build

ENV NODE_ENV production



# RUN yarn build

CMD [ "npm", "run", "start:prod"]
