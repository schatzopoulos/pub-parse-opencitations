const rp = require('request-promise');
const fs = require('fs');
const lineByLine = require('n-readlines');
const args = process.argv;
let MongoClient = require('mongodb').MongoClient;
let uri = "mongodb://localhost:27017/";
const _ = require('lodash');

if (args.length !== 4) {
	console.log('Usage: node transformFromCollections.js <input_file> <not_found_dois_output_file>');
	process.exit(-1);
}

const liner = new lineByLine(args[2]);
const doisOutputFile = args[3];

function connect() {
	return new Promise( (resolve, reject) => {
		MongoClient.connect(uri, (err, db) => {
			if (err) {
				reject(err);
			} else {
				resolve(db);
			}
		});
	});
}

function query(conn, col, query) {
    return new Promise( (resolve, reject) => {
	    conn.collection(col).find(query).toArray( (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

// function insert(conn, docs) {
//     return new Promise( (resolve, reject) => {
// 		conn.collection('papers').insertMany(docs, (err, res) => {
// 		    if (err) {
// 	    		return reject(err);
// 		    }
// 	        console.log("Number of documents inserted: " + res.insertedCount);
// 		    resolve(res);
// 		});
// 	});
// }

function removeNewLine(str) {
	// removes new line & multiple spaces
	return str.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g,' ').trim();
}

function transform(doc, source) {
	let newDoc;
	if (source === 'crossref') {
		newDoc = {
			title: (doc.title[0] || ''),
			venue: (doc['container-title'][0] || ''),
			year: (doc['published-print']) ? (doc['published-print']['date-parts'][0][0] || '') : '',
			authors: (doc.author || []).map( (a) => {
				return {
					name: a.given + ' ' + a.family, 
					org: a.affiliation,
				};
			}),
			keywords: [],
			fos: doc['content-domain']['domain'],
			isbn: doc.isbn,
			language: doc.language,
			publisher: doc.publisher,
			volume: doc.volume,
			issue: doc.issue,
			pages: doc.page,
			doi: doc.DOI,
			url: doc.URL,
			abstract: doc.abstract || '',
			doc_type: doc.type,
		};
		newDoc.source = 'crossref';
	} else {
		newDoc = _.pick(doc, [
			'id', 'title', 'venue', 'year', 'authors', 'keywords', 'fos', 'lang', 'publihser', 'volume', 'issue', 'page_start', 'page_end', 'isbn', 'doi', 'url', 'abstract', 'doc_type'
		]);
		newDoc[`${source}_id`] = newDoc.id;
		delete newDoc.id;
		newDoc.pages = newDoc.page_start + '-' + newDoc.page_end; 
		delete newDoc.page_start;
		delete newDoc.page_end;
		newDoc.language = newDoc.lang;
		delete newDoc.lang;
		newDoc.source = source;
	}
	return newDoc;
}

function execute(batch) {
	return new Promise( (resolve, reject) => {
		batch.execute( (err, res) => {
			if (err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
}

async function getPapers() {
	let doisStream = fs.createWriteStream(doisOutputFile, {flags:'a'});

    let db = await connect();
    let conn = db.db('pub_finder');
    let batch = conn.collection('papers').initializeUnorderedBulkOp();
    let count = 0;

	let line;
	let docs = [];
	while (line = liner.next()) {
	    let doi = line.toString('ascii');
	    let result = {};
	    let doc = {};
	    try {
		    result = await query(conn, 'aminer', { doi: doi});

		    if (result.length > 0) {
		    	doc = transform(result[0], 'aminer');
		    	batch.insert(doc);
		    } else {
		    	result = await query(conn, 'mag', { doi: doi });
		    	if (result.length > 0) {
		    		doc = transform(result[0], 'mag');
		    		batch.insert(doc);
		    	} else {
		    		result = await query(conn, 'crossref', { DOI: doi });
		    		if (result.length > 0) {
			    		doc = transform(result[0], 'crossref');
			    		batch.insert(doc);
			    	} else {
		    			doisStream.write(doi + "\n");
			    	}
		    	}
		    }

			if (++count % 10000 === 0) {
		    	console.log(count);
		    	await execute(batch);
    			batch = conn.collection('papers').initializeUnorderedBulkOp();
		    }
		} catch (err) {
			console.log(err);
		}
	}

	await execute(batch);
  	db.close();
	doisStream.end();
	process.exit(0);    
}

getPapers();
