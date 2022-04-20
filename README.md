# filestream-logger
<div>
    A logger that creates a log-dir, that may change the logger's filename, that may use a formatter and that allows and extending various logger types.
</div>
<pre><code>npm i filestream-logger</code></pre>

```javascript
const FilestreamLogger = require("filestream-logger");
```
<div>
    <h2>Class: <code>FilestreamLogger</code></h2>
</div>

<div>
    <h3><code>new FilestreamLogger(type[,options])</code></h3>
    <ul>
        <details>
            <summary>
                <code>type</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a> parameter is <b>required!</b>
            </summary>
            <div>
                The type parameter determines the name of the sub-directory in which the filestreamLogger creates log-files. If the sub-directory did not exists the creation is asynchronously queued.
            </div>
        </details>
        <details>
            <summary>
                <code>options</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object">&lt;Object&gt;</a>
            </summary>
            <ul>
                <details>
                    <summary>
                        <code>dir</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a> Default: <code>"loggers"</code>
                    </summary>
                    <div>
                        The dir option determines the name of the main-directory in which the filestreamLogger creates a sub-directory which in turn is where the log-files are created. If the main-directory did not exists the creation is asynchronously queued.
                    </div>
                </details>
                <details>
                    <summary>
                        <code>name</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a> Default: <code>new Date().toLocaleDateString()</code>
                    </summary>
                    <div>
                        The name option determines how the first log-file is named. If the log-file did not exists the creation is asynchronously queued.
                    </div>
                </details>
                <details>
                    <summary>
                        <code>formatter</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a> Default: <code>(data, callback) => callback(data.join(" "))</code>
                    </summary>
                    <div><b><code>function formatter(data, callback) {}</code></b></div>
                    <ul>
                        <details>
                            <summary>
                                <code>data</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>
                            </summary>
                            <div>
                                If the formatter cannot format objects into a formatted string, it is recommended that the data should contain only <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_values">&lt;primitive values&gt;</a>. This does not apply if a developer wrote a formatter that can format objects into formatted string such as console.log can.
                            </div>
                        </details>
                        <details>
                            <summary>
                                <code>callback</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a> parameter is <b>required!</b>
                            </summary>
                            <div>
                                Invoke callback and pass over a fromatted-string so that it can be written to the log-file.
                            </div>
                        </details>
                    </ul>
                    <div>
                        The formatter is a function that must produce a fromatted-string from the items of the data <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>. When the formatter has finished to produce a fromatted-string, callback must be invoked and the fromatted-string must be passed as parameter.
                    </div>
                </details>
                <details>
                    <summary>
                        <code>extend</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>
                    </summary>
                    <div>
                        The extend option must contain filestreamLoggers. The created filestreamLogger stores the extended filestreamLoggers. Whenever this filestreamLogger is invoked to log data, the formatted text is also passed over to all extended filestreamLoggers. Checkout the examples to see how an logger.error is extended with a logger.log.
                    </div>
                </details>
            </ul>
        </details>
    </ul>
</div>

<div>
    <h3><code>filestreamLogger(...data)</code></h3>
    <ul>
        <details>
            <summary>
                <code>...data</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>
            </summary>
            <div>
                The data catches all parameters passed over into a single array, just like <a href="https://developer.mozilla.org/en-US/docs/Web/API/Console/log">console.log(...data)</a>. The data is passed over as a whole array to formatter.
            </div>
        </details>
    </ul>
    <div>
        The filestreamLogger instance is the logging <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">Function</a> and when invoked it immediately invokes formatter followed by writing the formatted string to the log-file.
    </div>
</div>

<div>
    <h3><code>filestreamLogger.setName(name)</code></h3>
    <ul>
        <details>
            <summary>
                <code>name</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a>
            </summary>
            <div>
                If name is set to the name it already had nothing will happen.
            </div>
        </details>
    </ul>
    <div>
        This method immediately updates the name and filepath and when all previously queued functions have finished it <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_open_path_flags_mode_callback">opens</a> a new fd to the new filepath, checks the size of the old filepath through <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_fstat_fd_options_callback">fstat</a> to see if it the log-file has content, <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_close_fd_callback">closes</a> the old filepath and <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_unlink_path_callback">deletes</a> the old log-file if it has no content.
    </div>
</div>

