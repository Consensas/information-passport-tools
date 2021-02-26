/**
 *  bin/generate-vaccinations.js
 *
 *  David Janes
 *  Consensas
 *  2021-01-20
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
    },
});

const help = message => {
    const name = "generate-vaccinations"

    if (message) {
        console.log(`${name}: ${message}`)
        console.log()
    }

    console.log(`\
usage: ${name} [options] 

Generate a complete folder of Vaccination Records 
which can be served by HTTP like Apache or NGINX

The methods used in here can be adapted to 
your own organization's needs.

Required:

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

const DOT = "•"

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
        .add("json/@type:data_type")
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

                    const value = _.d.first(sd.json, node.id, "")
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
            sd.path = `website/${sd.record.code}.html`
        })
        .then(fs.make.directory.parent)
        .then(fs.write.utf8)
        .log("path", "path")

        .end(done, self, _html)
})

_html.method = "_html"
_html.description = ``
_html.requires = {
    json: _.is.JSON,
    record: {
        code: _.is.String,
    },
}
_html.accepts = {
}
_html.produces = {
}

/**
 */
const _one = _.promise((self, done) => {
    _.promise(self)
        .validate(_one)

        .make(sd => {
            sd.did = `did:example:${sd.record.code}`
            sd.immunizationDate = "2021-01-01"
            sd.doseSequence = 2
            sd.lotNumber = "123-456-789"
        })

        // Redaction
        .make(sd => {
            let value

            value = _.d.first(sd.record, "birthDate")
            if (value) {
                value = `${value}`
                value = value.substring(0, value.length - 2).replace(/\d/g, DOT) +
                    value.substring(value.length - 2)
                sd.record["birthDate"] = value
            }

            value = _.d.first(sd.record, "card/identifier")
            if (value) {
                value = `${value}`
                value = value.substring(0, value.length - 4).replace(/\d/g, DOT) +
                    value.substring(value.length - 4)
                _.d.set(sd.record, "card/identifier", value)
            }
        })

        // Hospital
        .then(ipt.templates.by_name.p("Hospital"))
        .then(ipt.templates.fill.p({
            "schema:address/schema:addressCountry": "record/hospital/country",
            "schema:address/schema:addressRegion": "record/hospital/region",
            "schema:address/schema:addressLocality": "record/hospital/locality",
            'schema:name': "record/hospital/name",
        }))
        .add("result:Hospital")

        // Health Card
        .then(ipt.templates.by_name.p("HealthCard"))
        .then(ipt.templates.fill.p({
            "schema:identifier": "record/card/identifier",
            "schema:issuedBy": "record/card/issuer",
            "schema:validUntil": "record/card/expires",
        }))
        .add("result:HealthCard")


        // Patient
        .then(ipt.templates.by_name.p("Patient"))
        .then(ipt.templates.fill.p({
            'schema:additionalName': null, 
            'schema:birthDate': "record/birthDate",
            'schema:familyName': "record/familyName",
            'schema:givenName': "record/givenName",
            'schema:healthCard': "HealthCard",
        }))
        .add("result:Patient")

        // Drug
        .then(ipt.templates.by_name.p("Drug-Moderna"))
        .then(ipt.templates.fill.p({}))
        .add("result:Drug")

        // COVID
        .then(ipt.templates.by_name.p("MedicalCondition-COVID19"))
        .then(ipt.templates.fill.p({}))
        .add("result:MedicalCondition")

        // Vaccination
        .then(ipt.templates.by_name.p("ImmunizationRecommendation"))
        .then(ipt.templates.fill.p({
            "schema:drug": "Drug",
            "schema:healthCondition": "MedicalCondition",
        }))
        .add("result:MedicalCondition")

        // Vaccination Record
        .then(ipt.templates.by_name.p("ImmunizationRecord"))
        .then(ipt.templates.fill.p({
            "schema:identifier": null,
            "schema:name": null,
            "schema:patient": "Patient",
            "schema:primaryPrevention": "MedicalCondition",
            "schema:location": "Hospital",
            "schema:immunizationDate": "immunizationDate",
            "schema:doseSequence": "doseSequence",
            "schema:lotNumber": "lotNumber",
            "vc:id": "did",
        }))
        .add("result:MedicalRecord")

        // Covid Credential
        .then(ipt.templates.by_name.p("HealthCredential"))
        .add(sd => ({
            "issuer": sd.issuer,
            "issuanceDate": _.timestamp.make(),
        }))
        .then(ipt.templates.fill.p({
            "vc:issuer": "issuer",
            "vc:issuanceDate": "issuanceDate",
            "vc:credentialSubject": "MedicalRecord",
        }))
        .add("result:HealthCredential")

        // sign 
        .make(async sd => {
            sd.HealthCredential = _.d.transform.denull(sd.HealthCredential)
            sd.json = await ip.crypto.sign({
                json: sd.HealthCredential, 
                privateKeyPem: sd.private_pem, 
                verification: ad.verifier,
                suite: ad.suite,
            })
            sd.path = `website/${sd.record.code}.json`
        })

        // write the JSON
        .then(fs.make.directory.parent)
        .then(fs.write.json.pretty)
        .log("path", "path")

        // write the HTML
        .add("MedicalRecord:json")
        .then(_html)

        .end(done, self, _one)
})

_one.method = "_one"
_one.description = ``
_one.requires = {
    record: {
        code: _.is.String,
    },
    verifier: _.is.String,
    private_pem: _.is.String,
}
_one.accepts = {
}
_one.produces = {
}

/**
 */
_.promise()
    .make(async sd => {
        sd.private_pem = await fs.promises.readFile(ad.key, "utf8")
        sd.verifier = ad.verifier
        sd.issuer = ad.issuer
        sd.ipt$cfg = {
            schemas: path.join(__dirname, "..", "data", "schemas"),
            templates: path.join(__dirname, "..", "data", "templates"),
        }
    })

    .then(ipt.templates.initialize)
    .then(ipt.schemas.initialize)

    .add("path", path.join(__dirname, "../data-sample/fake-records.yaml"))
    .then(fs.read.json.magic)
    .make(sd => {
        sd.records = sd.json // .slice(0, 1)
        if (ad.n) {
            sd.records = sd.records.slice(0, parseInt(ad.n))
        }
    })
    .each({
        method: _one,
        inputs: "records:record",
    })
    .except(error => {
        delete error.self
        console.log(error)

        console.log("#", _.error.message(error))
    })
