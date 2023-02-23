'use strict';

var os = require('os'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    https = require('https'),
    tar = require('tar'),
    zlib = require('zlib'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    Q = require('q'),
    debug = require('debug')('dynamodb-local');

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
         * @param detached
         * @returns {Promise.<ChildProcess>}
         */
        launch: function (port, dbPath, additionalArgs, verbose = false, detached, javaOpts = '') {
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
    var filebuf = [];
    var deferred = Q.defer();

    try {
        if (fs.existsSync(path.join(Config.installPath, JARNAME))) {
            return Q.fcall(function () {
                return true;
            });
        }
    } catch (e) {
    }

    debug('DynamoDb Local not installed. Installing...');

    if (!fs.existsSync(Config.installPath))
        fs.mkdirSync(Config.installPath);

    if (fs.existsSync(Config.downloadUrl)) {
        debug('Installing from local file:', Config.downloadUrl);
        filebuf = fs.createReadStream(Config.downloadUrl);
        filebuf
            .pipe(zlib.Unzip())
            .pipe(tar.extract({cwd: Config.installPath}))
            .on('end', function () {
                deferred.resolve();
            })
            .on('error', function (err) {
                deferred.reject(err);
            });
    }
    else {
        https.get(Config.downloadUrl,
            function (redirectResponse) {
                if (200 != redirectResponse.statusCode) {
                    deferred.reject(new Error('Error getting DynamoDb local latest tar.gz location ' +
                    redirectResponse.headers['location'] + ': ' + redirectResponse.statusCode));
                }
                redirectResponse
                    .pipe(zlib.Unzip())
                    .pipe(tar.extract({cwd: Config.installPath}))
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
    }
    return deferred.promise;
}
