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

test('Fetching network resources', async t => {
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

test('Using JavaScript objects', async t => {
	const html = `
		<div>{article: {id: 8421, section: 3}}</div>
	`

	const articles = {
		8421: {
			sections: {
				3: 'Foo. Or foo not. There is no bar.'
			}
		}
	}

	const handlers = {
		article: ref => {
			const {id, section} = ref
			return articles[id].sections[section]
		}
	}

	const result = await implant(html, handlers)

	const expected = `
		<div>Foo. Or foo not. There is no bar.</div>
	`
	t.is(result, expected)
})

test('Using illegal JavaScript values', async t => {
	const html = `
		<div>{include: article.html}</div>
	`

	const handlers = {
		include: uri => {
			return uri
		}
	}

	const result = await implant(html, handlers)

	const expected = `
		<div>article.html</div>
	`
	t.is(result, expected)
})

test('Recursive depth', async t => {
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

	const result = await implant(html.level1, handlers, opts)

	const expected = `<div>1 <div>2 <div>3 {include: level4}</div></div></div>`
	t.is(result, expected)
})

test('No recusion by default', async t => {
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

	const result = await implant(html.level1, handlers)

	const expected = `<div>1 <div>2 {include: level3}</div></div>`
	t.is(result, expected)
})

test('Preserve non-existing handler content', async t => {
	const html1 = '<div>{foo: do} {bar: dont}</div>'
	const html2 = '<div>{bar: dont} {foo: do}</div>'

	const handlers = {
		foo: () => 'WORKS!'
	}

	const result1 = await implant(html1, handlers)
	const result2 = await implant(html2, handlers)

	const expected1 = '<div>WORKS! {bar: dont}</div>'
	const expected2 = '<div>{bar: dont} WORKS!</div>'

	t.is(result1, expected1)
	t.is(result2, expected2)
})
