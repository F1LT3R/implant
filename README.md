# Implant

<img align="right" height="260" src="implant-logo.png">

> 🌱  asynchronous inline content replacement

[![Build Status](https://travis-ci.org/F1LT3R/implant.svg?branch=master)](https://travis-ci.org/F1LT3R/implant)
[![Coverage Status](https://coveralls.io/repos/github/F1LT3R/implant/badge.svg?branch=master)](https://coveralls.io/github/F1LT3R/implant?branch=master)
[![NPM Version](https://img.shields.io/npm/v/implant.svg)](https://www.npmjs.com/package/implant)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Support the development of Implant.

<a href="https://patreon.com/bePatron?u=9720216"><img width="160" src="https://f1lt3r.io/content/images/2018/04/become_a_patron_button@2x.png"></a>

## Install

```
$ yarn add implant
```

## Fetching Network Resources

Reference an Implant handler from your HTML:

```html
<p>{get: "https://f1lt3r.github.io/foobar/bazqux.html"}</p>
```

Write the Implant handler:

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

The content of [bazqux.html](https://f1lt3r.github.io/foobar/bazqux.html) is fetched from the web when implant handler is executed.

Checkout the result:

```html
<p><h1>Hello, wombat!</h1></p>
```

## Using JavaScript Objects

You can use plain JavaScript object within your HTML:

```html
<div>
    <!-- Implant reference object -->
    {article: {
        id: 8421,
        section: 3
    }}
</div>
```

Your Implant handler can reference data using the properties you pass: 

```js
// Some store of data
const articles = {
    8421: {
        sections: {
            3: 'Foo. Or foo not. There is no bar.'
        }
    }
}

// Implant handler returns data from store
const handlers = {
    article: ref => {
        const {id, section} = ref
        return articles[id].sections[section]
    }
}

const result = implant(html, handlers)
```

Result:

```html
<div>Foo. Or foo not. There is no bar.</div>
```

## Using Illegal JavaScript Values

It is also possible to use illegal JavaScript values, such as references to objects that do not exist. For example:

```html
<div>{foo: i.find.your.lack.of.qux.disturbing}</div>
```

When an illegal value is encountered, Implant pass back a stringified version of the handler.

```js
const handlers = {
    foo: uri => console.log
    // 'i.find.your.lack.of.qux.disturbing'
}
```

Handling values this way allows you to write cleaner syntax in your content templates by excluding quotes; or designing your own custom syntax.

You might use this feature to reference filenames without quotes:

```html
<div>{article: programming-101.md}</div>
```

Then you could fetch and render the article like this.

```js
const handlers = {
    foo: uri => fetchPost(uri)
}
```

## Recusion

You can recurse through the result of you implant like this:

```js
const html = {
    level1: '<div>1 {include: level2}</div>',
    level2: '<div>2 {include: level3}</div>',
    level3: '<div>3 {include: level4}</div>'
}

const handlers = {
    include: ref => {
        return html[ref]
    }
}

const opts = {
    maxRecursion: 3
}

;(async () => {
    const result = await implant(html.level1, handlers, opts)

})()
```

Result:

```html
<div>1 <div>2 <div>3 {include: level4}</div></div></div>
```

### Why Recusion?

You may want to use recursion if you are building a just-in-time dependancy tree. For example: if your implant fetched a dependency that contained a reference to another depdendancy.

Note: if you do not specify the `maxRecusion` option, implant will only run once.

## Credits

Thanks to the following designers from the Noun Project for the vectors used in the lead graphic.

- [Sarah Rudkin](https://thenounproject.com/sarahdrudkin/)
- [Alex Tai](https://thenounproject.com/sandorsz/)