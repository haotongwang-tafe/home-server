/* eslint-env node */
"use strict";

const util = require('util'); // eslint-disable-line no-unused-vars
const fs = require('fs');
const path = require('path');
// const { JSDOM } = require('jsdom');
const express = require('express');
// const Formidable = require('formidable');
// const url = require('url');
const yargs = require('yargs');

const app = express();

/* --------------------------------- params --------------------------------- */

const args = yargs
	.options({
		'p': {
			alias: ['P', '-port', '-PORT'],
			default: -1,
			describe: 'port of server',
			type: 'number'
		},
		'd': {
			alias: ['-path', '-dir'],
			default: '',
			describe: 'path to directory for serving static files',
			type: 'string'
		},
		'r': {
			alias: ['-run'],
			default: false,
			describe: 'server running in mode run or dev',
			type: 'boolean'
		}
	})
	.help()
	.argv;

/* ------------------------------ app globals ------------------------------ */

{
	const configPath = path.join(__dirname, 'config.json');
	global.config = JSON.parse(fs.readFileSync(configPath));

	const def = global.config.default;
	global.serveDirectory = args['dir'] || def.serveDirectory;
	if (!fs.statSync(global.serveDirectory).isDirectory()) {
		console.log(`Invalid path: ${args['dir']}, serve directory set to ${def.serveDirectory}`);
		global.serveDirectory = def.serveDirectory;
	}

	global.PORT = args['port'] >= 0
		? args['port']
		: args['run']
			? def.PORT_run : def.PORT_dev;

	global.mainDir = __dirname;

	const actionPath = path.join(__dirname, 'action.json');
	global.action = fs.existsSync(actionPath)
		? JSON.parse(fs.readFileSync(actionPath))
		: { redirect: null };
}

/* ------------------------------- functions ------------------------------- */

const htmlGen = require('./lib/htmlGen');

/* ------------------------------ core routes ------------------------------ */

// home page
app.get(['/', '/index.html'], (req, res) => {
	res.send(htmlGen.directory(global.serveDirectory, 'Home Server'));
});

/* ----------------------------- import routes ----------------------------- */

app.use(require('./routes/upload'));

app.use(require('./routes/redirect'));

app.use(require('./routes/set'));

/* ------------------------------ catch routes ------------------------------ */

// generalised page generation
app.get('*', (req, res, next) => {
	const abs = path.join(global.serveDirectory, req.url);
	if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
		res.send(htmlGen.directory(abs));
	} else {
		next();
	}
});

// static files
app.use(express.static(global.serveDirectory));

// 404
app.use((req, res) => {
	res.status(404).sendFile(path.join(__dirname, '404.html'));
});

/* --------------------------------- server --------------------------------- */

app.listen(global.PORT, () => console.log(`Server started on port ${global.PORT}...`));
