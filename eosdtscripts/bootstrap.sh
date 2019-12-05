#!/bin/bash

source /eosdtscripts/config.sh
pkill -15 keosd
rm -rf $wddir
mkdir $wddir
echo "unix-socket-path = keosd.sock" > $wddir/config.ini
keosd --config-dir $wddir --data-dir $wddir 2> $wddir/wdlog.txt &
sleep 1
SUFFIX='.test'

wcmd create --to-console -n ignition
wcmd import -n ignition --private-key $systemprivate

accounts=(eosio.bpay eosio.msig eosio.names eosio.ram eosio.ramfee eosio.saving eosio.stake eosio.token eosio.vpay eosio.wrap eosio.rex)
for i in ${!accounts[*]}; do
    account=${accounts[$i]}
    ecmd create account eosio $account $systempublic $systempublic
done

ecmd set contract eosio ${systemdir}/eosio.bios eosio.bios.wasm eosio.bios${SUFFIX}.abi

contracts=(eosio.token eosio.msig eosio.wrap)
for i in ${!contracts[*]}; do
    contract=${contracts[$i]}
    ecmd set contract ${contract} ${systemdir}/${contract} ${contract}.wasm ${contract}${SUFFIX}.abi
done

cleos --wallet-url $wdurl --url $bioshost push action eosio.token create '{"issuer":"eosio","maximum_supply":"10000000000.0000 EOS"}' -p eosio.token
cleos --wallet-url $wdurl --url $bioshost push action eosio.token issue '{"to":"eosio","quantity":"500000000.0000 EOS","memo":""}' -p eosio
cleos --wallet-url $wdurl --url $bioshost push action eosio.token issue '{"to":"eosio.token","quantity":"500000000.0000 EOS","memo":""}' -p eosio || exit
ecmd set contract eosio ${systemdir}/eosio.system eosio.system.wasm eosio.system${SUFFIX}.abi
cleos --wallet-url $wdurl --url $bioshost push action eosio init '[ "0", "4,EOS" ]' -p eosio || exit 1

rm -rf $wddir
pkill -15 keosd
