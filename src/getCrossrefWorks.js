const rp = require('request-promise');
const fs = require('fs');
const lineByLine = require('n-readlines');
const crossrefUri = 'https://api.crossref.org';
const args = process.argv;

if (args.length !== 5) {
	console.log('Usage: node getCrossrefWorks.js <input_file> <output_file> <email>');
	process.exit(-1);
}

const liner = new lineByLine(args[2]);
const outputFile = args[3];
const email = args[4];

function sleep(millis) {
	return new Promise(resolve => setTimeout(resolve, millis));
}

async function getPaperFromCrossref(doi) {
	return rp.get({
		uri: `${crossrefUri}/works/${doi}`,
		qs: {
			mailto: email
		},
		json: true,
	    resolveWithFullResponse: true,
	}).then( (response) => {
		let limit = parseInt(response.headers['x-rate-limit-limit']);
		let interval = response.headers['x-rate-limit-interval'].slice(0, -1);

		return {
			interval: interval / limit, 
			paper: response.body.message,
		};
	});
}

async function getPapers() {
	let stream = fs.createWriteStream(outputFile, {flags:'a'});

	let line;
	while (line = liner.next()) {
	    let doi = line.toString('ascii');
	    try {
		    let { interval, paper } = await getPaperFromCrossref(doi);
		    stream.write(JSON.stringify(paper) + "\n");
		    await sleep(interval);
		} catch (err) {
			console.log(doi + "\t" + err.message);
		}
	}

	stream.end();
}

getPapers();