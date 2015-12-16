var conf = require('../config').conf;
var util = require('util');

//Middleware to parse DB query fields selection from request URI
//Adds dbQueryFields to request
exports.parseFields = function(req, res, next){


  var fields = req.query.fields ? req.query.fields.split(","):null;
  if(fields){
        req.dbQueryFields = fields.join(' ');
  }
  else{
        req.dbQueryFields =null;
  }
  next();

};






/*

exports.parseQuery = function(req, res, next){



    var queryRaw = req.query.q ? req.query.q.split("+") : null;
    var createJson;
    var query={};

    if(queryRaw){
        queryRaw.forEach(function(val){
            createJson= val.split(":");
            query[createJson[0]]=createJson[1];
        });

        req.dbQuery=query;
    }else {
        req.dbQuery = null;
    }

    next();
};
*/

exports.parseOptions = function(req, res, next){

    var sortDescRaw = req.query.sortDesc ? req.query.sortDesc.split(",") : null;
    var sortAscRaw = req.query.sortAsc ? req.query.sortAsc.split(",") : null;


    if(sortAscRaw || sortDescRaw)
        req.sort={ asc:sortAscRaw, desc:sortDescRaw}
    else
        req.sort = null;

    next();

};

//Middleware to parse pagination params from request URI
//Adds dbPagination to request
exports.parsePagination = function(req, res, next){


    var skip = req.query.skip && !isNaN(parseInt(req.query.skip)) ? parseInt(req.query.skip):conf.skip;
    var limit = req.query.limit && parseInt(req.query.limit) < conf.limit ? parseInt(req.query.limit):conf.limit;
    req.dbPagination = {"skip":skip, "limit":limit};
    next();

};
