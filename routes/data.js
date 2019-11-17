var express = require('express');
var router = express.Router();
const url = require('url');
var path = require('path');


/* GET dataset json data. */
router.get('/*', function(req, res, next) {
  let p = url.parse(req.url, true);
  let file = p.pathname;
  //res.render('index', { title: 'Express' });
  res.sendFile(path.join(__dirname, '../dataset', file));
});

module.exports = router;