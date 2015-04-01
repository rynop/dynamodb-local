'use strict';

var DynamoDbLocal = require('./index');

DynamoDbLocal.launch(8000)
    .then(function (ChildProcess) {
      console.log("PID: ", ChildProcess.pid);
      console.log("finished");
    });