/**
 *  bin/claim-write.js
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

    ],
    string: [
        "_",
        "in",
        "folder",
    ],
    alias: {
    },
    default: {
        "folder": "website",
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

Write JSON records invidually 

Options:

--in <file>             data to read (default: stdin)
--folder <dir>          where to write files (default: 'website')
`)

    process.exit(message ? 1 : 0)
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

        .end(done, self, _one)
})

_one.method = "_one"
_one.description = ``
_one.requires = {
    json: _.is.JSON,
}
_one.accepts = {
}
_one.produces = {
    json: _.is.JSON,
}

/**
 */
_.promise({
})
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
