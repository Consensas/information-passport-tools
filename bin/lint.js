/*
 *  bin/lint.js
 *
 *  David Janes
 *  Consenas.com
 *  2021-02-16
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
const ipt = require("..")

const _util = require("./_util")

const minimist = require("minimist")
const ad = minimist(process.argv.slice(2), {
    boolean: [
        "verbose", "trace", "debug",
        "pretty",
		"clear",
        "json",
        "silent",
        "claim",
        "lint",
    ],
    string: [
        "in",
        "url",
        "_",
    ],
    alias: {
        "in": "url",
    },
    default: {
        "claim": false,
    },
});

const help = message => {
    const name = "lint"

    if (message) {
        console.log(`${name}: ${message}`)
        console.log()
    }

    console.log(`\
usage: ${name} [options] 

Validate a Verifiable Credential

input options:

--in <url|file>    input document (URL or file)
--claim            the document is the claim, not the whole VC

`)

    process.exit(message ? 1 : 0)
}

if (!ad.in && ad._.length) {
    ad.in = ad._.shift()
}

if (!ad.in) {
    help("--in <url|file> is required")
}

_.logger.levels({
    debug: ad.debug || ad.verbose,
    trace: ad.trace || ad.verbose,
})

/**
 */
const lint = _.promise((self, done) => {
    _.promise(self)
        .validate(lint)

        .make(sd => {
            sd.verified.lints = []
            sd.data_type = _.d.first(sd.verified.credentialSubject, "@type", null)
        })
        .then(ipt.schemas.initialize)
        .then(ipt.schemas.by_data_type)
        .make(sd => {
            if (sd.schema) {
                return
            }

            sd.verified.lints.push({
                "id": "@type",
                "issue": `@type="${sd.data_type}" unknown`,
                "level": 30
            })
            
            _.promise.bail(sd)
        })
        .then(ipt.schemas.lint)

        .end(done, self, lint)
})

lint.method = "lint"
lint.description = ``
lint.requires = {
    verified: {
        credentialSubject: _.is.Dictionary,
    },
}
lint.accepts = {
}
lint.produces = {
}


/**
 */
_.promise({
})
    .then(_util.verify.p(ad.in, ad.claim))
    .then(lint)
    .make(sd => {
        console.log(JSON.stringify(sd.verified.lints, null, 2))
    })

    .except(error => {
        delete error.self
        console.log(error)

        console.log("#", _.error.message(error))
    })
