"use strict";
const fs = require("fs");
const destroyEmptyfile = filepath => {
	fs.readFile(filepath, { flag: 'r' }, (err, data) => {
		if (err === null && data.length === 0)
			fs.unlinkSync(filepath);
	});
};
module.exports = destroyEmptyfile;