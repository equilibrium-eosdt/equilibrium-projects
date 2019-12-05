#!/bin/bash

bioshost='http://localhost:8888'
wddir='local-wd'
wdaddr="$wddir/keosd.sock"
wdurl="unix://$wdaddr"
systemdir='/eosiosystems'
systempublic='EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
systemprivate='5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'

ecmd () {
    echo ===== Start: $step ============
    echo executing: cleos --wallet-url $wdurl --url $bioshost $*
    echo -----------------------
    cleos  --wallet-url $wdurl --url $bioshost $* || exit 1
    echo ==== End: $step ==============
    step=$(($step + 1))
}

wcmd () {
    ecmd wallet $* || exit 1
}

bcmd () {
    contract=$1
    rm -f $contractdir/$contract/$contract.wasm
    cp $contractdir/$contract/$contract.abi $contractdir/$contract/$contract.abi.backup
    eosio-cpp -I=$contractdir/$contract/include -I=$contractdir/eosdt $contractdir/$contract/src/$contract.cpp -o $contractdir/$contract/$contract.wasm
    cp $contractdir/$contract/$contract.abi.backup $contractdir/$contract/$contract.abi
}
