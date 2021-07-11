"use strict";
const { mkdir, open, fstat, writeBuffer, close, unlink, readdir, rmdir, FSReqCallback } = process.binding('fs');
const { fs: { S_IFMT, S_IFREG } } = process.binding('constants');
const o_AppendCreat = function loadAppendPlus() {
    const { O_APPEND, O_CREAT, O_WRONLY } = require("fs").constants;
    return O_APPEND | O_CREAT | O_WRONLY;
}();
const path = require("path");
const CallbackQueue = require("ca11back-queue");
const yyyymmdd = require("filestream-logger/lib/yyyymmdd");
const privFilestreamLoggers = {};
const getPrivateFilestreamLogger = filestreamLogger => {
    if (!privFilestreamLoggers[filestreamLogger.dirpath])
        throw new TypeError(`Can only extend filestreamLoggers, found ${typeof filestreamLogger}`);
    return privFilestreamLoggers[filestreamLogger.dirpath];
};
function makeDir(next) {
    const req = new FSReqCallback();
    req.oncomplete = next;
    mkdir(path.toNamespacedPath(this.dirpath), 0o777, true, req)
};
function openFileInitial(next, filepath) {
    const req = new FSReqCallback();
    req.oncomplete = openFileInitialAfterOpen;
    req.logger = this;
    req.next = next;
    open(filepath, o_AppendCreat, 0o666, req);
};
function openFileInitialAfterOpen(error, fd) {
    if (error) throw error;
    this.next(this.logger.fd = fd);
};
function queueLogBuffer(next, lineBuffer) {
    const req = new FSReqCallback();
    req.oncomplete = logBufferWrite;
    req.next = next;
    writeBuffer(this.fd, lineBuffer, 0, lineBuffer.length, null, req);
};
function logBufferWrite(error, bytesWritten) {
    if (error) throw error;
    this.next();
};
class PrivateFilestreamLogger {
    extending = []
    extendedFrom = [];
    queue = new CallbackQueue(this);
    constructor(filestreamLogger, dirpath, options) {
        this.public = filestreamLogger;
        this.dirpath = dirpath;
        this.filepath = path.join(dirpath, (options?.name || yyyymmdd()) + ".log");
        if (Array.isArray(options?.extend) && options.extend.length > 0)
            this.extend(options.extend);
        if (typeof options?.formatter === "function")
            this.public.formatter = options.formatter;
        this.queue.push(makeDir);
        this.queue.push(openFileInitial, this.filepath);
    };
    write(lineBuffer) {
        this.queue.push(queueLogBuffer, lineBuffer);
        for (const xLogger of this.extending)
            xLogger.xWrite(lineBuffer);
    };
    xWrite(lineBuffer) {
        this.queue.push(queueLogBuffer, lineBuffer);
    };
    extend(filestreamLoggers) {
        for (let filestreamLogger of filestreamLoggers) {
            filestreamLogger = getPrivateFilestreamLogger(filestreamLogger);
            if (filestreamLogger.extendedFrom.indexOf(this) > -1) throw new Error("Cannot extend a filestreamLogger more than once");
            filestreamLogger.extendedFrom.push(this);
            this.extending.push(filestreamLogger);
        }
    };
    destroy(context) {
        const { removePrivate, callback } = context;
        removePrivate.call(this.public);
        this.queue.destroy();
        this.queue = null;
        this.public.formatter = null;
        this.public = null;
        for (const xLogger of this.extending)
            xLogger.extendedFrom.splice(xLogger.extendedFrom.indexOf(this), 1);
        for (const xLogger of this.extendedFrom)
            xLogger.extending.splice(xLogger.extending.indexOf(this), 1);
        this.extending = null;
        this.extendedFrom = null;
        delete (privFilestreamLoggers[this.dirpath]);
        callback(this.dirpath);
    };
};
class ExtensibleFunction extends Function {
    constructor(f) {
        return Object.setPrototypeOf(f, new.target.prototype);
    };
};
function queueCallback(next, callback) {
    callback();
    next();
};
function queueSetName(next, context) {
    context.next = next;
    context.logger = this
    const req = new FSReqCallback();
    req.oncomplete = destroyAfterOpen;
    req.context = context;
    context.whichAfterClose = setNameAfterClose;
    open(context.newFilepath, o_AppendCreat, 0o666, req);
};
function queueDestroy(next, context) {
    context.logger = this
    context.filepath = this.filepath;
    const req = new FSReqCallback();
    req.oncomplete = destroyAfterStat;
    req.context = context;
    fstat(req.context.logger.fd, false, req);
};
function destroyAfterOpen(error, fd) {
    if (error) throw error;
    const req = new FSReqCallback();
    req.oncomplete = destroyAfterStat;
    req.context = this.context;
    req.context.fd = fd;
    fstat(req.context.logger.fd, false, req);
};
function destroyAfterStat(error, stats) {
    if (error) throw error;
    const req = new FSReqCallback();
    req.oncomplete = this.context.whichAfterClose;
    req.context = this.context;
    req.context.bytes = (stats[1] & S_IFMT) === S_IFREG ? stats[8] : 0;
    close(req.context.logger.fd, req);
};
function destroyafterClose(error) {
    if (error) throw error;
    if (this.context.bytes === 0) {
        const req = new FSReqCallback();
        req.oncomplete = destroyAfterUnlink;
        req.context = this.context;
        req.context.namespacePath = path.toNamespacedPath(this.context.filepath)
        return unlink(req.context.namespacePath, req);
    }
    this.context.logger.destroy(this.context);
};
function destroyAfterUnlink(error) {
    if (error) throw error;
    const req = new FSReqCallback();
    req.oncomplete = destroyAfterReaddir;
    req.context = this.context;
    req.context.dirpath = path.toNamespacedPath(req.context.logger.dirpath);
    readdir(req.context.dirpath, "utf8", false, req);
};
function destroyAfterReaddir(error, files) {
    if (error) throw error;
    if (files.length === 0) {
        const req = new FSReqCallback();
        req.oncomplete = destroyAfterRmdir;
        req.context = this.context;
        return rmdir(req.context.dirpath, req);
    }
    this.context.logger.destroy(this.context);
};
function destroyAfterRmdir(error) {
    if (error) throw error;
    this.context.logger.destroy(this.context);
};
function setNameAfterClose(error) {
    if (error) throw error;
    this.context.logger.fd = this.context.fd;
    if (this.context.bytes === 0) {
        const req = new FSReqCallback();
        req.oncomplete = this.context.next;
        return unlink(path.toNamespacedPath(this.context.filepath), req);
    }
    this.context.next();
};
/**@callback formattedCallback @param {string} formattedString*/
/**@callback formatter @param {array} data @param {formattedCallback} callback*/
/**@callback onDestroyed @param {string} dirpath*/
class FilestreamLogger extends ExtensibleFunction {
    #private;
    #constructMore(type, options) {
        const dirpath = path.join(options?.dir || "loggers", type);
        if (privFilestreamLoggers[dirpath])
            throw new Error(`A logger at dirpath "${dirpath}" already exists`);
        this.#private = privFilestreamLoggers[dirpath] = new PrivateFilestreamLogger(this, dirpath, options);
    };
    /**The fileStreamLogger is a log function and a class instance at the same time. The fileStreamLogger opens files for appending. Logging with fileStreamLogger first formats data into a string and writes a buffer from that string to the file and extended fileStreamLoggers.
     * @param {string} type @param {{dir:string name:string formatter:formatter extend:array}} options**/
    constructor(type, options = {}) {
        super((...data) => this.formatter(data, line => this.#private.write(Buffer.from(line + "\n", "utf8"))));
        this.#constructMore(type, options);
    };
    /**The format method this fileStreamLoggers uses to serialize data.
     * @param {array} data @param {formattedCallback} callback*/
    formatter(data, callback) {
        callback(data.join(" "));
    };
    /**This method pushes the callback in a queue, the callback is invoked only when all previous queued functions have finished.
     * @param {function} callback*/
    onReady(callback) {
        if (typeof callback !== "function")
            throw new TypeError("callback must be a function");
        this.#private.queue.push(queueCallback, callback);
        return this;
    };
    /**Extend more filestreamLoggers (even after it's been created).
     * @param {FilestreamLogger} filestreamLogger*/
    extend(filestreamLoggers) {
        Array.isArray(filestreamLoggers)
            ? this.#private.extend(filestreamLoggers)
            : this.#private.extend([filestreamLoggers]);
        return this;
    };
    /**This method creates a new file to which the fileStreamLoggers logs to and it updates the readable property filepath.
     * @param {string} name*/
    setName(name) {
        const filepath = this.#private.filepath;
        const newFilepath = this.#private.filepath = path.join(this.#private.dirpath, name + ".log");
        if (newFilepath !== filepath)
            this.#private.queue.push(queueSetName, {
                filepath: path.toNamespacedPath(filepath),
                newFilepath: path.toNamespacedPath(newFilepath),
                whichAfterClose: setNameAfterClose
            });
        return this;
    };
    /**Closes the file descriptor, destroys the log file at the fileStreamLogger's filepath if it has no content, removes the directory if there were no (log-)files and removes this fileStreamLogger from all fileStreamLoggers that were extended from this fileStreamLogger.
     * @param {onDestroyed} callback*/
    destroy(callback = dirpath => console.log("destroyed", dirpath)) {
        this.#private.queue.push(queueDestroy, {
            filepath: path.toNamespacedPath(this.#private.filepath),
            whichAfterClose: destroyafterClose,
            removePrivate: this.#removePrivate,
            callback,
        });
    };
    #removePrivate() {
        this.#private = null;
    };
    /**Readable property of the dirpath is used internally to store the fileStreamLogger which allows extending fileStreamLoggers.*/
    get dirpath() {
        return this.#private.dirpath;
    };
    /**Readable property of the path from the file that is currently being logged to.*/
    get filepath() {
        return this.#private.filepath;
    };
    static destroyAll(callback = () => console.log("closed all fileOperators")) {
        if (typeof callback !== "function") throw new TypeError("callback is not a function");
        const awaitCounter = dirpath => {
            console.log("destroyed", dirpath);
            if (--counter === 0)
                process.nextTick(callback);
        };
        let counter = 0;
        for (const dirpath in privFilestreamLoggers)
            privFilestreamLoggers[dirpath].public.destroy(awaitCounter, counter++);
    };
};
module.exports = FilestreamLogger;