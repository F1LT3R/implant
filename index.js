const balanced = require('balanced-match')
const lighterJson = require('lighter-json')

const getNameSpace = (js, handlers) =>
	Reflect.ownKeys(handlers).find(namespace =>
		Reflect.has(js, namespace) ? namespace : false
	)

const getValueAsIs = match => {
	const re = new RegExp(/(\s*\S+\s*):\s*(.*)/)
	const found = re.exec(match.body)
	const namespace = found[1]
	const asIsValue = found[2]
	const json = `{${namespace}:${JSON.stringify(asIsValue)}}`
	const js = lighterJson.evaluate(json)
	return js
}

const javascriptify = match => {
	let js

	try {
		js = lighterJson.evaluate(`{${match.body}}`)
	} catch (err) {
		js = getValueAsIs(match)
	}
	return js
}

const implant = (contents, handlers, opts, t = 1) => new Promise((resolve, reject) => {
	const promises = []
	const matches = []

	let match = balanced('{', '}', contents)

	// Quick exit for recursion and/or where
	// no balanced pairs are found
	if (!match) {
		return resolve(contents)
	}

	let js = javascriptify(match)
	let namespace

	while (match && js) {
		namespace = getNameSpace(js, handlers)

		matches.push(match)

		if (namespace) {
			const resultFn = handlers[namespace](js[namespace], opts)
			promises.push(resultFn)
		} else {
			const subContent = `{${match.body}}`
			promises.push(subContent)
		}

		match = balanced('{', '}', match.post)

		if (match) {
			js = javascriptify(match)
		}
	}

	if (promises.length === 0) {
		return resolve(contents)
	}

	Promise.all(promises).then(fulfilled => {
		let output = ''

		fulfilled.forEach((result, index) => {
			output += matches[index].pre
			if (result) {
				output += result
			} else {
				output += contents.substr(matches[index].start, (matches[index].end - matches[index].start) + 1)
			}
		})
		output += matches[matches.length - 1].post

		if (typeof opts === 'object' &&
			Reflect.has(opts, 'maxRecursion') &&
			t < opts.maxRecursion) {
			t++
			return resolve(implant(output, handlers, opts, t))
		}

		resolve(output)
	}).catch(err => {
		reject(err)
	})
})

module.exports = implant
