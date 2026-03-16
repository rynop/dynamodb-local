'use strict';

var os = require('os'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    https = require('https'),
    tar = require('tar'),
    zlib = require('zlib'),
    path = require('path'),
    debug = require('debug')('dynamodb-local');

var JARNAME = 'DynamoDBLocal.jar';
var INSTALL_MARKER = '.dynamodb-local-install-complete';

var Config = {
    installPath: path.join(os.tmpdir(), 'dynamodb-local'),
    downloadUrl: 'https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz'
};

var runningProcesses = {},
    DynamoDbLocal = {
        /**
         *
         * @param port
         * @param dbPath if omitted will use in memory
         * @param additionalArgs
         * @param verbose
         * @param detached
         * @returns {Promise.<ChildProcess>}
         */
        launch: function (port, dbPath, additionalArgs, verbose = false, detached, javaOpts = '') {
            if (runningProcesses[port]) {
                return Promise.resolve(runningProcesses[port]);
            }

            if (!additionalArgs) {
                additionalArgs = [];
            }
            else if (!Array.isArray(additionalArgs)) {
                additionalArgs = [additionalArgs];
            }

            if (!dbPath) {
                additionalArgs.push('-inMemory');
            }
            else {
                additionalArgs.push('-dbPath', dbPath);
            }

            return installDynamoDbLocal()
                .then(function () {
                    var args = [
                        '-Xrs',
                        '-Djava.library.path=./DynamoDBLocal_lib',
                        javaOpts,
                        '-jar',
                        JARNAME,
                        '-port',
                        port
                    ].filter(arg => !!arg);
                    args = args.concat(additionalArgs);

                    var child = spawn('java', args, {
                        cwd: Config.installPath,
                        env: process.env,
                        stdio: ['ignore', 'ignore', 'inherit']
                    });

                    if (!child.pid) throw new Error('Unable to launch DynamoDBLocal process');

                    child
                        .on('error', function (err) {
                            if (verbose) debug('local DynamoDB start error', err);
                            throw new Error('Local DynamoDB failed to start. ');
                        })
                        .on('close', function (code) {
                            if (code !== null && code !== 0) {
                                if (verbose) debug('Local DynamoDB failed to close with code', code);
                            }
                        });
                    if (!detached) {
                      process.on('exit', function() {
                          child.kill();
                      });
                    }

                    runningProcesses[port] = child;

                    if (verbose) {
                        debug('DynamoDbLocal(', child.pid, ') started on port', port,
                            'via java', args.join(' '), 'from CWD', Config.installPath);
                    }

                    return child;
                });
        },
        stop: function (port) {
            if (runningProcesses[port]) {
                runningProcesses[port].kill('SIGKILL');
                delete runningProcesses[port];
            }
        },
        stopChild: function (child) {
            if (child.pid) {
                debug('stopped the Child');
                child.kill();
            }
        },
        relaunch: function (port, ...args) {
            this.stop(port);
            this.launch(port, ...args);
        },
        configureInstaller: function (conf) {
            if (conf.installPath) {
                Config.installPath = conf.installPath;
            }
            if (conf.downloadUrl) {
                Config.downloadUrl = conf.downloadUrl;
            }
        }
    };

module.exports = DynamoDbLocal;

function installDynamoDbLocal() {
    debug('Checking for DynamoDB-Local in ', Config.installPath);

    var jarPath = path.join(Config.installPath, JARNAME);
    var markerPath = path.join(Config.installPath, INSTALL_MARKER);

    try {
        // Check for both the jar file AND the install marker to ensure
        // the extraction completed successfully. This prevents issues
        // when a previous download/extraction was interrupted.
        if (fs.existsSync(jarPath) && fs.existsSync(markerPath)) {
            return Promise.resolve(true);
        }
    } catch (e) {
    }

    debug('DynamoDb Local not installed or incomplete. Installing...');

    // Clean up any incomplete installation
    if (fs.existsSync(Config.installPath)) {
        try {
            fs.rmSync(Config.installPath, { recursive: true, force: true });
        } catch (e) {
            debug('Warning: could not clean up incomplete installation:', e.message);
        }
    }
    fs.mkdirSync(Config.installPath, { recursive: true });


    return new Promise((resolve, reject) => {
        function onExtractionComplete() {
            // Verify the jar file exists before marking as complete
            if (!fs.existsSync(jarPath)) {
                return reject(new Error('Extraction completed but ' + JARNAME + ' not found'));
            }
            // Create marker file to indicate successful installation
            try {
                fs.writeFileSync(markerPath, 'Installation completed at ' + new Date().toISOString());
                debug('DynamoDB Local installation completed successfully');
                resolve();
            } catch (e) {
                reject(new Error('Failed to create installation marker: ' + e.message));
            }
        }

        let stream;

        if (fs.existsSync(Config.downloadUrl)) {
            debug('Installing from local file:', Config.downloadUrl);

            stream = fs.createReadStream(Config.downloadUrl)
                .pipe(zlib.Unzip())
                .pipe(tar.extract({ cwd: Config.installPath }));

            stream.on('end', onExtractionComplete);
            stream.on('error', err => reject(err));
        }
        else {
            https.get(Config.downloadUrl, redirectResponse => {
                if (redirectResponse.statusCode !== 200) {
                    return reject(
                        new Error(
                            'Error getting DynamoDb local latest tar.gz location ' +
                            redirectResponse.headers['location'] + ': ' +
                            redirectResponse.statusCode
                        )
                    );
                }

                redirectResponse
                    .pipe(zlib.Unzip())
                    .pipe(tar.extract({ cwd: Config.installPath }))
                    .on('end', onExtractionComplete)
                    .on('error', err => reject(err));
            }).on('error', e => reject(e));
        }
    });
}
