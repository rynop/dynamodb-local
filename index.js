"use strict";

var os = require('os'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    http = require('http'),
    tar = require('tar'),
    zlib = require('zlib'),
    path = require('path'),
    mkdirp = require('mkdirp');

const JARNAME = 'DynamoDBLocal.jar';

var tmpDynamoLocalDirDest = os.tmpdir() + 'dynamodb-local',
    runningProcesses = {},
    DynamoDbLocal = {
      /**
       *
       * @param port
       * @param dbPath if omitted will use in memory
       * @param additionalArgs
       * @returns {Promise.<ChildProcess>}
       */
      launch: function (port, dbPath, additionalArgs) {
        if (!dbPath) {
          dbPath = '-inMemory';
        }
        else {
          dbPath = '-dbPath ' + dbPath;
        }

        if (!additionalArgs) {
          additionalArgs = [];
        }
        else if (Array.isArray(additionalArgs)) {
          additionalArgs = [additionalArgs];
        }

        return installDynamoDbLocal()
            .then(function () {
              let args = [
                '-Djava.library.path=./DynamoDBLocal_lib -jar ' + JARNAME,
                '--port', port
              ];
              args.concat(additionalArgs);

              let child = spawn('java', args, {cwd: 'test', env: process.env});

              runningProcesses[port] = child;

              return child;
            });
      },
      stop: function (port) {
        if (runningProcesses[port]) {
          runningProcesses[port].kill();
        }
      },
      relaunch: function (port, db) {
        this.stop(port);
        this.launch(port, db);
      }
    };

module.exports = DynamoDbLocal;

function installDynamoDbLocal() {
  console.log("Checking for ", tmpDynamoLocalDirDest);
  return new Promise(function (resolve, reject) {
    try {
      let jarPath = tmpDynamoLocalDirDest + '/' + JARNAME,
          stats = fs.lstatSync(tmpDynamoLocalDirDest);

      if (stats.isDirectory() && fs.existsSync(tmpDynamoLocalDirDest + '/' + jarPath)) {
        resolve();
      }
    }
    catch (e) {
    }

    http
        .get('http://dynamodb-local.s3-website-us-west-2.amazonaws.com/dynamodb_local_latest.tar.gz', function (response) {
          if (302 != response.statusCode) {
            reject("Error getting DyanmoDb local latest tar.gz location: " + response.statusCode);
          }

          http
              .get(response.headers['location'], function (redirectResponse) {
                if (200 != redirectResponse.statusCode) {
                  reject("Error getting DyanmoDb local latest tar.gz location " + response.headers['location'] + ": " + redirectResponse.statusCode);
                }
                redirectResponse
                    .pipe(zlib.Unzip())
                    .pipe(tar.Parse())
                    .on('entry', function (entry) {
                      var fullpath = path.join(tmpDynamoLocalDirDest, entry.path);
                      if ('Directory' == entry.type) {
                        fs.mkdirSync(fullpath);
                      }
                      else {
                        mkdirp(path.dirname(fullpath), function (err) {
                          if (err) reject(err);
                          entry.pipe(fs.createWriteStream(fullpath));
                        });
                      }
                    })
                    .on('finish', function () {
                      resolve();
                    })
                    .on('error', function (err) {
                      reject(err);
                    });
              })
              .on('error', function (e) {
                reject(e.message);
              });
        })
        .on('error', function (e) {
          reject(e.message);
        });
  });
}