/**
 *  bin/sign.js
 *
 *  David Janes
 *  Consensas
 *  2021-01-11
 *
 *  Copyright (2013-2021) Consensas
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict"

const _ = require("iotdb-helpers")
const ip = require("information-passport")
const fetch = require("iotdb-fetch")

const fs = require("fs")
const jose = require("node-jose")
const path = require("path")

const _util = require("./_util")

const minimist = require("minimist")
const ad = minimist(process.argv.slice(2), {
    boolean: [
        "verbose", "trace", "debug",
    ],
    string: [
        "_",
        "in",
        "key",
        "verifier",
    ],
    alias: {
        "file": "in",
    },
    default: {
        "verifier": "",
    },
});

const help = message => {
    const name = "sign"

    if (message) {
        console.log(`${name}: ${message}`)
        console.log()
    }

    console.log(`\
usage: ${name} [options] [--in <source>] --key <private-key.pem> [--verifier <url>]

Required:

--key <private-key.pem> private key PEM

Options:

--in <source>           json file or URL to sign, otherwise stdin is used
--verifier <url>        url to public key chain. If not used, you'll get output
                        but it will be tricky to verify / validate!
`)

    process.exit(message ? 1 : 0)
}

if (!ad.key) {
    help("--key argument is required")
}
if (ad.in === "-") {
    delete ad.in
}

_.logger.levels({
    debug: ad.debug || ad.verbose,
    trace: ad.trace || ad.verbose,
})

const run = async () => {
    const private_pem = await fs.promises.readFile(ad.key)

    let json = null
    if (_.is.AbsoluteURL(ad.in)) {
        const sd = await _.promise({})
            .then(fetch.document.get(ad.verifier))
        json = JSON.parse(sd.document)
    } else if (ad.in) {
        json = JSON.parse(await fs.promises.readFile(ad.in))
    } else {
        json = await _util.read_stdin()
    }

    const signed = await ip.crypto.sign({
        json: json, 
        privateKeyPem: private_pem, 
        verification: ad.verifier,
    })

    console.log(JSON.stringify(signed, null, 2))
}

run().catch(error => {
    console.log(error)
})

