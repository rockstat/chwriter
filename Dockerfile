ARG BASE_CONTAINER=rockstat/band-base-ts:ng

FROM $BASE_CONTAINER

LABEL band.service.version="2.0.0"
LABEL band.service.title="Clickhouse Writer"
LABEL band.service.def_position="3x1"

WORKDIR /app

# COPY package.json .
# COPY yarn.lock .
COPY package.json .
COPY package-lock.json .

# RUN yarn link @rockstat/rock-me-ts
RUN npm install
RUN yarn link @rockstat/rock-me-ts

# RUN yarn link "@rockstat/rock-me-ts" \
  # && yarn install \
  # && yarn cache clean



COPY . .
RUN yarn build


ENV REDIS_DSN redis://redis:6379
ENV NODE_ENV production

# RUN yarn build

CMD [ "yarn", "start:prod"]