<div>
    <h3><code>filestreamLogger.onReady(callback)</code></h3>
    <ul>
        <details>
            <summary>
                <code>callback</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a>
            </summary>
            <div><b><code>function callback() {}</code></b></div>
            <div>
                If callback is not a function the extecution of callback throws a TypeError.
            </div>
        </details>
    </ul>
    <div>
        This method invokes callback when all previously queued functions have finished.
    </div>
</div>

<div>
    <h3><code>filestreamLogger.extend(filestreamLogger)</code></h3>
    <ul>
        <details>
            <summary>
                <code>filestreamLogger</code> &lt;FilestreamLogger&gt; | <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>
            </summary>
            <div>
                If filestreamLogger is an Array checks if the values of the Array are FilestreamLogger, otherwise checks if filestreamLogger is a FilestreamLogger and throws a TypeError if not a FilestreamLogger.
            </div>
        </details>
    </ul>
    <div>
        This method allows additionaly extending a filestreamLogger after being created. It finds the filestreamLogger's xLog function and stored it. Whenever the filestreamLogger is invoked to log data, the formatted string is also passed over to all xLogs.
    </div>
</div>

<div>
    <h3><code>filestreamLogger.destroy(callback)</code></h3>
    <ul>
        <details>
            <summary>
                <code>callback</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a> Default: <code>dirpath => console.log("destroyed", dirpath)</code>
            </summary>
            <div><b><code>function callback(dirpath) {}</code></b></div>
            <ul>
                <details>
                    <summary>
                        <code>dirpath</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a>
                    </summary>
                    <div>
                        The callback is invoked with the filestreamLogger's dirpath as parameter.
                    </div>
                </details>
            </ul>
            <div>
                If callback is not a function throws a TypeError. Since the logger is destroyed the internal callback queue is cleared and therefore a callback parameter is usefull.
            </div>
        </details>
    </ul>
    <div>
        This method checks the size of the log-file with <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_fstat_fd_options_callback">fstat</a> to see if it the log-file has content, <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_close_fd_callback">closes</a> the log-file's fd, deletes with <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_unlink_path_callback">unlink</a> the log-file if it has no content, deletes with <a href="https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_rmdir_path_options_callback">rmdir</a> the directory if there were no log-files in it, removes this filestreamLogger from any other filestreamLogger's extending and sets any internal properties that have Object values to <code>null</code> so that everything can be garbage collected. Check out the example below where logger.noob get destroyed and entirely garbage collected.
    </div>
</div>

<div>
    <h3><code>filestreamLogger.dirpath</code></h3>
    Readable property dirpath is created by <a href="https://nodejs.org/dist/latest-v14.x/docs/api/path.html#path_path_join_paths">path.join</a>(dir, type). This property never changes and it used to get a filestreamLogger's xLog.
</div>

<div>
    <h3><code>filestreamLogger.filepath</code></h3>
    Readable property filepath is created by <a href="https://nodejs.org/dist/latest-v14.x/docs/api/path.html#path_path_join_paths">path.join</a>(dirpath, name). This property is updated when setName has been invoked.
</div>

<div>
    <h2>Examples</h2>
</div>

