#!/bin/sh
set -x
docker-compose down \
&& docker-compose up --build -d \
&& docker-compose exec exchange /eosdtscripts/bootstrap.sh \
&& docker-compose exec exchange /eosdtscripts/contracts.sh
