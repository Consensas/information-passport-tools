/**
 *  bin/immunization-samples.js
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
const document = require("iotdb-document")

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
    const name = "immunization-samples"

    if (message) {
        console.log(`${name}: ${message}`)
        console.log()
    }

    console.log(`\
usage: ${name} [options] 

Generate Immunization Records based on the
fake data samples

Options:

--n <n>                 number of records (default: all)
`)

    process.exit(message ? 1 : 0)
}

_.logger.levels({
    debug: ad.debug || ad.verbose,
    trace: ad.trace || ad.verbose,
})

const DOT = "•"

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
        .add("result:json")

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
        .add("result:json")

        .make(sd => {
            console.log("---")
            console.log(JSON.stringify(sd.result))
        })

        .end(done, self, _one)
})

_one.method = "_one"
_one.description = ``
_one.requires = {
    record: {
        code: _.is.String,
    },
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
    path: path.join(__dirname, "../data-sample/fake-records.yaml"),
})
    .then(ipt.templates.initialize)
    .then(ipt.schemas.initialize)

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
