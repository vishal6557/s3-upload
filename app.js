var express = require('express');
var session = require('express-session');
var path = require('path');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

let upload = require('./routes/upload');

var app = express();
var server = require('http').createServer(app);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.json({limit: "15360mb"}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.disable('etag');

app.use('/', upload); //route

// logger.log('500 error', { data: 'my params' });
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    
    // render the error page
    res.status(err.status || 200);
    res.send({ success: false, message: err });
});

var port = 3000;
server.listen(port, function () {
    console.log('Server starting at port "  + port);
});

module.exports = app;
