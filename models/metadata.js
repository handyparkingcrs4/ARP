var util = require('util');
var conf = require('../config').conf;

// Array.prototype._metadata = null;

//It wraps the find() method to include metadata

exports.findAll = function findAll(schema, entityName, conditions, fields, options, callback){

    var opt = options ? options:{skip: conf.skip, limit: conf.limit};
    schema.find(conditions, fields, opt, function(err, result){

        if (!err){
            schema.count(conditions, function(err, count){

                if (!err){

                    var entities = entityName ? entityName : 'entities';
//                           console.log(entities);
//                           console.log(count);
                    var results = {
                        _metadata : {
                            totalCount: count,
                            skip: opt.skip,
                            limit: opt.limit

                        }
                    };

                    results[entities] = result;

                    callback(null, results);

                }
                else{
                    callback(err, null);
                }


            });
        }
        else{
            callback(err,null);
        }


    });
};