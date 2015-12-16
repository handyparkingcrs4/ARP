var mongoose = require('mongoose');
var conf = require('../config').conf;

var dbUrl = conf.dbHost + ':' + conf.dbPort + '/' + conf.dbName;
var options = { server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } } };


exports.connect = function connect(callback){


    mongoose.connect(dbUrl, options, function(err, res){

      if(err){
          //console.log('Unable to connect to database ' + dbUrl);
          callback(err);

      }

      else{

          //console.log('Connected to database ' + dbUrl);
          callback();

      }
    });
};


exports.disconnect = function disconnect(callback){

    mongoose.disconnect(callback);
};
