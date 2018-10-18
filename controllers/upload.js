const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const S3 = require('../services/s3');
const lambda = require('../services/lambda');
const auth = require('../auth.json');
const BUCKET_NAME = 'upload-csv-ecs';
const uuid = require('uuid/v4');
const FILE_PATH = __dirname + '/../tmp';

/**
 *  Upload file and response of lambda function
 * @param {Request} request 
 */
async function upload(request) {
    try {

        let filename = await uploadToTemp(request);
        if (!filename) {
            throw { status: 400, message: "No file name is found" };
        }

        let filePath = path.join(FILE_PATH, filename);
        console.log(`${filename} is uploaded to temporary location ${filePath}`);

        let s3data = await uploadToS3(BUCKET_NAME, filePath, 'test/' + filename);
        console.log(`${filename} is uploaded to s3 with key ${s3data.key}`);

        let resLambda = await processCsvToEcs(s3data);

        // convert log to string 
        // resLambda.LogResult = new Buffer(resLambda.LogResult, 'base64').toString();

        //remove temporary file for EBS
        await rmFile(filePath);

        return `${filename.substring(37)} was successfully insterted in elastic search`;
    } catch (e) {
        throw e;
    }
}

/**
 *  Takes key and bucket of file name and process to call lambda
 * @param {S3} s3data 
 */
async function processCsvToEcs(s3data) {
    console.log(`Lambda is kick-off for ${s3data.Key}`);
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
                let lambdaPayload = JSON.parse(data.Payload);
                if (lambdaPayload.errorMessage) {
                    return reject({ status: 500, message: "Oops something went wrong in processing csv to elasticsearch" });
                }
                return resolve(data);
            }          // successful response
        });
    });
}

/**
 * Upload file to local disk EBS
 * @param {Request} request 
 */
async function uploadToTemp(request) {

    let filename;
    return new Promise(async (resolve, reject) => {
        try {

            let form = new formidable.IncomingForm();
            // form.multiples = false; // allows for multiple files in a single request
            form.maxFieldsSize = 2 * 1024 * 1024;
            // form.maxFileSize = 74 * 1024 * 1024;
            // form.uploadDir = __dirname + "/tmp";

            form.keepExtensions = true;
            form.parse(request, async (err, fields, file) => {

                if (err) { return reject(err); }
                // no file is found
                if (!file) { return reject({ status: 400, message: 'No file were uploaded' }); }
            });

            // assiging file location to upload
            form.on('fileBegin', function (name, file) {

                if (file && (!file.name || !file.type.includes('csv'))) {
                    return reject({ status: 400, message: "Please upload valid csv file" });
                }
                file.name = uuid() + '-' + file.name;
                file.path = path.join(FILE_PATH, file.name);
            });

            form.on('file', function (name, file) {
                // appending uuid to filename to avoid duplicate filename problem with different data
                filename = file.name;
            });

            form.on('aborted', function () {
                return reject({ status: 400, message: "File upload was canceled because of socket closed" });
            });

            form.on('error', function (err) {
                console.log('File with error found ' + err);
                return reject(err);
            });

            form.on('end', function () {
                return resolve(filename);
            });

        } catch (e) {
            return reject(e);
        }
    });
}

/**
 * Upload file from local to S3
 * @param {string} bucket 
 * @param {string} path 
 * @param {string} key 
 */
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

            // return a promise for an S3 upload
            return await S3.upload(params)
                .on('httpUploadProgress', function (evt) {
                    console.log('Progress of s3 upload:', evt.loaded, '/', evt.total);
                }).
                send(function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(data);
                });
        });
    }
    catch (err) {
        throw err;
    };
}

/**
 * 
 * @param {string} path remove file from EBS
 */
async function rmFile(path) {
    try {
        return await new Promise((resolve, reject) => {
            fs.unlink(path, (err) => {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        });
    } catch (err) {
        throw err;
    }
}


module.exports = {
    upload
}
