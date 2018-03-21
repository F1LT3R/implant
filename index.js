const balanced = require('balanced-match')
const lighterJson = require('lighter-json')

// Instead of:
// const re = new RegExp(`{\\s*${namespace}\\s*:`, 'g'), etc...

const getNameSpace = (js, opts) =>
	Reflect.ownKeys(opts).find(namespace =>
		Reflect.has(js, namespace) ? namespace : false
	)

const implant = (contents, opts) => new Promise((resolve, reject) => {
	const promises = []
	const matches = []

	let match = balanced('{', '}', contents)
	let js = lighterJson.evaluate(`{${match.body}}`)

	while (match && js) {
		const namespace = getNameSpace(js, opts)

		if (namespace) {
			matches.push(match)
			const resultFn = opts[namespace](js[namespace])
			promises.push(resultFn)
		}

		match = balanced('{', '}', match.post)

		if (match) {
			js = lighterJson.evaluate(`{${match.body}}`)
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
			output += result
		})
		output += matches[matches.length - 1].post

		resolve(output)
	}).catch(err => {
		reject(err)
	})
})

module.exports = implant
