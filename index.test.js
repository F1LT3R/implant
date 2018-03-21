import request from 'request'
import test from 'ava'
import implant from '.'

test('Single quote string', async t => {
	const contents = '<p>{ foo : \'single quote string\'}</p>'

	const handlers = {
		foo: value => {
			t.is(value, 'single quote string')
			return 'baz'
		}
	}

	const result = await implant(contents, handlers)
	t.is(result, '<p>baz</p>')
})

test('Double quote string', async t => {
	const contents = '<p>{ foo : "double quote string"}</p>'

	const handlers = {
		foo: value => {
			t.is(value, 'double quote string')
			return 'qux'
		}
	}

	const result = await implant(contents, handlers)
	t.is(result, '<p>qux</p>')
})

test('JavaScript object', async t => {
	const contents = '<p>{foo: {bar: "baz"}}</p>'

	const handlers = {
		foo: value => {
			t.deepEqual(value, {
				bar: 'baz'
			})

			return 'qux'
		}
	}

	const result = await implant(contents, handlers)
	t.is(result, '<p>qux</p>')
})

test('Multiple replacements with number values', async t => {
	t.plan(3)

	const contents = '<p>{foo: 1}</p><p>{foo: 2}</p>'

	const handlers = {
		foo: value => new Promise(resolve => {
			t.is(typeof value, 'number')
			resolve(value)
		})
	}

	const result = await implant(contents, handlers)

	const expected = '<p>1</p><p>2</p>'

	t.is(result, expected)
})

test('Multi-line replacements with number values', async t => {
	t.plan(5)

	const contents = `
		<p>{ foo : 4}</p>
		<p>{foo : 3}</p>
		<p>{ foo: 2}</p>
		<p>{foo: 1}</p>
	`

	const handlers = {
		foo: value => new Promise(resolve => {
			t.is(typeof value, 'number')
			resolve(value)
		})
	}

	const result = await implant(contents, handlers)

	const expected = `
		<p>4</p>
		<p>3</p>
		<p>2</p>
		<p>1</p>
	`

	t.is(result, expected)
})

test('Multi-handler replacements', async t => {
	t.plan(5)

	const contents = `
		<p>{foo: 'bar'}</p>
		<p>{baz: 'qux'}</p>
		<p>{foo: 'bar'}</p>
		<p>{baz: 'qux'}</p>
	`

	const handlers = {
		foo: value => new Promise(resolve => {
			t.is(value, 'bar')
			resolve(value)
		}),
		baz: value => new Promise(resolve => {
			t.is(value, 'qux')
			resolve(value)
		})

	}

	const result = await implant(contents, handlers)

	const expected = `
		<p>bar</p>
		<p>qux</p>
		<p>bar</p>
		<p>qux</p>
	`

	t.is(result, expected)
})

test('No namespace available throws', async t => {
	const contents = '<p>{ foo : \'single quote string\'}</p>'

	const handlers = {
		bork: () => {}
	}

	const error = await t.throws(
		implant(contents, handlers)
	)

	const expectedErrMsg = 'No implant name-spaces were found in your content!'
	t.is(error.message.indexOf(expectedErrMsg), 0)
})

test('Rejected promise catches', async t => {
	const contents = '<p>{bongle: "Oops, you floobed!"}</p>'

	const handlers = {
		bongle: str => new Promise((resolve, reject) => {
			reject(str)
		})
	}

	await implant(contents, handlers).catch(err => {
		t.is(err, 'Oops, you floobed!')
	})
})

test('Promise error throws', async t => {
	const contents = '<p>{bungle: "Doh!"}</p>'

	const handlers = {
		bungle: str => new Promise(() => {
			throw new Error(str)
		})
	}

	const error = await t.throws(
		implant(contents, handlers)
	)

	t.is(error.message, 'Doh!')
})

test('get http', async t => {
	const html = '<p>{get: "https://f1lt3r.github.io/foobar/bazqux.html"}</p>'

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

	const result = await implant(html, handlers)
	t.is(result, '<p><h1>Hello, wombat!</h1></p>')
})
