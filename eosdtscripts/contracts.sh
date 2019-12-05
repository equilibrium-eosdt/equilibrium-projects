#!/bin/bash

source /eosdtscripts/config.sh
pkill -15 keosd
rm -rf $wddir
mkdir $wddir
echo "unix-socket-path = keosd.sock" > $wddir/config.ini
keosd --config-dir $wddir --data-dir $wddir 2> $wddir/wdlog.txt &
sleep 1
SUFFIX='.test'
contractdir='/contracts/testing'

wcmd create --to-console -n wdlocal
wcmd import -n wdlocal --private-key $systemprivate
wcmd import -n wdlocal --private-key 5K1GNGZ3pEgKBWEPwChBxh29sL2YsjfSjutjbRMs9sbgRqDu4Wb #eos2dtdotcom

accounts=(fakeeliqdatr equiguardian eosdtsttoken eosdtnutoken eosdtorclize eos2dtdotcom)
for i in ${!accounts[*]}; do
    account=${accounts[$i]}
    cleos --wallet-url $wdurl --url $bioshost system newaccount --transfer --stake-net "1000.0000 EOS" --stake-cpu "1000.0000 EOS" --buy-ram-kbytes 4096 eosio ${account} EOS5G3y7H2ft1HkMZP8KX4ajPjLK1yCnW7czRteHzeTFKvtCp9aD8 || exit 1
    ecmd set account permission ${account} active --add-code
done

contracts=(fakeeliqdatr equiguardian eosdtsttoken eosdtnutoken)
for i in ${!contracts[*]}; do
    contract=${contracts[$i]}
    rm -f ${contractdir}/${contract}/${contract}.wasm
    cp ${contractdir}/${contract}/${contract}${SUFFIX}.abi ${contractdir}/${contract}/${contract}${SUFFIX}.abi.backup || exit 1
    eosio-cpp ${contractdir}/${contract}/${contract}.cpp -o ${contractdir}/${contract}/${contract}.wasm || exit 1
    cp ${contractdir}/${contract}/${contract}${SUFFIX}.abi.backup ${contractdir}/${contract}/${contract}${SUFFIX}.abi || exit 1
    ecmd set contract ${contract} ${contractdir}/${contract} ${contract}.wasm ${contract}${SUFFIX}.abi
done

contracts=(eosdtorclize eos2dtdotcom)
for i in ${!contracts[*]}; do
    contract=${contracts[$i]}
    rm -f ${contractdir}/${contract}/${contract}.wasm
    bcmd ${contract}
    ecmd set contract ${contract} ${contractdir}/${contract} ${contract}.wasm ${contract}${SUFFIX}.abi
done

rm -rf $wddir
pkill -15 keosd
