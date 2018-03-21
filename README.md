# Implant

> 👽  Dynamic asynchronous string content replacement.

[![Build Status](https://travis-ci.org/f1lt3r/implant.svg?branch=master)](https://travis-ci.org/f1lt3r/implant)
[![Coverage Status](https://coveralls.io/repos/github/f1lt3r/implant/badge.svg?branch=master)](https://coveralls.io/github/f1lt3r/implant?branch=master)
[![NPM Version](https://img.shields.io/npm/v/implant.svg)](https://www.npmjs.com/package/implant)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

## Install

```
$ yarn add implant
```

## Usage

Add a JavaScript Implant handler to your HTML:

```html
<p>{get: "https://f1lt3r.github.io/foobar/bazqux.html"}</p>
```

Write the handler code:

```js
const request = require('request')

const handlers = {
    get: url => new Promise((resolve, reject) => {
        request(url, (err, res, body) => {
            if (err) {
                return reject(err)
            }

            resolve(body)
        })
    })
}

const result = implant(html, handlers)'
```

Checkout the result:

```html
<p><h1>Hello, wombat!</h1></p>
```
