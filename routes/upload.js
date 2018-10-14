var express = require('express');
var router = express.Router();
let UploadController = require('../controllers/upload');

/**
 * Uplaod file to s3
 */
router.post("/", async (req, res, next) => {

    console.log("Coming in route")
    try {

        let message = await UploadController.upload(req);
        res.json({
            success: true,
            message: message
        })
    }
    catch (e) {
        console.log("Error is here ",e);
        next(e);
    }
})

module.exports = router;