"use strict";
const fs = require("fs");
const destroyEmptyfile = require("./destroyEmptyFile");
const onWritableClose = (filepath, writable) => {
	writable.once("close", () => {
		destroyEmptyfile(filepath);
	});
};
module.exports = onWritableClose;