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
class FilestreamLogger extends ExtensibleFunction {
    #extendedFrom = [];
    #extendingTo = [];
    #filepath = null;
    #dirpath = null;
    #queue = null;
    #fd = null;
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
    #queueLogBuffer(logger, next, lineBuffer) {
        const req = new FSReqCallback();
        req.oncomplete = logger.#logBufferWrite;
        req.next = next;
        writeBuffer(logger.#fd, lineBuffer, 0, lineBuffer.length, null, req);
    }
    #logBufferWrite(error, bytesWritten) {
        if (error)
            throw error;
        this.next();
    }
    #queueOpenFile(logger, next, filepath) {
        const req = new FSReqCallback();
        req.oncomplete = logger.#openFileAfterMkdir;
        req.context = { filepath, next, logger };
        mkdir(path.toNamespacedPath(logger.#dirpath), 0o777, true, req);
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
    #queueSetName(logger, next, context) {
        context.next = next;
        const req = new FSReqCallback();
        req.oncomplete = logger.#destroyAfterOpen;
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
    destroy(callback = dirpath => console.log("destroyed", dirpath)) {
        this.#queue.push(this.#queueDestroy, {
            logger: this,
            filepath: this.#filepath,
            callback,
        });
    }
    #queueDestroy(logger, next, context) {
        const req = new FSReqCallback();
        req.oncomplete = logger.#destroyAfterStat;
        req.context = context;
        fstat(logger.#fd, false, req);
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
    get dirpath() {
        return this.#dirpath;
    }
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