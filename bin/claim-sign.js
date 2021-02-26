/**
 *  bin/claim-sign.js
 *
 *  David Janes
 *  Consensas
 *  2021-02-26
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
const fs = require("iotdb-fs")

const ip = require("information-passport")
const ipt = require("..")

const path = require("path")
const _util = require("./_util")

const yaml = require("js-yaml")

const minimist = require("minimist")
const ad = minimist(process.argv.slice(2), {
    boolean: [
        "verbose", "trace", "debug",

        "rsa",
        "bbs",
        "canonical",
    ],
    string: [
        "_",
        "in",
        "key",
        "verifier",
        "host",
        "issuer",
        "suite", // CanonicalRSA2021 BbsBlsSignature2020 RsaSignature2018
    ],
    alias: {
    },
    default: {
        "host": "passport.consensas.com",
        "suite": "RsaSignature2018",
        "in": "-",
    },
});

const help = message => {
    const name = "claim-sign"

    if (message) {
        console.log(`${name}: ${message}`)
        console.log()
    }

    console.log(`\
usage: ${name} [options] 

Required:

--in <file>             data to read (default: stdin)

--key <private-key.pem> private key PEM
--verifier <url>        url to public key chain PEM 
--issuer <url>          url of issuer (any URL will do)

Signing Suite:

--suite <name>          one of CanonicalRSA2021, BbsBlsSignature2020 or RsaSignature2018
                        RsaSignature2018 is default
--rsa
--bbs
--canonical             ... shortcuts for --suite

Options:

--n <n>                 number of records (default: all)
--host <host>           host these are served from (default: passport.consensas.com)
`)

    process.exit(message ? 1 : 0)
}

if (!ad.key) {
    help("--key argument is required")
}
if (!ad.verifier) {
    help("--verifier argument is required")
}
if (!ad.issuer) {
    help("--issuer argument is required")
}

if (ad.rsa) {
    ad.suite = "RsaSignature2018"
} else if (ad.bbs) {
    ad.suite = "BbsBlsSignature2020"
} else if (ad.canonical) {
    ad.suite = "CanonicalRSA2021"
} else if (!ad.suite) {
    help("--suite <name> argument is required")
}

_.logger.levels({
    debug: ad.debug || ad.verbose,
    trace: ad.trace || ad.verbose,
})

/**
 */
const _one = _.promise((self, done) => {
    _.promise(self)
        .validate(_one)

        .make(async sd => {
            sd.json = await ip.crypto.sign({
                json: sd.json,
                privateKeyPem: sd.private_pem, 
                verification: ad.verifier,
                suite: ad.suite,
            })
            console.log("---")
            console.log(JSON.stringify(sd.json))
        })

        .end(done, self, _one)
})

_one.method = "_one"
_one.description = ``
_one.requires = {
    json: _.is.JSON,
    verifier: _.is.String,
    private_pem: _.is.String,
}
_one.accepts = {
}
_one.produces = {
    json: _.is.JSON,
}

/**
 */
_.promise({
    ipt$cfg: {
        schemas: path.join(__dirname, "..", "data", "schemas"),
        templates: path.join(__dirname, "..", "data", "templates"),
    },
})
    .make(async sd => {
        sd.private_pem = await fs.promises.readFile(ad.key, "utf8")
        sd.verifier = ad.verifier
        sd.issuer = ad.issuer
    })

    .then(ipt.templates.initialize)
    .then(ipt.schemas.initialize)

    .then(_util.read_argument.p(ad.in))
    .make(async sd => {
        sd.jsons = yaml.loadAll(sd.document)
    })

    .each({
        method: _one,
        inputs: "jsons:json",
    })
    
    .except(error => {
        delete error.self
        console.log(error)

        console.log("#", _.error.message(error))
    })
