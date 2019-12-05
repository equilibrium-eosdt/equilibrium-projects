# Equilibrium Exchange

Equilibrium Exchange is an EOS smart contract aiming to provide exchange service between different assets.

# Guardian Contract

The contract are accepting EOSDT transfers, trying to liquidate bad debt, then go to exchange to convert purchased collateral back into EOSDT, returning it (and the profit) to the caller.

## Usage

Interactions with the exchange contract are made using transfers. They require a pair_id and quantity.

### Using cleos

```
$ ./cleos transfer testtesttest eos2dtdotcom "3.000000000 EOSDT" '{"pair_id":0}'
```

### Using JS

```Javascript
const { ExchangeContract, Connection } = require("@equilab/exchange");

const nodeAddress = "http://node-address.example.com:80";
const connection = new Connection(nodeAddress, ["private-key-1", "private-key-2"]);
const exchange = new ExchangeContract(connection);

await exchange.exchange("testtesttest", "EOSDT", "EOS", 3);

```

---

Interactions with the guardian contract require only quantity

### Using cleos

```
$ ./cleos transfer testtesttest equiguardian "3.000000000 EOSDT"
```

### Using JS

```Javascript
const { Api, JsonRpc } = require("eosjs");
const { JsSignatureProvider } = require("eosjs/dist/eosjs-jssig");
const fetch = require("node-fetch");
const { TextDecoder, TextEncoder } = require("util");
const { TextEncoder, TextDecoder } = require("text-encoding");

const privateKeys = [privateKey1];

const signatureProvider = new JsSignatureProvider(privateKeys);
const rpc = new JsonRpc("http://node-address.example.com:80", { fetch });
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

const result = await api.transact({
  actions: [{
    account: "testtesttest",
    name: "transfer",
    authorization: [{
      actor: "testtesttest",
      permission: "active",
    }],
    data: {
      from: "testtesttest",
      to: "equiguardian",
      quantity: "3.000000000 EOSDT",
      memo: ""
    },
  }]
}, {
  blocksBehind: 3,
  expireSeconds: 30,
});

```

## Prerequisites for tests

1. `npm` should be installed.

    ```
    npm --version
    ```

2. `node` should be installed.

    ```
    node --version
    ```

3. `docker` should be installed.

    ```
    docker --version
    ```

4. `docker-compose` should be installed.

    ```
    docker-compose --version
    ```

## Tests

To run tests, execute the following commands:

```
npm install
npm run build
npm test
```

## Troubleshooting

Typically, test scenarios work out-of-the-box, but sometimes you can encounter some problems.

You might get errors when attempting to use docker-compose:

```
ERROR: Couldn't connect to Docker daemon at http+docker://localhost - is it running?
```

### Solution:

Create the docker group and add your user:

1. Create the docker group.

```
$ sudo groupadd docker
```

2. Add your user to the docker group.

```
$ sudo usermod -aG docker $USER
```

3. Relogin in all sessions or reboot the computer.

---

If you machine is pretty slow, you could might get this error:

```
Failed to connect to nodeos at http://localhost:8888; is nodeos running?
Initialization failed!
```

### Solution:

change the following line in: `eosdtscripts/bootstrap.sh:9`

```
sleep 1
```

to

```
sleep 15
```

and line `eosdtscripts/contracts.sh`

```
sleep 1
```

to

```
sleep 5
```

It makes scipts run slower, but after these changes it should work.
