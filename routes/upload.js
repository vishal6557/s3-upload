var express = require('express');
var router = express.Router();
let UploadController = require('../controllers/upload');

/**
 * Uplaod file to s3
 */
router.get("/", async (req, res, next) => {

    console.log("Coming in route get/")
    try {
        res.json({
            success: true,
            message: "Welcome to demo of uploading csv to elastic search"
        })
    }
    catch (e) {
        next(e);
    }
})



module.exports = router;