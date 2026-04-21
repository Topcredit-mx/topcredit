/** @type {import('cypress-cloud').CurrentsConfig} */
module.exports = {
	e2e: {
		batchSize: 3,
	},
	component: {
		batchSize: 5,
	},
	cloudServiceUrl:
		process.env.CURRENTS_API_URL ??
		process.env.CYPRESS_API_URL ??
		'http://127.0.0.1:1234',
}
