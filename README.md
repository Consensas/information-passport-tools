<img src="https://consensas-aws.s3.amazonaws.com/icons/passports-github.png" align="right" />

# information-passport-tools
Open Source tools for working with information passports

## About Information Passport
An **[Information Passport](https://github.com/Consensas/information-passport/tree/main/docs#information-passport)**
is a _signed digital document_ that makes some claim,
for example "So and so was Vaccinated against COVID-19 on a certain date".
If the _signature_ matches the _public key_ of the digital document, the
document is **Verified**.
If the **Claim** made in the document checks against a set of (use-defined) rules
_and_ the "fingerprint" of the public key is known, we say the document is
**Validated**.

A **Vaccination Passport** is an Information Passport that
provides digital proof of a Vaccination.
A **Test Record Passport** is an Information Passport that provides
digital proof a some test having been performed.

## About this Project

These are tools for working with information passports.
If you're just interested in the code for working with them, 
please go **[here](https://github.com/Consensas/information-passport/tree/main/docs#information-passport)**.

## The Tools

All the tools are found in `bin`. 
Make sure to `npm install` this package first.

### Build Sample Website

    node immunization-samples --n 1 |
    node claim-sign --in - |
    node claim-write-json
    node claim-write-

    node make-vaccination-claims.js --n 1 > claims.json
    node sign-claims.js 
    node write-claims.js < claims.json
    nod

    node generate-vaccinations.js \
        --verifier 'https://gist.githubusercontent.com/dpjanes/74063bde4c668a7d9fc1ecd66268c069/raw/a633cfdc58311c4ff81aa40f0ef0026c7b183c4d/public.combined.pem' \
        --key ../data-sample/private.key.pem \
        --issuer "https://passport.consensas.com" \
        --host 'passport.consensas.com' \
        --n 1

### Validation
Test the validation tool - this will go out the internet, fetch 
a signed document, it's validator and tell the result

    node validate.js 'https://consensas.world/did:cns:ABHEZDOYLE' --pretty

### Sign and Verify

Sign a document. Note key has to be decrypted, and that the public key chain
has to be found at the URL

    node sign.js \
        --file ../data-sample/example-vaccination.json \
        --key ../data-sample/private.key.pem \
        --verifier 'https://gist.githubusercontent.com/dpjanes/74063bde4c668a7d9fc1ecd66268c069/raw/a633cfdc58311c4ff81aa40f0ef0026c7b183c4d/public.combined.pem' 

If you just want to play with tool and don't have the public keychain
upload somewhere, leave out the `--verifier` option. 
However, you'll have to specify it in the verify tool

`sign` also works on stdin

    cat ../data-sample/example-vaccination.json | 
    node sign.js --key ../data-sample/private.key.pem 

To verify a document

    node verify.js --file signed.json 

Or if you need to manually specify the verifier

    node verify.js --file signed.json --verifier ../data-sample/public.cer.pem

Or if you want to use stdin

    cat signed.json | node verify.js --verifier ../data-sample/public.cer.pem

Here's an example of a round-trip 

    cat ../data-sample/example-vaccination.json | 
    node sign.js --key ../data-sample/private.key.pem | 
    node verify.js --verifier ../data-sample/public.combined.pem

### Lint

Test whether a claim at file / url has all the required fields.
Note that is only working right now for Vaccination / Immunization,
but it should be generalizable

    node lint --in "website/QGEKMLKXIV.json"

If there is no verifiable credential, but only the claim

    node lint --in "website/QGEKMLKXIV.json" --claim

### Scanners

A hand-held scanner verifier - for Raspberry Pi, 
but likely easily adaptable to any platform 

Play with Barcode Scanner on a raspberry pi

    nohup python scanner.py

Put the two of them together to scan and verify

    nohup sh scanner.sh

Video:

<div align="left">
      <a href="https://www.youtube.com/watch?v=d3oz7kR6ZjU" target="video">
         <img src="https://img.youtube.com/vi/d3oz7kR6ZjU/0.jpg" style="width: 200px">
      </a>
</div>
