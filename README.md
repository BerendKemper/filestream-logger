# filestream-logger
A logger that creates a log-dir, that may change the logger's filename, that may use a formatter and that allows and extending various logger types.
<pre><code>npm i filestream-logger</code></pre>

```javascript
const makeLogger = require("filestream-logger");
```
<h3><code>makeLogger(type[,options])</code></h3>
<ul>
	<details>
		<summary>
			<code>type</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a> parameter is <b>required!</b>
		</summary>
		The <code>type</code> parameter determines the name of the sub-directory in which the <code>filestreamLogger</code> creates log files. Additionally the filestreamLogger's function is named after type. If the sub-directory did not exists it is created.
	</details>
	<details>
		<summary>
			<code>options</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object">&lt;Object&gt;</a>
		</summary>
		<ul>
			<details>
				<summary>
					<code>dir</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a> Default: <code>loggers</code>
				</summary>
				The <code>dir</code> option determines the name of the main-directory in which the <code>filestreamLogger</code> creates a sub-directory which in turn is where the log files are created. If the main-directory did not exists it is created.
			</details>
			<details>
				<summary>
					<code>name</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a> Default: <code>new Date().toLocaleDateString()</code>
				</summary>
				The <code>name</code> option determines how the first log file is named. If the log file did not exists it is created.
			</details>
			<details>
				<summary>
					<code>formatter</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a> Default: <code>(data, callback) => callback(data.join(" "))</code>
				</summary>
				<ul>
					<details>
						<summary>
							<code>data</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>
						</summary>
					</details>
					<details>
						<summary>
							<code>callback</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a> parameter is <b>required!</b>
						</summary>
						Invoke <code>callback</code> and pass over a fromatted-string so that it can be streamed to the log file.
					</details>
				</ul>
				The <code>formatter</code> is a function that must produce a fromatted-string from the items of the <code>data</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>. When the <code>formatter</code> has finished to produce a fromatted-string, <code>callback</code> must be invoked and the fromatted-string must be passed as parameter.
			</details>
			<details>
				<summary>
					<code>extend</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">&lt;Array&gt;</a>
				</summary>
				The <code>extend</code> option must contain <code>filestreamLoggers</code>. The created <code>filestreamLogger</code> stores an <code>xLog</code> from every <code>filestreamLogger</code> out of <code>extend</code>. Whenever this  <code>filestreamLogger</code> is invoked to log data, the formatted string is also passed over to all <code>xLogs</code>. Checkout the  examples to see how an error logger is extended with a((n) everything) logger. 
			</details>
		</ul>
	</details>
	<details>
		<summary>
			Returns <code>new FilestreamLogger()</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a>
		</summary>
		The <code>filestreamLogger</code> is a <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">Function</a> and when invoked it immediately invokes <code>formatter</code> followed by streaming the formatted string to the log file.
	</details>
</ul>
<h2>Class: <code>FilestreamLogger</code></h2>
The class <code>FilestreamLogger</code>'s prototype is the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">Function</a> prototype and has own methods. 
<h2><code>filestreamLogger</code></h2>
<h3>Event: <code>'ready'</code></h3>
This event runs the <code>callback</code> as soon as all calls to <code>logger[type](...data)</code>, that have been called before listening to the 'ready' event, have finished writing to the log file. This event can also be used to fire the callback after a call to <code>setName</code> has finished.
<pre><code>(async function loadApplication() {
    const { Logger, logger } = require("monkey-logger");
    // ...
    await new Logger("log");
    await new Logger("error", { extend: [logger.log] });
    // ...
    process.on("SIGINT", () => {
        logger.error("Node JS is now shutting down due to ctrl + c");
        logger.error.on("ready", () => process.exit());
    });
}());</code></pre>
<h3><code>logger[type].filepath</code></h3>
The <code>filepath</code> property is internally created by <a href="https://nodejs.org/dist/latest-v12.x/docs/api/path.html#path_path_join_paths">path.join</a>(<code>dir</code>, <code>type</code>, <code>name</code>). Overwriting this property does not break the code, however it might break yours.
<h3><code>logger[type].once(event, callback)</code></h3>
<ul>
    <li><code>event</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a></li>
    <li><code>callback</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function">&lt;Function&gt;</a></li>
</ul>
Adds a one-time <code>callback</code> function for the <code>event</code>.
<h3><code>logger[type].setName(name)</code></h3>
<ul>
    <li><code>name</code> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type">&lt;string&gt;</a></li>
