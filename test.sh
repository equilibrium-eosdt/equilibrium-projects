#!/bin/bash
./node-run.sh && node tests/build/init/default-init.js
retVal=$?
if [ $retVal -ne 0 ]; then
    echo 'Initialization failed!'
    exit $retVal
fi

node tests/build/smoke-tests/smoke-test.js
exitcode=$?

docker-compose down

exit $exitcode
