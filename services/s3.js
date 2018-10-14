let AWS = require('aws-sdk');
let auth = require('../auth.json');

// create AWS config
AWS.config.update({
    accessKeyId: auth.accessKeyId,
    secretAccessKey: auth.secretAccessKey,
    region: auth.region
});

// create new AWS S3 object
let s3 = new AWS.S3();

module.exports = s3