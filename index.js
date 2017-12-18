'use strict';

var os = require('os'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    https = require('https'),
    tar = require('tar'),
    zlib = require('zlib'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    Q = require('q');

var JARNAME = 'DynamoDBLocal.jar';

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
         * @returns {Promise.<ChildProcess>}
         */
        launch: function (port, dbPath, additionalArgs, verbose) {
            if (runningProcesses[port]) {
                return Q.fcall(function () {
                    return runningProcesses[port];
                });
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

            if (verbose != null) {
                verbose = true;
            }

            return installDynamoDbLocal()
                .then(function () {
                    var args = [
                        '-Djava.library.path=./DynamoDBLocal_lib',
                        '-jar',
                        JARNAME,
                        '-port',
                        port
                    ];
                    args = args.concat(additionalArgs);

                    var child = spawn('java', args, {
                        cwd: Config.installPath,
                        env: process.env,
                        stdio: ['pipe', 'pipe', process.stderr]
                    });

                    if (!child.pid) throw new Error('Unable to launch DynamoDBLocal process');

                    child
                        .on('error', function (err) {
                            if (verbose) console.log('local DynamoDB start error', err);
                            throw new Error('Local DynamoDB failed to start. ');
                        })
                        .on('close', function (code) {
                            if (code !== null && code !== 0) {
                                if (verbose) console.log('Local DynamoDB failed to start with code', code);
                            }
                        });

                    process.on('exit', function() {
                        child.kill();
                    });

                    runningProcesses[port] = child;

                    if (verbose) {
                        console.log('DynamoDbLocal(', child.pid, ') started on port', port,
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
        relaunch: function (port, db) {
            this.stop(port);
            this.launch(port, db);
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
    console.log('Checking for DynamoDB-Local in ', Config.installPath);
    var deferred = Q.defer();

    try {
        if (fs.existsSync(path.join(Config.installPath, JARNAME))) {
            return Q.fcall(function () {
                return true;
            });
        }
    } catch (e) {
    }

    console.log('DynamoDb Local not installed. Installing...');

    if (!fs.existsSync(Config.installPath))
        fs.mkdirSync(Config.installPath);

    https.get(Config.downloadUrl,
        function (redirectResponse) {
            if (200 != redirectResponse.statusCode) {
                deferred.reject(new Error('Error getting DynamoDb local latest tar.gz location ' +
                    response.headers['location'] + ': ' + redirectResponse.statusCode));
            }
            redirectResponse
                .pipe(zlib.Unzip())
                .pipe(tar.Extract({path: Config.installPath}))
                .on('end', function () {
                    deferred.resolve();
                })
                .on('error', function (err) {
                    deferred.reject(err);
                });
        })
        .on('error', function (e) {
            deferred.reject(e);
        });

    return deferred.promise;
}
