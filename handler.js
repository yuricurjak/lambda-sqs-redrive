const aws = require('aws-sdk');
aws.config.update({region: 'us-west-2'});
const sqs = new aws.SQS({apiVersion: '2012-11-05'});

module.exports.functionredriveqeue = async event => {
  return new Promise(async(resolve, reject) =>{
      try{
          event.body = JSON.parse(event.body);
        while (true) {
          const receiveParams = {
            QueueUrl: event.body.DLQ_URL,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 1,
            MessageAttributeNames: ['All']
          };
    
          const DLQMessages = await sqs.receiveMessage(receiveParams).promise();
    
          if (!DLQMessages.Messages || DLQMessages.Messages.length === 0) {
            console.log(`NO MESSAGES FOUND IN ${event.body.DLQ_URL}`);
            break;
          }
    
          console.log(`RECEIVED ${DLQMessages.Messages.length} MESSAGES`);
          console.log(DLQMessages.Messages[0].MessageAttributes);
           for (const message of DLQMessages.Messages) {
             for(let prop in message.MessageAttributes){
                  delete message.MessageAttributes[prop].StringListValues;
                  delete message.MessageAttributes[prop].BinaryListValues;
             }

             const outboundMessage = {
               MessageAttributes: message.MessageAttributes,
               MessageBody: message.Body,
               QueueUrl: event.body.QUEUE_URL
             };
             console.log(`SENDING: ${JSON.stringify(outboundMessage, null, 2)}`);
             await sqs.sendMessage(outboundMessage).promise();
             console.log('SEND MESSAGE SUCCEEDED');
    
             const deleteParams = {
               QueueUrl: event.body.DLQ_URL,
               ReceiptHandle: message.ReceiptHandle
             };
    
             console.log(`DELETING: ${JSON.stringify(deleteParams, null, 2)}`);
             await sqs.deleteMessage(deleteParams).promise();
             console.log('DELETE MESSAGE SUCCEEDED');
           }
        
      }
      return resolve({
        statusCode: 200,
        body: JSON.stringify(
            {
                message: 'FINISHED MESSAGES',
                input: event
            }
        )
      });
      } catch (err) {
        console.log(`AN ERROR OCCURED: ${err.message}`);
        console.log(err);
        return reject({
          statusCode: 400,
          body: JSON.stringify(
              {
                  message: JSON.stringify(err),
                  input: event
              }
          )
      });
      }
  });
};
