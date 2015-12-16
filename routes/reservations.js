var express = require('express');
var middlewares = require('./middlewares');
var Reservation = require('../models/reservations').Reservation;
var Parking = require('../models/parking').ArpParking;
//var ReservationSc = require('../models/reservations').ReservationSchema;
var router = express.Router();
var util = require('util');
var request = require('request');
var conf = require('../config').conf;
var whiteList = require('../models/whiteList').WhiteList;
var coreComunication = require('../models/coreComunication').CoreComunication;


console.log(JSON.stringify(Parking));

router.use(middlewares.parsePagination);
router.use(middlewares.parseFields);
router.use(middlewares.parseOptions);


/*
  Remove Reservation if the time expire and the car is not arrived
 */
function timeOutCarIn(time,reservationId){
   console.log("Timeout Reservation " + time);
    Reservation.findById(reservationId,function(err,reservationById){
         if(err) {
             console.error('Error: Not possible to recover reservation info ' + err );
         } else {
             if(reservationById) {
                 if (!(reservationById.dateIn)) {

                     //CALL CORE API TO REMOVE RESERVATION
                     coreComunication.removeReservation(reservationById.coreId);

                     //Remove From White List
                     whiteList.removeCarplate(reservationById.carplate);

                     reservationById.remove(function (err, removeReservation) {
                         if (!err) {
                             console.log('Info: carplate ' + removeReservation.carplate + ' reservation expired');
                             Parking.cancelReservation(function (err, cb) {
                                 // Update Lots
                                 if (!err) coreComunication.updateLostsStats(cb);
                             });
                         } else
                             console.error('Error: not possible to remove carplate ' + removeReservation.carplate + ' reservation expiration ' + err);
                     });
                 } else {
                     console.log('Info: carplate ' + reservationById.carplate + ' reservation not expired');
                 }
             }else{
                 console.log('Warning: Time Out Reservation Expiring, No reservation with id ' + reservationId.toString());
             }
           }

    });
};



/* POST reservation creation. */
router.post('/', function(req, res) {

    //TODO: must be changed to return only authorized resources
    //given an authenticated user (by token)

    if(!req.body) {
        return res.status(400).send({error:'request body missing'});
    }

    if(!('carplate' in req.body))  { return res.status(400).send({error:'missing field carplate in body request'}); }

    if(!(Parking.stats.freeLots>0)){
        return res.status(423).send({warning:'No Lots available at the moment'});
    }


    Reservation.find({carplate:req.body.carplate},"carplate",function(err,docs){
        if(!err){
            if(docs.length==0){
                Reservation.create(req.body, function(err, reserv){
                    if(!err){
                        //console.log("resID:" +reserv._id);
                        var ArpStatus={reservation:reserv};
                        setTimeout(function(){ timeOutCarIn(Parking.validity,reserv._id);},Parking.validity);
                        Parking.reserveLot(function(err,cb){
                            ArpStatus.stats={ 'freeLots': cb.freeLots, 'occupiedLots': cb.occupiedLots, 'reservedLots':cb.reservedLots};

                            //ADD CAR IN WHITE LIST
                            whiteList.addCarplate(req.body.carplate);

                            //UPLOAD HP CORE LOTS STATS(FREE, occupy....)
                            coreComunication.updateLostsStats();




                            var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
                            res.set('Location', fullUrl + "/"+ reserv._id);
                            res.status(201).send(ArpStatus);
                        });

                    }
                    else{
                        res.status(500).send({ error: 'something blew up, ERROR:'+err  });
                    }
                });
            } else{
                //console.log("DOCS: " + util.inspect(docs) + " L:" + docs.length);
                var strResponse='carplate ' + docs[0].carplate.toString() + '  already in reservation list';
                return res.status(409).send({warning:strResponse});
            }
        }else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });
});






function verifyQueryFields(fieldsArray,callback){
    var noValidfields=[];

    fieldsArray.forEach(function(value){
        if (!(Reservation.schema.path(value)))
            noValidfields.push(value);
    });

    if(noValidfields.length>0){
        var errorStr='invalid request fields';
        noValidfields.forEach(function(value){
            errorStr = errorStr + ", "+value;
        });
        callback({error:errorStr, type:400});
    } else callback("",null);
}


function validateDate(value){

    d = new Date(value);

    //console.log("DateVA: " + util.inspect(d));
    var rt;

    if(util.inspect(d)==='Invalid Date')
    rt=false;
    else
    rt=true;

    return(rt);
}


