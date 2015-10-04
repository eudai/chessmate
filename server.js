var express = require('express');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var app = express();


app.use(bodyParser.json())


app.use(express.static('public'));


app.post('/record/*',function(req,res){
	var fen = req.params[0]
	var recordFile = path.join(__dirname,'public/data','records.json')
	if (typeof fen == 'string'){
		fs.appendFile(recordFile,fen + '\n',function(){
			res.send('recorded.')
		})
	}


})



var server = app.listen(3000, 'localhost', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Server app listening at http://%s:%s', host, port);

});