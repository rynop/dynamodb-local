# dynamodb-local

A wrapper for AWS DynamoDB Local, intended for use in testcases.  Will automatically download the files needed to run DynamoDb Local. 

# Usage

`npm install dynamodb-local --save`

Then in node:

```javascript
var DynamoDbLocal = require('dynamodb-local');

DynamoDbLocal.launch(dynamoLocalPort, null, ['-sharedDb']); //if you want to share with Javascript Shell
//Do your tests
DynamoDbLocal.stop(8000);
```

See [AWS DynamoDB Docs](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.DynamoDBLocal.html) for more info on how to interact with DynamoDB Local.
