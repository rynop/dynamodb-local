'use strict';

var DynamoDbLocal = require('../index');

DynamoDbLocal.launch(8000)
    .then(function (ChildProcess) {
      console.log("PID created: ", ChildProcess.pid);

      //do your tests

      DynamoDbLocal.stop(8000);
      console.log('finished');
    });