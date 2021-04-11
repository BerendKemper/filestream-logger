"use strict";
const fs = require("fs");
const destroyEmptyfile = require("./destroyEmptyFile");
const onWritableClose = (filepath, writable) => {
	writable.on("close", () => {
		destroyEmptyfile(filepath);
	});
};
module.exports = onWritableClose;