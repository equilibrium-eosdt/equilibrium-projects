FROM ubuntu:18.04
ARG EOS=1.8.6
ARG CDT=1.6.1
WORKDIR /root
COPY config/ /etc/nodeos/
RUN apt-get update \
    && ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y wget tzdata \
    && dpkg-reconfigure -f noninteractive tzdata \
    && wget -nv https://github.com/EOSIO/eos/releases/download/v${EOS}/eosio_${EOS}-1-ubuntu-18.04_amd64.deb \
    && wget -nv https://github.com/EOSIO/eosio.cdt/releases/download/v${CDT}/eosio.cdt_${CDT}-1_amd64.deb \
    && apt install -y ./eosio_${EOS}-1-ubuntu-18.04_amd64.deb ./eosio.cdt_${CDT}-1_amd64.deb \
    && rm -f ./eosio_${EOS}-1-ubuntu-18.04_amd64.deb ./eosio.cdt_${CDT}-1_amd64.deb \
    && rm -rf "/var/lib/apt/lists/*" 
CMD ["nodeos","-e","-p","eosio","--plugin","eosio::producer_plugin","--plugin","eosio::chain_api_plugin","--plugin","eosio::http_plugin","--http-server-address=0.0.0.0:8888","--access-control-allow-origin=*","--contracts-console","--http-validate-host=false","--trace-history","--verbose-http-errors","-l","/etc//nodeos/logging.json","--max-transaction-time=3000","--disable-replay-opts"]
EXPOSE 8888
