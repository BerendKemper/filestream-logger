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
class ExtensibleFunction extends Function {
    constructor(f) {
        return Object.setPrototypeOf(f, new.target.prototype);
    };
};
const filestreamLoggers = {};
/**@callback formattedCallback @param {string} formattedString*/
/**@callback formatter @param {array} data @param {formattedCallback} callback*/
/**@callback onDestroyed @param {string} dirpath*/
class FilestreamLogger extends ExtensibleFunction {
    #extendedFrom = [];
    #extendingTo = [];
    #filepath = null;
    #dirpath = null;
    #queue = null;
    #fd = null;
    /**The fileStreamLogger is a log function and a class instance at the same time. The fileStreamLogger opens files for appending. Logging with fileStreamLogger first formats data into a string and writes a buffer from that string to the file and extended fileStreamLoggers.
     * @param {string} type @param {{dir:string name:string formatter:formatter extend:FilestreamLogger[]}} options**/
    constructor(type, options = {}) {
        super(new.target.#selfConstructor);
        this.#dirpath = path.join(options?.dir || "loggers", type);
        if (filestreamLoggers[this.#dirpath])
            throw new Error(`A logger at dirpath "${this.#dirpath}" already exists`);
        filestreamLoggers[this.#dirpath] = this;
        this.#queue = new CallbackQueue(this);
        this.#filepath = path.join(this.#dirpath, (options?.name || yyyymmdd()) + ".log");
        if (Array.isArray(options?.extend) && options.extend.length > 0)
            this.#extend(options.extend);
        if (typeof options?.formatter === "function")
            this.formatter = options.formatter;
        this.#queue.push(this.#queueOpenFile, this.#filepath);
    }
    static get #selfConstructor() {
        const self = (...data) => self.formatter(data, writePtr);
        const writePtr = line => self.#write(Buffer.from(line + "\n", "utf8"));
        return self;
    }
    /**The format method this fileStreamLoggers uses to serialize data.
     * @param {array} data @param {formattedCallback} callback*/
    formatter(data, callback) {
        callback(data.join(" "));
    }
    #write(lineBuffer) {
        this.#queue.push(this.#queueLogBuffer, lineBuffer);
        for (const xLogger of this.#extendingTo)
            xLogger.#xWrite(lineBuffer);
    }
    #xWrite(lineBuffer) {
        this.#queue.push(this.#queueLogBuffer, lineBuffer);
    }
    #queueLogBuffer(next, lineBuffer) {
        const req = new FSReqCallback();
        req.oncomplete = this.#logBufferWrite;
        req.next = next;
        writeBuffer(this.#fd, lineBuffer, 0, lineBuffer.length, null, req);
    }
    #logBufferWrite(error, bytesWritten) {
        if (error)
            throw error;
        this.next();
    }
    #queueOpenFile(next, filepath) {
        const req = new FSReqCallback();
        req.oncomplete = this.#openFileAfterMkdir;
        req.context = { filepath, next, logger: this };
        mkdir(path.toNamespacedPath(this.#dirpath), 0o777, true, req);
    }
    #openFileAfterMkdir(error) {
        if (error)
            throw error;
        const { context } = this;
        const req = new FSReqCallback();
        req.oncomplete = context.logger.#openFileInitialAfterOpen;
        req.context = context;
        open(path.toNamespacedPath(context.filepath), o_AppendCreat, 0o666, req);
    }
    #openFileInitialAfterOpen(error, fd) {
        if (error)
            throw error;
        this.context.logger.#fd = fd;
        this.context.next();
    }
    /**Extend more filestreamLoggers (even after it's been created).
     * @param {FilestreamLogger} filestreamLogger*/
    extend(filestreamLoggers) {
        this.#extend(Array.isArray(filestreamLoggers)
            ? filestreamLoggers
            : [filestreamLoggers])
        return this;
    }
    #extend(loggers) {
        for (let logger of loggers) {
            logger = filestreamLoggers[logger.#dirpath];
            if (logger.#extendedFrom.indexOf(this) > -1)
                throw new Error("Cannot extend a filestreamLogger more than once");
            logger.#extendedFrom.push(this);
            this.#extendingTo.push(logger);
        }
    }
    /**This method pushes the callback in a queue, the callback is invoked only when all previous queued functions have finished.
     * @param {function} callback*/
    onReady(callback) {
        if (typeof callback !== "function")
            throw new TypeError("callback must be a function");
        this.#queue.push(this.#queueCallback, callback);
        return this;
    }
    #queueCallback(next, callback) {
        callback();
        next();
    }
    /**This method creates a new file to which the fileStreamLoggers logs to and it updates the readable property filepath.
     * @param {string} name*/
    setName(name) {
        const filepath = this.#filepath;
        const newFilepath = this.#filepath = path.join(this.#dirpath, name + ".log");
        if (newFilepath !== filepath)
            this.#queue.push(this.#queueSetName, {
                logger: this,
                filepathNamespaced: path.toNamespacedPath(filepath),
                newFilepathNamespaced: path.toNamespacedPath(newFilepath),
            });
        return this;
    }
    #queueSetName(next, context) {
        context.next = next;
        const req = new FSReqCallback();
        req.oncomplete = this.#destroyAfterOpen;
        req.context = context;
        open(context.newFilepathNamespaced, o_AppendCreat, 0o666, req);
    }
    #destroyAfterOpen(error, fd) {
        if (error)
            throw error;
        const req = new FSReqCallback();
        req.oncomplete = this.context.logger.#destroyAfterStat;
        req.context = this.context;
        req.context.fd = fd;
        fstat(this.context.logger.#fd, false, req);
    };
    #setNameAfterClose(error) {
        if (error)
            throw error;
        const { context } = this;
        context.logger.#fd = context.fd;
        if (context.bytes === 0) {
            const req = new FSReqCallback();
            req.oncomplete = context.next;
            return unlink(context.filepathNamespaced, req);
        }
        context.next();
    }
    /**Closes the file descriptor, destroys the log file at the fileStreamLogger's filepath if it has no content, removes the directory if there were no (log-)files and removes this fileStreamLogger from all fileStreamLoggers that were extended from this fileStreamLogger.
     * @param {onDestroyed} callback*/
    destroy(callback = dirpath => console.log("destroyed", dirpath)) {
        this.#queue.push(this.#queueDestroy, {
            logger: this,
            filepath: this.#filepath,
            callback,
        });
    }
    #queueDestroy(next, context) {
        const req = new FSReqCallback();
        req.oncomplete = this.#destroyAfterStat;
        req.context = context;
        fstat(this.#fd, false, req);
    }
    #destroyAfterStat(error, stats) {
        if (error)
            throw error;
        const { context } = this;
        context.bytes = (stats[1] & S_IFMT) === S_IFREG ? stats[8] : 0;
        const req = new FSReqCallback();
        req.oncomplete = context.newFilepathNamespaced
            ? context.logger.#setNameAfterClose
            : context.logger.#destroyafterClose;
        req.context = context;
        close(context.logger.#fd, req);
    }
    #destroyafterClose(error) {
        if (error)
            throw error;
        const { context } = this;
        if (context.bytes === 0) {
            const req = new FSReqCallback();
            req.oncomplete = context.logger.#destroyAfterUnlink;
            req.context = context;
            return unlink(path.toNamespacedPath(context.logger.#filepath), req);
        }
        context.logger.#destroy(context);
    }
    #destroyAfterUnlink(error) {
        if (error)
            throw error;
        const { context } = this;
        context.dirpathNameSpaced = path.toNamespacedPath(context.logger.#dirpath);
        const req = new FSReqCallback();
        req.oncomplete = context.logger.#destroyAfterReaddir;
        req.context = context;
        readdir(context.dirpathNameSpaced, "utf8", false, req);
    }
    #destroyAfterReaddir(error, files) {
        if (error)
            throw error;
        const { context } = this;
        if (files.length === 0) {
            const req = new FSReqCallback();
            req.oncomplete = context.logger.#destroyAfterRmdir;
            req.context = context;
            return rmdir(context.dirpathNameSpaced, req);
        }
        context.logger.#destroy(context);
    }
    #destroyAfterRmdir(error) {
        if (error)
            throw error;
        this.context.logger.#destroy(this.context);
    }
    #destroy(context) {
        this.#queue.destroy();
        this.#queue = null;
        this.formatter = null;
        for (const xLogger of this.#extendingTo)
            xLogger.#extendedFrom.splice(xLogger.#extendedFrom.indexOf(this), 1);
        for (const xLogger of this.#extendedFrom)
            xLogger.#extendingTo.splice(xLogger.#extendingTo.indexOf(this), 1);
        this.#extendingTo.length = 0;
        this.#extendedFrom.length = 0;
        this.#extendingTo = null;
        this.#extendedFrom = null;
        delete (filestreamLoggers[this.#dirpath]);
        context.callback(this.#dirpath);
    }
    /**Readable property of the dirpath is used internally to store the fileStreamLogger which allows extending fileStreamLoggers.*/
    get dirpath() {
        return this.#dirpath;
    }
    /**Readable property of the path from the file that is currently being logged to.*/
    get filepath() {
        return this.#filepath;
    }
    static destroyAll(callback = () => console.log("closed all fileOperators")) {
        if (typeof callback !== "function")
            throw new TypeError("callback is not a function");
        const awaitCounter = dirpath => {
            console.log("destroyed", dirpath);
            if (--counter === 0)
                process.nextTick(callback);
        };
        let counter = 0;
        for (const dirpath in filestreamLoggers)
            filestreamLoggers[dirpath].destroy(awaitCounter, counter++);
    }
}
module.exports = FilestreamLogger;