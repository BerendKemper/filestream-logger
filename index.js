"use strict";
const fs = require("fs");
const path = require("path");
const CallbackQueue = require("ca11back-queue");
const defaultFormatter = (data, callback) => callback(data.join(" "));
const destroyEmptyLogfile = filepath => {
	setTimeout(() => fs.readFile(filepath, { flag: 'r' }, (err, data) => {
		if (err === null && data.length === 0)
			fs.unlinkSync(filepath);
	}), 1000);
};
const xLog = xLogger => {
	if (!extender[xLogger.dirpath])
		throw new TypeError(`Can only extend FilestreamLoggers, found ${typeof xLogger}`);
	return extender[xLogger.dirpath]
};
const extendLoggers = loggers => {
	const extend = new Array(loggers.length);
	let ix = -1;
	while (++ix < loggers.length)
		extend[ix] = xLog(loggers[ix]);
	return extend;
};
const extender = {};
/**
 * Makes a log function. The log function invokes the formatter then streams the
 * formatted string the log file. Extended log functions will stream it's formatted
 * data to all x-FilestreamLoggers. Write your own formatter, it's a freedom.
 * @param {string} type
 * @param {Object} options 
 * @param {string} options.dir
 * @param {string} options.name
 * @param {Function} options.formatter 
 * @param {Array} options.extend
 * @returns an FilestreamLogger instance is a function
 **/
const makeLogger = (type, options) => {
	const dirpath = path.join(options.dir || "loggers", type);
	if (extender[dirpath])
		throw Error(`A logger at dirpath "${dirpath}" already exists`);
	let extend = options.extend || [];
	if (!Array.isArray(extend))
		throw new TypeError("the parameter extend must be an Array");
	if (extend.length > 0)
		extend = extendLoggers(extend);
	const formatter = options.formatter || defaultFormatter;
	const queue = new CallbackQueue();
	queue.push(callback => fs.mkdir(dirpath, { recursive: true }, callback));
	let _name = options.name || new Date().toLocaleDateString();
	let _filepath = path.join(dirpath, _name + ".log");
	let _writable;
	queue.push(callback => {
		_writable = fs.createWriteStream(_filepath, { flags: "a+" });
		_writable.once("ready", callback);
	});
	extender[dirpath] = logBuffer => queue.push(callback => _writable.write(logBuffer, callback));
	function FilestreamLogger() {
		return Object.setPrototypeOf(({
			[type](...data) {
				formatter(data, logString => {
					const logBuffer = Buffer.from(logString + "\n", "utf8");
					queue.push(callback => _writable.write(logBuffer, callback));
					for (const xLog of extend)
						xLog(logBuffer);
				})
			}
		})[type], FilestreamLogger.prototype);
	};
	FilestreamLogger.prototype = {
		/**
		 * Readable property of the dirpath is used internally to store the xLog which allows
		 * extending loggers.
		 */
		get dirpath() {
			return dirpath;
		},
		/**
		 * Readable property of the path from the file that is currently being logged to.
		 */
		get filepath() {
			return _filepath;
		},
		/**
		 * This method creates a new file to which the logger logs to and it updates the
		 * readable property filepath.
		 * @param {String} name 
		 */
		setName(name) {
			if (name !== _name) {
				_name = name;
				const oldFilepath = _filepath;
				_filepath = path.join(dirpath, name + ".log");
				queue.push(callback => {
					const writable = fs.createWriteStream(_filepath, { flags: "a+" });
					writable.once("ready", () => {
						_writable.end(() => {
							_writable = writable;
							callback();
							destroyEmptyLogfile(oldFilepath);
						});
					});
				});
			}
		},
		/**
		 * This method pushes the callback in a queue and the callback is invoked only
		 * when all previous queued functions have finished.
		 * @param {Function} callback 
		 */
		onReady(callback) {
			if (typeof callback !== "function")
				throw new TypeError("callback must be a function");
			queue.push(_callback => _callback(callback()));
		},
		/**
		 * Removes the internal reference, ends the writestream, clears the queue and
		 * destroys the log file at the current filepath if it has no content.
		 */
		destroy() {
			queue.push(() => {
				_writable.end(() => {
					delete (extender[dirpath]);
					destroyEmptyLogfile(_filepath);
					queue.clear();
				});
			});
		},
		/**
		 * Extend a filestreamLoggers after it's been created.
		 * @param {FilestreamLogger} filestreamLogger 
		 */
		extend(filestreamLogger) {
			queue.push(callback => {
				extend.push(xLog(filestreamLogger));
				callback();
			});
		}
	};
	Object.setPrototypeOf(FilestreamLogger, Function);
	Object.setPrototypeOf(FilestreamLogger.prototype, Function.prototype);
	return new FilestreamLogger();
};
module.exports = makeLogger;