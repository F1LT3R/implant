const balance = require('balanced-pairs')
const lighterJson = require('lighter-json')

const getNamedCb = (namespace, handlers) => {
	if (typeof handlers !== 'object') {
		return
	}

	if (Reflect.has(handlers, namespace)) {
		return handlers[namespace]
	}
}

const getValueAsIs = body => {
	try {
		const re = new RegExp(/(\s*\S+\s*):\s*(.*)/)
		const found = re.exec(body)
		const namespace = found[1]
		const asIsValue = found[2]
		const json = `{${namespace}:${JSON.stringify(asIsValue)}}`
		const js = lighterJson.evaluate(json)
		return js
	} catch (err) {
		return body
	}
}

const javascriptify = body => {
	let js

	if (body.length === 0) {
		return undefined
	}

	try {
		js = lighterJson.evaluate(`{${body}}`)
	} catch (err) {
		js = getValueAsIs(body)
	}

	return js
}

// eslint-disable-next-line max-params
const implant = (contents, handlers, opts, t = 1, last = '') => new Promise((resolve, reject) => {
	const promises = []

	const blocks = balance(contents, {open: '{', close: '}'})

	if (blocks.list.length === 0) {
		return resolve(contents)
	}

	blocks.list.forEach(item => {
		const body = item.body
		const obj = javascriptify(body)

		if (typeof obj === 'undefined') {
			promises.push(body)
			return
		}

		let namespace

		// Just one namespace per object
		if (typeof obj === 'string') {
			namespace = obj
		}

		if (typeof obj === 'object') {
			namespace = Reflect.ownKeys(obj)[0]
		}

		const handler = getNamedCb(namespace, handlers)

		if (!handler) {
			return promises.push(body)
		}

		promises.push(new Promise((resolve, reject) => {
			const handleResult = handler(obj[namespace], opts)

			if (!handleResult) {
				return resolve(item.body)
			}

			if (handleResult.then) {
				return handleResult.then(result => {
					item.updateBody(result)
					resolve(result)
				}).catch(reject)
			}

			item.updateBody(handleResult)
			resolve(handleResult)
		}))
	})

	Promise.all(promises).then(() => {
		const assembled = blocks.flatten()

		if (typeof opts === 'object' &&
			Reflect.has(opts, 'maxDepth') &&
			// Don recurse if we have reached max depth
			t < opts.maxDepth &&
			// Don't recusrve if there were no changes
			assembled !== last) {
			t++
			return resolve(implant(assembled, handlers, opts, t, assembled))
		}

		resolve(assembled)
	}).catch(err => {
		reject(err)
	})
})

module.exports = implant
