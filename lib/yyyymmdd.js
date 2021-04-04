"use strict";
const yyyymmdd = () => {
	const date = new Date();
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
};
module.exports = yyyymmdd;