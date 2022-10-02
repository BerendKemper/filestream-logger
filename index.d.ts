declare class FilestreamLogger extends Function {
    /**The fileStreamLogger is a log function and a class instance at the same time. The fileStreamLogger opens files for appending. Logging with fileStreamLogger first formats data into a string and writes a buffer from that string to the file and extended fileStreamLoggers.*/
    constructor(type: string, options: Options)
    /**The format method this fileStreamLoggers uses to serialize data.*/
    formatter(this: FilestreamLogger, data, callback): void
    /**Extend more filestreamLoggers.*/
    extend(filestreamLoggers: FilestreamLogger[]): this
    /**This method pushes the callback in a queue, the callback is invoked only when all previous queued functions have finished.*/
    onReady(callback: () => void): this
    /**This method creates a new file to which the fileStreamLoggers logs to and it updates the readable property filepath.*/
    setName(name: string): this
    /**Closes the file descriptor, destroys the log file at the fileStreamLogger's filepath if it has no content, removes the directory if there were no (log-)files and removes this fileStreamLogger from all fileStreamLoggers that were extended from this fileStreamLogger.*/
    destroy(callback: (dirpath: string) => void): void
    /**Readable property of the dirpath is used internally to store the fileStreamLogger which allows extending fileStreamLoggers.*/
    dirpath: string
    /**Readable property of the path from the file that is currently being logged to.*/
    filepath: string
    static destroyAll(callback: () => void): void
}
interface Options {
    dir: string
    name: string
    formatter: formatter
    extend: FilestreamLogger[]
}
type formatter = (this: FilestreamLogger, data, callback) => void;
export = FilestreamLogger;