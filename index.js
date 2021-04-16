"use strict";
const fs = require("fs");
const path = require("path");
const CallbackQueue = require("ca11back-queue");
const yyyymmdd = require("filestream-logger/lib/yyyymmdd");
class ExtensibleFunction extends Function {
	constructor(f) {
		return Object.setPrototypeOf(f, new.target.prototype);
	};
};
class CrossLogger {
	extendedFrom = [];
	constructor(dirpath, log) {
		crossLoggers[dirpath] = this;
		this.log = log;
	};
	extend(xList) {
		if (this.extendedFrom.indexOf(xList) > -1)
			throw new Error("Cannot extend a FilestreamLogger more than once");
		this.extendedFrom.push(xList);
		return this.log;
	};
	destroy(dirpath) {
		for (const xList of this.extendedFrom)
			xList.splice(xList.indexOf(this.log), 1);
		delete (crossLoggers[dirpath]);
		this.log = null;
		return this;
	};
};
const getCrossLoggers = filestreamLogger => {
	if (!crossLoggers[filestreamLogger.dirpath])
		throw new TypeError(`Can only extend FilestreamLoggers, found ${typeof filestreamLogger}`);
	return crossLoggers[filestreamLogger.dirpath];
};
const crossLoggers = {};
class FilestreamLogger extends ExtensibleFunction {
	#queue = new CallbackQueue();
	#hasNotOpened = true;
	#extending;
	#filepath;
	#dirpath;
	#fd;
	#x;
	#extend(loggers) {
		let ix = -1;
		this.#extending = new Array(loggers.length);
		while (++ix < loggers.length)
			this.#extending[ix] = getCrossLoggers(loggers[ix]).extend(this.#extending);
	};
	#write(lineBuffer) {
		this.#queue.push(callback => fs.write(this.#fd, lineBuffer, callback));
		for (const xLog of this.#extending)
			xLog(lineBuffer);
	};
	#xWrite(lineBuffer) {
		this.#queue.push(callback => fs.write(this.#fd, lineBuffer, callback));
	};
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
	constructor(type, options = {}) {
		super((...data) => this.formatter(data, line => this.#write(Buffer.from(line + "\n", "utf8"))));
		this.#dirpath = path.join(options.dir || "loggers", type);
		if (crossLoggers[this.#dirpath])
			throw new Error(`A logger at dirpath "${this.#dirpath}" already exists`);
		this.#filepath = path.join(this.#dirpath, options.name || yyyymmdd() + ".log");
		this.#x = crossLoggers[this.#dirpath] = new CrossLogger(this.#dirpath, lineBuffer => this.#xWrite(lineBuffer));
		Array.isArray(options.extend) ? this.#extend(options.extend) : this.#extending = [];
		if (typeof options.formatter === "function")
			this.formatter = options.formatter;
		this.#queue.push(callback => fs.mkdir(this.#dirpath, { recursive: true }, callback));
		((filepath) => {
			this.#queue.push(callback => {
				fs.open(filepath, "a+", 0o666, (err, fd) => {
					if (err) throw err;
					this.#fd = fd;
					callback();
				});
			});
		})(this.#filepath);
	};
	/**
	 * aapje
	 * @param {Array} data 
	 * @param {Function} callback 
	 */
	formatter(data, callback) {
		callback(data.join(" "));
	};
	/**
	 * This method pushes the callback in a queue, the callback is invoked only when
	 * all previous queued functions have finished.
	 * @param {Function} callback 
	 */
	onReady(callback) {
		if (typeof callback !== "function")
			throw new TypeError("callback must be a function");
		this.#queue.push(_callback => _callback(callback()));
		return this;
	};
	/**
	 * Extend a filestreamLoggers after it's been created.
	 * @param {FilestreamLogger} filestreamLogger 
	 */
	extend(filestreamLogger) {
		this.#extending.push(getCrossLoggers(filestreamLogger).extend(this.#extending));
		return this;
	};
	/**
	 * This method creates a new file to which the logger logs to and it updates the
	 * readable property filepath.
	 * @param {String} name 
	 */
	setName(name) {
		const oldFilepath = this.#filepath;
		const newFilepath = this.#filepath = path.join(this.#dirpath, name + ".log");
		this.#queue.push(callback => {
			fs.open(newFilepath, "a+", 0o666, (error, fd) => {
				if (error) throw error;
				fs.read(this.#fd, Buffer.alloc(1), 0, 1, 0, (error, bytesRead, buffer) => {
					fs.close(this.#fd, () => {
						this.#fd = fd;
						bytesRead === 0 ? fs.unlink(oldFilepath, callback) : callback();
					});
				});
			});
		});
		return this;
	};
	/**
	 * Ends the writestream, destroys the log file at the writestream's filepath if it has
	 * no content, removes this logger's cross-log function from all from all loggers
	 * and clears the callback-queue.
	 * @param {Function} callback 
	 */
	destroy(callback = dirpath => console.log("destroyed", dirpath)) {
		this.#queue.push(() => {
			fs.read(this.#fd, Buffer.alloc(1), 0, 1, 0, (error, bytesRead, buffer) => {
				fs.close(this.#fd, () => {
					this.#x.destroy(this.#dirpath);
					this.#x = null;
					this.#queue.clear();
					bytesRead === 0 ? fs.unlink(this.#filepath, () => callback(this.#dirpath)) : callback(this.#dirpath);
				});
			});
		});
	};
	/**
	 * Readable property of the dirpath is used internally to store the xLog which allows
	 * extending loggers.
	 */
	get dirpath() {
		return this.#dirpath;
	};
	/**
	 * Readable property of the path from the file that is currently being logged to.
	 */
	get filepath() {
		return this.#filepath;
	};
};
module.exports = FilestreamLogger;