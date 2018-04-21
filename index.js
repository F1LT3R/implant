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
	let js = javascriptify(match)

	while (match && js) {
		const namespace = getNameSpace(js, handlers)

		if (namespace) {
			matches.push(match)
			const resultFn = handlers[namespace](js[namespace])
			promises.push(resultFn)
		}

		match = balanced('{', '}', match.post)

		if (match) {
			js = javascriptify(match)
		}
	}

	if (promises.length === 0) {
		const msg = 'No implant name-spaces were found in your content!'
		const error = new Error(msg)
		return reject(error)
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
