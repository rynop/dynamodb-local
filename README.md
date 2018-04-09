# dynamodb-local

A wrapper for AWS DynamoDB Local, intended for use in testcases.
Will automatically download the files needed to run DynamoDb Local.

You can optionally override the download URL from where it fetches the installation archive
as well as the target directory to which it will install the binaries (default is your system's temp folder).


# Usage

Install the module as development dependency by running

`npm install dynamodb-local --save-dev`

Then in node, write your test script like this:

```javascript
const DynamoDbLocal = require('dynamodb-local');
const dynamoLocalPort = 8000;

DynamoDbLocal.launch(dynamoLocalPort, null, ['-sharedDb']) //if you want to share with Javascript Shell
    .then(function () {

        // do your tests

        DynamoDbLocal.stop(dynamoLocalPort);
    });
```

Alternatively if you wish to use this as detached server like this:

```javascript

const DynamoDbLocal = require('dynamodb-local');
const dynamoLocalPort = 8000;

const child = await DynamoDbLocal.launch(dynamoLocalPort, null, [], false, true); // must be wrapped in async function

// do your tests

await DynamoDbLocal.stopChild(child); // must be wrapped in async function

```

Another example which also shows how to override the installer configuration can be found in
[examples/simple.js](examples/simple.js).

See [AWS DynamoDB Docs](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.DynamoDBLocal.html)
for more info on how to interact with DynamoDB Local.
