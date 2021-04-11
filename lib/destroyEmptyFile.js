"use strict";
const fs = require("fs");
const destroyEmptyfile = filepath => {
	const data = fs.readFileSync(filepath, { flag: 'r' });
	if (data.length === 0)
		fs.unlinkSync(filepath);
};
module.exports = destroyEmptyfile;