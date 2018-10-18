const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const S3 = require('../services/s3');
const lambda = require('../services/lambda');
const auth = require('../auth.json');
const BUCKET_NAME = 'upload-csv-ecs';
const FILE_PATH = __dirname + '/../tmp';

async function upload(request){
try{    
    let filename = await uploadToTemp(request);

    let filePath = path.join(FILE_PATH, filename);

    let s3data = await uploadToS3(BUCKET_NAME, filePath, 'test/'+ filename);
    
   
    let resLambda = await processCsvToEcs(s3data);
    
    resLambda.LogResult = new Buffer(resLambda.LogResult, 'base64').toString();
    
    return `${filename} was successfully insterted in elastic search`;
} catch(e){
throw e;
}
}

/**
 *  Takes key and bucket of file name and process to call lambda
 * @param {S3} s3data 
 */
async function processCsvToEcs(s3data) {
    return new Promise(async (resolve, reject) => {
        let payload = {
            key: s3data.Key,
            bucket: s3data.Bucket,
            byte: 0,
            header: "",
        }
        let params = {
            FunctionName: auth.lambda, /* required */
            Payload: JSON.stringify(payload),
            InvocationType: "RequestResponse",
            LogType: "Tail"
        };
        lambda.invoke(params, function (err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
                return reject(err);
            }
            else {
                // console.log(data); 
                return resolve(data);
            }          // successful response
        });
    });
}

async function uploadToTemp(request) {
    try {
        let filename;
        
        return new Promise((resolve, reject) => {
            let form = new formidable.IncomingForm();
            // form.multiples = false; // allows for multiple files in a single request
            form.maxFieldsSize = 2 * 1024 * 1024;
            // form.maxFileSize = 74 * 1024 * 1024;
            // form.uploadDir = __dirname + "/tmp";

            form.keepExtensions = true;
            form.parse(request, async (err, fields, file) => {

                if (err) { throw err; }
            });

            // assiging file location to uploade
            form.on('fileBegin', function (name, file) {
                file.path = path.join(FILE_PATH, file.name);
            });

            form.on('file', function (name, file) {
		 console.log(`Uploading file ${file.name} to temporary location`)
                filename = file.name;
                //console.log(`Uploading file ${file.name} to temporary location`)
            });
		
		form.on('aborted', function() {
			console.log("Socket is closed by users");
			return reject({ status : 400 , message:"File upload was canceled because of socket closed"});
		});
            form.on('end', function (name) {
               
                if (!filename) {
                    return reject({ status: 400, message: "Please upload csv file" });
                }
                console.log(`File${filename} is successfully uploaded`);
                return resolve(filename);
            });

            form.on('error', function (err) {
                console.log('File with error found ' + err);
                return reject(err);
            });

        });
    } catch (e) {
        throw e;
    }
}

async function uploadToS3(bucket, path, key) {
    try {
        console.log(`Uploading file ${key} to s3`);
        return new Promise(async (resolve, reject) => {

            // get a ReadableStream from the location of the file
            let stream = fs.createReadStream(path);
            // var options = {partSize: 50 * 1024 * 1024, queueSize: 4};
            let params = {
                Key: key,
                Bucket: bucket,
                Body: stream
            };

            // return await S3.upload(params).promise();

            // return a promise for an S3 upload
            return await S3.upload(params)
                .on('httpUploadProgress', function (evt) {
                    console.log('Progress:', evt.loaded, '/', evt.total);
                }).
                send(function (err, data) {
                    if (err) {
                        console.log("Error in s3 upload", err);
                        return reject(err);
                    }
                    console.log("Uploaded to s3 with data", data);
                    return resolve(data);

                });
        });
    }
    catch (err) {
        throw err;
    };
}

module.exports = {
    upload
}