```javascript
const FilestreamLogger = require("filestream-logger");
const TaskClock = require("task-clock");
const IndentModel = require("indent-model");
const LocaleTimezoneDate = require("locale-timezone-date");
//
// ...
//
// Choose a text formatter however you like,
const tabs5_4 = new IndentModel({ tabSize: 5, smallestSpace: 4 });
const formatter = (data, callback) => {
	// I want to see the time in my locale timezone
	const isoStr = new LocaleTimezoneDate().toLocaleISOString();
	// I want to see data aligned in tabs
	const logString = tabs5_4.tabify(isoStr, ...data);
	callback(logString);
	console.log(logString);
};
//
// ...
//
const logger = {};
logger.log = new FilestreamLogger("log", { formatter });
logger.error = new FilestreamLogger("error", { formatter, extend: [logger.log] });
logger.noob = new FilestreamLogger("noob");
logger.noob.extend([logger.log, logger.error]);
logger.noob.destroy();
logger.noob("never gonna happen");
logger.noob.onReady(() => console.log(`really never gonna happen,
all callbacks and logger.noob gets GC'd on the next line`));
delete (logger.noob);
//
// ...
//
// Every day at 24h in your locale timezone set logger's name to yyyy-mm-dd.log
class LoggerClock extends TaskClock {
	constructor() {
		super({ start: new Date(new Date().setHours(0, 0, 0, 0)), interval: { h: 24 } });
	};
	task(now, tick) {
		const yyyymmdd = now.yyyymmdd();
		logger.log.setName(yyyymmdd);
		logger.error.setName(yyyymmdd);
	};
	get DateModel() {
		return LocaleTimezoneDate;
	};
};
const clock = new LoggerClock();
//
// ...
//
console.log(logger); // logger.noob is gone
logger.log("GET", "/v1/someapi/mongol/1", "spider", "monkey");
logger.log("CLOSED", "/v1/someapi/mongol/1", "spider", "monkey");
logger.error("FAILED", "/v1/someapi/mongol/1", "find errors in " + logger.error.filepath, "monkey!");
logger.error("FAILED", "/v1/someapi/mongol/2", "find errors in " + logger.error.filepath, "monkey!");
logger.log.setName("test");
logger.error.setName("noob"); // is empty so auto removed
logger.error.setName("mongol"); // is empty so auto removed
logger.error.setName("monkey");
logger.error("FAILED", "/v1/someapi/mongol/3", "find errors in " + logger.error.filepath, "monkey!");
logger.log("GET", "/v1/someapi/mongol/2", "spider", "monkey");
logger.log("CLOSED", "/v1/someapi/mongol/2", "spider", "monkey");
logger.log.destroy(); // the next error will not log to logger.log
logger.error("FAILED", "/v1/someapi/mongol/4", "find errors in " + logger.error.filepath, "monkey!");
//
//
// CONSOLE OUTPUT:
// {
//   log: [Function (anonymous)] FilestreamLogger {
//     formatter: [Function: formatter]
//   },
//   error: [Function (anonymous)] FilestreamLogger {
//     formatter: [Function: formatter]
//   }
// }
// 2021-04-15T12:58:56.598+0200       GET       /v1/someapi/mongol/1     spider    monkey
// 2021-04-15T12:58:56.598+0200       CLOSED    /v1/someapi/mongol/1     spider    monkey
// 2021-04-15T12:58:56.598+0200       FAILED    /v1/someapi/mongol/1     find errors in loggers\error\2021-04-15.log       monkey!
// 2021-04-15T12:58:56.599+0200       FAILED    /v1/someapi/mongol/2     find errors in loggers\error\2021-04-15.log       monkey!
// 2021-04-15T12:58:56.599+0200       FAILED    /v1/someapi/mongol/3     find errors in loggers\error\monkey.log      monkey!
// 2021-04-15T12:58:56.599+0200       GET       /v1/someapi/mongol/2     spider    monkey
// 2021-04-15T12:58:56.600+0200       CLOSED    /v1/someapi/mongol/2     spider    monkey
// 2021-04-15T12:58:56.600+0200       FAILED    /v1/someapi/mongol/4     find errors in loggers\error\monkey.log      monkey!
// destroyed loggers\noob
// destroyed loggers\log
//
//
// OUTPUT TO WHICH LOG-FILES:
// 1st OUTPUT: /loggers/log/2021-04-15.log
// 2nd OUTPUT: /loggers/log/2021-04-15.log
// 3rd OUTPUT: /loggers/error/2021-04-15.log + OUTPUT: /loggers/log/2021-04-15.log
// 4th OUTPUT: /loggers/error/2021-04-15.log + OUTPUT: /loggers/log/2021-04-15.log
// 5th OUTPUT: /loggers/error/monkey.log + OUTPUT: /loggers/log/test.log
// 6th OUTPUT: /loggers/log/test.log
// 7th OUTPUT: /loggers/log/test.log
// 8th OUTPUT: /loggers/error/monkey.log
//
// ...
//
process.on("SIGINT", () => {
	logger.error("Node JS is now shutting down due to pressing ctrl + c");
	// finish up all logs before exiting process
	FilestreamLogger.destroyAll(() => process.exit());
	// CONSOLE OUTPUT:
	// 2021-04-15T13:01:37.152+0200       Node JS is now shutting down due to pressing ctrl + c
	// destroyed loggers\error
	//
	// OUTPUT TO WHICH LOG-FILES:
	// OUTPUT: /loggers/error/monkey.log
});
```