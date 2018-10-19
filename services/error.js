class UploadError extends Error {
    constructor(message, status = 500, code = "INTERNAL_ERROR") {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.status = status;
        this.code = code;
    }
}

/**
 * 400 for bad request
 */
class InvalidParamter extends UploadError {
    constructor(message = "Invalid paramter in request") {
        super(message, 400, "INVALID_PARAMETER");
    }
}

module.exports = {
    InvalidParamter
}