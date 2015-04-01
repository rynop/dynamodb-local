# dynamodb-local

A wrapper for AWS DynamoDB Local, intended for use in testcases. 

# Usage

```javascript
var DynamoDbLocal = require('dynamodb-local');

DynamoDbLocal.launch(8000);
DynamoDbLocal.relaunch(8000);
```

See [AWS DynamoDB Docs](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.DynamoDBLocal.html) for more info on how to interact with DynamoDB Local.