function verifyQuery(queryFields,callback){
    var noValidQuery=[];
    var noValidParams=[];
    var validQuery={};



    for (var v in queryFields) {

        switch (v) {
            case "fields":
            case "skip":
            case "limit":
            case "sortAsc":
            case "sortDesc":
                break;
            case "carplate":
                validQuery['carplate'] = queryFields[v];
                break;
            case "dateInlte":
                if (validateDate(queryFields[v]))
                    validQuery['dateIn'] = {"$lte": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateInlt":
                if (validateDate(queryFields[v]))
                    validQuery['dateIn'] = {"$lt": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateIngte":
                if (validateDate(queryFields[v]))
                    validQuery['dateIn'] = {"$gte": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateIngt":
                if (validateDate(queryFields[v]))
                    validQuery['dateIn'] = {"$gt": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateIne":
                if (validateDate(queryFields[v]))
                    validQuery['dateIn'] = queryFields[v]; //{"$gte": queryFields[v], "$lte": queryFields[v] };
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "parkedBy":
                if (validateDate(queryFields[v])) {
                    validQuery['dateIn'] = {"$gte": queryFields[v]};
                    validQuery['dateOut'] = {$exists: false};
                }
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "parkedNow":
                if (queryFields[v].toString() === "true" || queryFields[v].toString() === "1") {
                    validQuery['dateOut'] = {$exists: false};
                    validQuery['dateIn'] = {$exists: true};
                } else if (queryFields[v].toString() === "false" || queryFields[v].toString() === "0") {
                    validQuery['dateIn'] = {$exists: false};
                } else noValidQuery.push("no boolean value [0,1,true,false]:" + queryFields[v]);
                break;
            default:
                noValidParams.push(v);

        }
    }


    if(noValidParams.length>0){
        var errorStr='invalid request params';
        noValidParams.forEach(function(value){
            errorStr = errorStr + ", " + value;
        });
        callback({error:errorStr, type:400},null);
        //return res.status(400).send({error:errorStr});
    } else if(noValidQuery.length>0){
        var errorStr='invalid query request';
        noValidQuery.forEach(function(value){
            errorStr = errorStr+ ", " + value;
        });
        callback({error:errorStr, type:400},null);
    } else callback("",validQuery);
}


function verifySortFields(options,callback){




    if(options) {

        var asc = options.asc ? options.asc : [];
        var desc = options.desc ? options.desc : [];



        var noValidfields = [];
        var sort = {};

        asc.forEach(function (value) {
            if (!(Reservation.schema.path(value)))
                noValidfields.push(value);
            else
                sort[value] = 1;
        });

        desc.forEach(function (value) {
            if (!(Reservation.schema.path(value)))
                noValidfields.push(value);
            else
                sort[value] = -1;
        });


        if (noValidfields.length > 0) {
            var errorStr = 'invalid option sort fields: ';
            noValidfields.forEach(function (value) {
                errorStr = errorStr + value;
            });
            callback({error: errorStr, type: 400},null);
        } else callback("", sort);
    } else callback("",null);
}



/* GET reservations listing. */
router.get('/', function(req, res) {

    //TODO: returns ALL reservations, must be changed to return only authorized resources
    //given an authenticated user (by token)

    var fields = req.dbQueryFields;

    var query = {};
    var splitedFields= fields ? fields.split(" ") :[];



    //vrify query fields
    verifyQueryFields(splitedFields,function(err){
        if(err) return res.status(400).send(err);
       // console.log("FIELDS: " + util.inspect(fields));
        verifyQuery(req.query,function(errVQ,response){
            if(errVQ){

                return res.status(errVQ.type).send(errVQ);
            }
            query=response;
           // console.log("QUERY: " + util.inspect(query));
            verifySortFields(req.sort,function(errVSF,option){
                if(errVSF) {
                    return res.status(400).send(errVSF);
                }
                else {
                    if(option){
                        req.dbPagination.sort=option;
                    }


                  //  console.log("OPTIONS: " + util.inspect(req.dbPagination));
                    Reservation.findAll(query, fields, req.dbPagination, function (err, results) {

                        if (!err) {
                            if (results && results.reservations.length > 0) {
                                res.status(200).send(results);
                            }
                            else {
                                res.status(204).end(); // no content
                            }
                        }else {
                            res.status(500).send({ error: 'something blew up, ERROR:' + err  });
                        }

                    });
                }
            });


        });
    });


});




/* GET reservation by id. */
router.get('/:id', function(req, res) {

    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)






    if(req.sort){
        return res.status(400).send({error:'sort option param are not valid in get by Id'});
    }


    verifyQuery(req.query,function(errVQ,response) {
        if (errVQ || (Object.keys(response).length != 0)) {
            return res.status(400).send({error: 'query param \'q\' are not valid in get by Id'});
        }
        var fields = req.dbQueryFields;
        var id = req.param('id').toString();


        var noValidfields=[];
        var splitedFields= fields ? fields.split(" ") :[];




        splitedFields.forEach(function(value){
            if (!(Reservation.schema.path(value)))
                noValidfields.push(value);
        });


        if(noValidfields.length>0){
            var errorStr='invalid request fields ';
            noValidfields.forEach(function(value){
                errorStr = errorStr + value;
            });
            return res.status(400).send({error:errorStr});
        }


        Reservation.findById(id, fields, function(err, results){
            if(!err){
                if(results) res.status(200).send(results);
                else res.status(404).send({ error: 'no reservation found with specified id'});
            }
            else{
                res.status(500).send({ error: 'something blew up, ERROR:'+err  });
            }

        });
    });



/*
    var fields = req.dbQueryFields;
    var id = req.param('id').toString();


    var noValidfields=[];
    var splitedFields= fields ? fields.split(" ") :[];


    splitedFields.forEach(function(value){
        if (!(Reservation.schema.path(value)))
            noValidfields.push(value);
    });


    if(noValidfields.length>0){
        var errorStr='invalid request fields ';
        noValidfields.forEach(function(value){
            errorStr = errorStr + value;
        });
        return res.status(400).send({error:errorStr});
    }


    Reservation.findById(id, fields, function(err, results){
        if(!err){
            if(results) res.status(200).send(results);
            else res.status(404).send({ error: 'no reservation found with specified id'});
        }
        else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }

    });
*/

});



function verifyUpdatableFields(body){

    var boolValue=true;
    for (val in body){
        switch (val) {
            case "notes":
                //NOP
                break;
            default:
                boolValue=false;
        }
    }

    return(boolValue);
}

/* PUT, update reservation by id. */
router.put('/:id', function(req, res) {
    //TODO: must be changed to return only authorized reservations only notes can be upates
    //given an authenticated user (by token)

    if((!req.body)|| (Object.keys(req.body).length===0)) { return res.status(400).send({error:'request body missing'}); }

    if(!verifyUpdatableFields(req.body)) { return res.status(400).send({error:'Only field notes can be updated'}); }



    var id = req.param('id').toString();

    var newVals=req.body; // body already parsed

    Reservation.findByIdAndUpdate(id, newVals, {new: true}, function(err, results){
        if(!err){
            if (results){
                res.status(200).send(results);
            }
            else{
                res.status(404).send({error:'no reservation found with specified id'});
            }

        }
        else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });
});



/* PUT, update reservation by id. */

router.put('/carplate/:carplate', function(req, res) {
    //TODO: must be changed to return only authorized reservations no UPDATE DATAIN and DATA OUT
    //given an authenticated user (by token)

    //console.log("Body Keys " + Object.keys(req.body).length );
    if((!req.body)|| (Object.keys(req.body).length===0)) { return res.status(400).send({error:'request body missing'}); }

    if(!verifyUpdatableFields(req.body)) { return res.status(400).send({error:'Only field notes can be updated'}); }

    var carplateParam = req.param('carplate').toString();

    var newVals=req.body; // body already parsed


    Reservation.findOneAndUpdate({'carplate':carplateParam}, newVals, {new: true}, function(err, results){
        if(!err){
            if (results){
                res.status(200).send(results);
            }
            else{
                res.status(404).send({error:'no reservation found with this carplate'});
            }

        }
        else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });
});





/* DELETE reservation by id. */
router.delete('/:id', function(req, res) {
    var id = req.param('id').toString();
    Reservation.findOneAndRemove({_id:id},  {}, function(err, results){
        if(!err){
            if (results){

                // update HandyParking Core Lots Stats
                coreComunication.updateLostsStats();
                //Parking.updateLostsStats();

                // Remove carplate From White List
                whiteList.removeCarplate(results.carplate);



                res.status(200).send();
            }
            else
                res.status(404).send({error:'no reservation found with specified id'});
        }
        else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }

    });
});



/* DELETE reservation by carplate. */
router.post('/actions/deleteByCarplate', function(req, res) {
    var carplateParam = req.query.carplate ? req.query.carplate : null;


    //console.log("REMOVE CARPLATE IN RESERVATION ROOT:" + carplateParam );

    if(carplateParam) {

        Reservation.findOneAndRemove({"carplate":carplateParam}, {}, function (err, results) {
            if (!err) {
                //console.log("CARPLATE:" + util.inspect(results) );
                if (results) {
                    // update HandyParking Core Lots Stats
                    coreComunication.updateLostsStats();

                    // Remove carplate From White List
                    whiteList.removeCarplate(results.carplate);

                    res.status(201).send();
                }
                else
                    res.status(404).send({error: 'no reservation found with specified id'});
            }
            else {
                res.status(500).send({ error: 'something blew up, ERROR:' + err  });
            }
        });
    } else res.status(400).send({ error: 'missing carplate field'});
});



module.exports = router;
