var express = require('express');
var router = express.Router();
var path = require("path");
var media = path.join(__dirname, "../public/media");
/* GET home page. */
router.get('/', function(req, res, next) {
    var fr = require("fs");
    fr.readdir(media, (err, names) => {
        if (err) {
            console.log(err)
        } else {
            res.render('index', { title: 'music player', music: names });
        }
    })
});

module.exports = router;