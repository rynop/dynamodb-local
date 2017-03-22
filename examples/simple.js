'use strict';

var DynamoDbLocal = require('../index');

// optional config customization - default is your OS' temp directory and an Amazon server from US West
DynamoDbLocal.configureInstaller({
    installPath: './dynamodblocal-bin',
    downloadUrl: 'https://s3.eu-central-1.amazonaws.com/dynamodb-local-frankfurt/dynamodb_local_latest.tar.gz'
});

DynamoDbLocal.launch(8000)
    .then(function (ChildProcess) {
        console.log('PID created: ', ChildProcess.pid);

        //do your tests

        DynamoDbLocal.stop(8000);
        console.log('finished');
    });
