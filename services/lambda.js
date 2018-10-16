let AWS = require('aws-sdk');
let auth = require('../auth.json');

AWS.config.update({
    accessKeyId: auth.accessKeyId,
    secretAccessKey: auth.secretAccessKey,
    region: auth.region
});

let lambda = new AWS.Lambda();
module.exports = lambda;