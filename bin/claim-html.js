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

Write HTML version of JSON records

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
const _html = _.promise((self, done) => {
    const colors = require("colors")

    const _encode = s => s;

    _.promise(self)
        .validate(_html)

        .then(fs.read.utf8.p(path.join(__dirname, "../data-sample/vaccination-template.html")))
        .add("document:template")

        .then(ipt.schemas.initialize)
        .add("record/@type:data_type")
        .then(ipt.schemas.by_data_type)
        .then(ipt.schemas.required)

        .make(sd => {
            const lines = []
            lines.push("<h1>Vaccination Passport</h2>")
            lines.push("<p>")
            lines.push(`<img src="https://chart.googleapis.com/chart?cht=qr&chs=400x400&chld=H&chl=http://${ad.host}/did:example:${sd.record.code}" />`)
            lines.push("</p>")

            _.d.list(sd.schema, "groups", []).forEach(group => {
                group.show = group.show ?? true
                if (!group.show) {
                    return
                }

                let any = false

                _.d.list(group, "nodes", []).forEach(node => {
                    node.show = group.node ?? true
                    if (!node.show) {
                        return
                    }

                    const value = _.d.first(sd.record, node.id, "")
                    if (_.is.Empty(value)) {
                        return
                    }

                    if (!any) {
                        lines.push("<h2>")
                        lines.push(_encode(group.name))
                        lines.push("</h2><ul>")
                        any = true
                    }

                    lines.push(`<li>${node.name}: ${value}</li>`)
                })

                if (any) {
                    lines.push("</ul>")
                }
            })

            sd.document = sd.template.replace("CONTENT", lines.join("\n"))
        })

        .end(done, self, _html)
})

_html.method = "_html"
_html.description = ``
_html.requires = {
    json: _.is.JSON,
    record: _.is.JSON,
}
_html.accepts = {
}
_html.produces = {
    document: _.is.String,
}

/**
 */
const _one = _.promise((self, done) => {
    _.promise(self)
        .validate(_one)

        .make(sd => {
            const id = [
                _.d.first(sd.json, "vc:credentialSubject/id"),
                _.d.first(sd.json, "vc:credentialSubject/vc:id"),
                _.d.first(sd.json, "credentialSubject/id"),
                _.d.first(sd.json, "credentialSubject/vc:id"),
                _.d.first(sd.json, "id"),
                _.d.first(sd.json, "vc:id"),
            ].filter(x => x)[0]

            sd.record = [
                _.d.first(sd.json, "vc:credentialSubject"),
                _.d.first(sd.json, "credentialSubject"),
            ].filter(x => x)[0]

            sd.path = `${ad.folder}/${id.replace(/^.*:/, "")}.html`
        })
        .then(_html)

        .then(fs.make.directory.parent)
        .then(fs.write.utf8)
        .log("wrote html", "path")

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
    ipt$cfg: {
        schemas: path.join(__dirname, "..", "data", "schemas"),
        templates: path.join(__dirname, "..", "data", "templates"),
    },
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