</ul>
 This method adds the new <code>name</code> to the <code>filepath</code> property and creates a new log file in the sub branch. This opens the possibility to create a new log file on a clock's tick event. The internal <a href="https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_class_fs_writestream">WriteStream</a> will only be overwritten by the new <a href="https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_class_fs_writestream">WriteStream</a> until all previous logs have finished writing. Any logs that have been fired after the <code>setName</code> method was called will only start writing once the new <a href="https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_class_fs_writestream">WriteStream</a> is <a href="https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_event_ready_1">ready</a>. If the option <code>autoRemoveEmpty</code> was not set to <code>false</code>, an log file that was empty will be removed.
<h3><code>delete(logger[type])</code></h3>
Deleting a <code>type</code> from the <code>logger</code> Object also causes the <code>Logger</code> instance to be removed from the internal WeakMap. Caution: if there was still a reference to <code>logger[type]</code>, <code>delete(logger[type])</code> will only remove the <code>type</code> from the <code>logger</code> Object, but will fail at removing the <code>Logger</code> instance from the internal WeakMap until the reference to <code>logger[type]</code> is gone.
<pre><code>(async function loadApplication() {
    const { Logger, logger } = require("monkey-logger");
    // ...
    await new Logger("noob");
    console.log(logger);
    // {
    //     noob: [Function: log] {
    //         filepath: 'loggers\\noob\\monkey.log',
    //         once: [Function],
    //         setName: [Function]
    //     },
    // }
    delete(logger.noob);
    console.log(logger);
    // {}
}());</code></pre>
<h2>Example</h2>
<pre><code>(async function loadApplication() {
    const { Logger, logger } = require("monkey-logger");
    const { localeTimezoneDate, dateNotation, utc0 } = require("locale-timezone-date");
    const IndentModel = require("indent-model");
    const TaskClock = require("task-clock");
    // ...
    const tabs5_4 = new IndentModel({ spaces: 5, spaced: 4 });
    const formatter = (data, callback) => localeTimezoneDate.toISOString(new Date(),
        isoStr => tabs5_4.tabify(isoStr, ...data, logString => {
            callback(logString);
            console.log(logString);
        }));
    // ...
    await new Logger("log", { name: dateNotation.yyyymmdd(new Date()), formatter });
    await new Logger("error", { name: dateNotation.yyyymmdd(new Date()), formatter, extend: [logger.log] });
    // ...
    new TaskClock({ start: new Date(new Date().setHours(0, 0, 0, 0)), interval: { h: 24 } },
        (now) => {
            const yyyymmdd = dateNotation.yyyymmdd(now)
            logger.log.setName(yyyymmdd);
            logger.error.setName(yyyymmdd);
        });
    // ...
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
    // ...
    // 2020-08-30T21:46:16.143+0200       GET       /v1/someapi/mongol/1     spider    monkey
    // 2020-08-30T21:46:16.150+0200       CLOSED    /v1/someapi/mongol/1     spider    monkey
    // 2020-08-30T21:46:16.151+0200       FAILED    /v1/someapi/mongol/1     find errors in loggers\error\2020-08-30.log       monkey!
    // 2020-08-30T21:46:16.153+0200       FAILED    /v1/someapi/mongol/2     find errors in loggers\error\2020-08-30.log       monkey!
    // 2020-08-30T21:46:16.155+0200       FAILED    /v1/someapi/mongol/3     find errors in loggers\error\noob.log        monkey!
    // 2020-08-30T21:46:16.156+0200       GET       /v1/someapi/mongol/2     spider    monkey
    // 2020-08-30T21:46:16.157+0200       CLOSED    /v1/someapi/mongol/2     spider    monkey
    // 2020-08-30T19:46:16.158Z done
    // ...
    // 1st OUTPUT: /loggers/log/2020-08-30.log
    // 2nd OUTPUT: /loggers/log/2020-08-30.log
    // 3rd OUTPUT: /loggers/error/2020-08-30.log + OUTPUT: /loggers/log/2020-08-30.log
    // 4th OUTPUT: /loggers/error/2020-08-30.log + OUTPUT: /loggers/log/2020-08-30.log
    // 5th OUTPUT: /loggers/error/monkey.log + OUTPUT: /loggers/log/test.log
    // 6th OUTPUT: /loggers/log/test.log
    // 7th OUTPUT: /loggers/log/test.log
}());</code></pre>