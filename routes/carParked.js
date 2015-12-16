var express = require('express');
var middlewares = require('./middlewares');
var Reservation = require('../models/reservations').Reservation;
var Parking = require('../models/parking').ArpParking;
var CarParked = require('../models/carParked').CarParked;
//var ReservationSc = require('../models/reservations').ReservationSchema;
var router = express.Router();
var util = require('util');
var coreComunication = require('../models/coreComunication').CoreComunication;
var whiteList = require('../models/whiteList').WhiteList;


router.use(middlewares.parsePagination);
router.use(middlewares.parseFields);
router.use(middlewares.parseOptions);


function carIsParking(carplate,dataCarIn,hasRes,reservation,cb){
    var carParking= {
        carplate: carplate,
        dateIn: dataCarIn,
        hasReserved:hasRes
    };

    var noValidIn=false;
    if(hasRes && reservation.dateIn){
        noValidIn=true;
    }


    CarParked.findOne({carplate:carplate, dateOut: { $exists:false }},function(err,result){
       if(err)  cb(false,{error:'something blew up, ERROR:'+err});
       else{
           if(!result && !noValidIn) {
               CarParked.create(carParking, function (err, reserv) {
                   if (err)  cb(false, '');
                   else cb(true, reserv);
               });
           }else{
               cb(false,{warning:'Carplate is registered as already parked in carparked or/and reservation list'});
           }
       }
    });
}





/* Post, new Car Parking. */
router.post('/actions/carIn', function(req, res) {
    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)



    if((!req.body)|| (Object.keys(req.body).length===0)) { return res.status(400).send({error:'request body missing'}); }



    if(!('carplate' in req.body))  { return res.status(400).send({error:'missing field carplate in body request'}); }

    var dataCarIn=new Date();


    Reservation.findOne({'carplate':req.body.carplate},function(err, results){
        if(!err){
            if (results){ // there are a valid reservation


                carIsParking(req.body.carplate,dataCarIn,true,results,function(parked,cpResults){
                    if(!parked){
                        if('warning' in cpResults)
                            return res.status(409).send(cpResults);
                        else
                            return res.status(500).send({ error: 'something blew up in Saving car Parking, ERROR:'+ err  });
                    }else{
                        results.dateIn=dataCarIn;
                        results.save(function(err,reservationSaved){
                            if(err) return res.status(500).send({ error: 'something blew up in saving reservartion datain Update, ERROR:'+ err  });

                            //SET DATAIN in HP CORE
                            coreComunication.carParking(results.coreId,dataCarIn);

                            //Remove carplate From White List
                            // wait 5 sec before remove carplate from white list
                            setTimeout(function(){
                                whiteList.removeCarplate(results.carplate);
                            },5000);
                            res.status(201).send({parkInfo:cpResults, parkingStatus:Parking.getStats()});
                        });

                    }
                });


                //results.dateIn=dataCarIn;
                //results.hasReserved=true;
                //results.save(function(err,results){
                //  if(err) return res.status(500).send({ error: 'something blew up in Saving Reservation, ERROR:'+ err  });

                //});


            }else{ // there aren't a valid reservation

                Parking.shouldOccuppyLots(1,function(err,lotsStats){
                    if(!err){
                        carIsParking(req.body.carplate,dataCarIn,false,null,function(parked,cpResults){
                            if(!parked){
                                if('warning' in cpResults)
                                    return res.status(409).send(cpResults);
                                else
                                    return res.status(500).send({ error: 'something blew up in saving car parking, ERROR:'+ err  });
                            }else {
                                //UPDATE FREELOTS IN HP CORE
                                coreComunication.updateLostsStats();
                                res.status(201).send({'parkInfo': cpResults, 'parkingStatus': lotsStats});
                            }
                        });

                    } else{
                        res.status(423).send({warning:'No Lots available at the moment'});
                    }
                });
            }

        }else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });

});




/* post, new car parking. */
router.post('/actions/carIn/:carplate', function(req, res) {
    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)

    var carplateParam = req.param('carplate').toString();

    var dataCarIn=new Date();


    Reservation.findOne({'carplate':carplateParam},function(err, results){
        if(!err){
            if (results){ // there are a valid reservation


                carIsParking(carplateParam,dataCarIn,true,results,function(parked,cpResults){
                    if(!parked){
                        if('warning' in cpResults)
                            return res.status(409).send(cpResults);
                        else
                            return res.status(500).send({ error: 'something blew up in Saving car Parking, ERROR:'+ err  });
                    }else{
                        results.dateIn=dataCarIn;
                        results.save(function(err,reservationSaved){
                            if(err) return res.status(500).send({ error: 'something blew up in saving reservartion datain Update, ERROR:'+ err  });

                            //SET DATAIN in HP CORE
                            coreComunication.carParking(results.coreId,dataCarIn);

                            //Remove carplate From White List
                            // wait 5 sec before remove carplate from white list
                            setTimeout(function(){
                                whiteList.removeCarplate(results.carplate);
                            },5000);
                            res.status(201).send({parkInfo:cpResults, parkingStatus:Parking.getStats()});
                        });

                    }
                });


                //results.dateIn=dataCarIn;
                //results.hasReserved=true;
                //results.save(function(err,results){
                //  if(err) return res.status(500).send({ error: 'something blew up in Saving Reservation, ERROR:'+ err  });

                //});


            }else{ // there aren't a valid reservation



                Parking.shouldOccuppyLots(1,function(err,lotsStats){
                    if(!err){
                        carIsParking(carplateParam,dataCarIn,false,null,function(parked,cpResults){
                            if(!parked){
                                if('warning' in cpResults)
                                    return res.status(409).send(cpResults);
                                else
                                    return res.status(500).send({ error: 'something blew up in saving car parking, ERROR:'+ err  });
                            }else {
                                //UPDATE FREELOTS IN HP CORE
                                coreComunication.updateLostsStats();
                                res.status(201).send({'parkInfo': cpResults, 'parkingStatus': lotsStats});
                            }
                        });

                    } else{
                        res.status(423).send({warning:'No Lots available at the moment'});
                    }
                });
            }

        }else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });


});


function carIsLeavingParking(carplate,dataCarOut,cb) {


    CarParked.findOneAndUpdate({'carplate': carplate, dateOut: { $exists:false } }, {dateOut: dataCarOut}, {new: true}, function (err, results) {
        if(err)
            cb('something blew up, ERROR: '+err, {type:500});
        else{
            if(results){
                Parking.shouldFreeLots(1, function (err, lotStatus) {
                    if (err){
                        cb(err, {incongruity:{ type:409}, parkInfo:results, parkingStatus:lotStatus});
                    }
                    else{

                        //UPDATE HP CORE FREELOTS
                        coreComunication.updateLostsStats();

                        cb('', {parkInfo:results, parkingStatus:lotStatus});
                    }
                });
            } else cb('No carplate in carparked list', {incongruity:{ type:422}}); //422
        }

    });
}


/* PUT, car leaving parking. */
router.post('/actions/carOut', function(req, res) {
    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)

    if((!req.body)|| (Object.keys(req.body).length===0)) { return res.status(400).send({error:'request body missing'}); }

    if(!('carplate' in req.body))  { return res.status(400).send({error:'missing field carplate in body request'}); }

    var dataCarOut=new Date();


    Reservation.findOne({'carplate':req.body.carplate},function(err, results){
        if(!err){


            if (results){ // there are a valid reserved car Parked


                if(results.dateIn){

                    //Call HP CORE TO Make EXIT REQUEST
                    // if HP response is 200 Ok than{
                    coreComunication.carCanLeaveParking(results.coreId,dataCarOut,function(err,canLeaveResponse){
                        if(!err){
                            Reservation.remove({_id:results._id},function(err){
                                if(err) return res.status(500).send({ error: 'something blew up in deleting reservation, ERROR:'+ err  });
                            });

                            carIsLeavingParking(req.body.carplate,dataCarOut,function(err,responseCL){
                                if(err) {
                                    if (responseCL.incongruity.type === 500) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:' + err  }); //DB ERROR
                                    else if(responseCL.incongruity.type === 409){ //Car can Exit 200ok, but 409: parking.stats.occupiedlots=0 while should be equal to 1
                                        responseCL.incongruity.msg = err;
                                        whiteList.openDoor(req.body.carplate);
                                        return res.status(201).send(responseCL);
                                    }else { //Car can Exit 201ok, but 422: carplate is not registered in car parked list while in reservation list is registered as parked.
                                        // most probably there was an error in saving carplate in carparked list table
                                        responseCL.incongruity.msg= err;
                                        whiteList.openDoor(req.body.carplate);
                                        return res.status(201).send(responseCL);

                                    }
                                }
                                whiteList.openDoor(req.body.carplate);
                                res.status(201).send(responseCL);
                            });
                        }else{// ELSE{ Return Non puo uscire 402 Payment Required, 400,401,404,500 }
                            return(res.status(canLeaveResponse.statusCode).send(err));
                        }
                    });







                }else{
                    // errore macchina entrata ma non registrata ingresso in reservation

                    // CarParked.findOne({'carplate': req.body.carplate, dateOut: { $exists:false } }, function (err, results) {
                    // if(err) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:'+ err  });

                    //if(!results) return res.status(422).send({ warning: 'Inconsistent status, the car wasn\'t regeistered when entered'});

                    //UPDATE DATAIN in HP CORE AND Make EXIT REQUEST
                    //if HP response is 200 Ok than
                    coreComunication.carCanLeaveParking(results.coreId,dataCarOut,function(err,canLeaveResponse) {
                        if (!err) {
                            Reservation.remove({carplate:req.body.carplate},function(err){
                                if(err) return res.status(500).send({ error: 'something blew up in deleting reservation, ERROR:'+ err  });
                            });

                            carIsLeavingParking(req.body.carplate,dataCarOut,function(err,responseCL){
                                if(err){
                                    if(responseCL.incongruity.type === 500) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:'+ err  }); //DB ERROR
                                    else if(responseCL.incongruity.type === 409){ //Car can Exit 200ok, but 409: parking.stats.occupiedlots=0 while should be equal to 1
                                        responseCL.incongruity.msg = err;
                                        whiteList.openDoor(req.body.carplate);
                                        return res.status(201).send(responseCL);
                                    }else { //Car can't Exit 422, carplate is not registered in car parked list and in reservation list so,
                                        // most probably there was an error in reading carplate.
                                        responseCL.incongruity.msg= err;
                                        Reservation.create({carplate:req.body.carplate},function(err,data){
                                            if(err) return res.status(500).send({ error: 'something blew up in rollback reservation, ERROR:'+ err  });
                                            else{
                                                return res.status(422).send(responseCL);
                                            }
                                        });
                                    }
                                } else {
                                    whiteList.openDoor(req.body.carplate);
                                    return res.status(201).send(responseCL);
                                }
                            });
                        }else{// ELSE{ Return Non puo uscire 402 Payment Required, 400,401,404,500 }
                        return(res.status(canLeaveResponse.statusCode).send(err));
                    }
                    });


                    // });
                }

            }
            else{ // the car is not in reservation list


                carIsLeavingParking(req.body.carplate,dataCarOut,function(err,responseCL){
                    if(err){
                        if(responseCL.incongruity.type === 500) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:'+ err  }); //DB ERROR
                        else if(responseCL.incongruity.type === 409){ //Car can Exit 200ok, but 409: parking.stats.occupiedlots=0 while should be equal to 1
                            responseCL.incongruity.msg = err;
                            whiteList.openDoor(req.body.carplate);
                            return res.status(201).send(responseCL);
                        }else { //Car can't Exit 422, carplate is not registered in car parked list and in reservation list so,
                            // most probably there was an error in reading carplate.
                            responseCL.incongruity.msg= err;
                            return res.status(422).send(responseCL);
                        }
                    }
                    whiteList.openDoor(req.body.carplate);
                    res.status(201).send(responseCL);
                });

            }

        }
        else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });

});




/* post, car leaving parking. */

router.post('/actions/carOut/:carplate', function(req, res) {
    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)

    //console.log("Body Keys " + Object.keys(req.body).length );

    var carplateParam = req.param('carplate').toString();

    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)
    var dataCarOut=new Date();

    Reservation.findOne({'carplate':carplateParam},function(err, results){
        if(!err){


            if (results){ // there are a valid reserved car Parked


                if(results.dateIn){

                    //Call HP CORE TO Make EXIT REQUEST
                    // if HP response is 200 Ok than{
                    coreComunication.carCanLeaveParking(results.coreId,dataCarOut,function(err,canLeaveResponse){
                        if(!err){
                            Reservation.remove({_id:results._id},function(err){
                                if(err) return res.status(500).send({ error: 'something blew up in deleting reservation, ERROR:'+ err  });
                            });

                            carIsLeavingParking(carplateParam,dataCarOut,function(err,responseCL){
                                if(err) {
                                    if (responseCL.incongruity.type === 500) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:' + err  }); //DB ERROR
                                    else if(responseCL.incongruity.type === 409){ //Car can Exit 200ok, but 409: parking.stats.occupiedlots=0 while should be equal to 1
                                        responseCL.incongruity.msg = err;
                                        whiteList.openDoor(carplateParam);
                                        return res.status(201).send(responseCL);
                                    }else { //Car can Exit 201ok, but 422: carplate is not registered in car parked list while in reservation list is registered as parked.
                                        // most probably there was an error in saving carplate in carparked list table
                                        responseCL.incongruity.msg= err;
                                        whiteList.openDoor(carplateParam);
                                        return res.status(201).send(responseCL);
                                    }
                                }
                                whiteList.openDoor(carplateParam);
                                res.status(201).send(responseCL);
                            });
                        }else{// ELSE{ Return Non puo uscire 402 Payment Required, 400,401,404,500 }
                            return(res.status(canLeaveResponse.statusCode).send(err));
                        }
                    })







                }else{
                    // errore macchina entrata ma non registrata ingresso in reservation

                    // CarParked.findOne({'carplate': carplateParam, dateOut: { $exists:false } }, function (err, results) {
                    // if(err) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:'+ err  });

                    //if(!results) return res.status(422).send({ warning: 'Inconsistent status, the car wasn\'t regeistered when entered'});

                    //UPDATE DATAIN in HP CORE AND Make EXIT REQUEST
                    //if HP response is 200 Ok than
                    coreComunication.carCanLeaveParking(results.coreId,dataCarOut,function(err,canLeaveResponse) {
                        if (!err) {
                            Reservation.remove({carplate:carplateParam},function(err){
                                if(err) return res.status(500).send({ error: 'something blew up in deleting reservation, ERROR:'+ err  });
                            });

                            carIsLeavingParking(carplateParam,dataCarOut,function(err,responseCL){
                                if(err){
                                    if(responseCL.incongruity.type === 500) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:'+ err  }); //DB ERROR
                                    else if(responseCL.incongruity.type === 409){ //Car can Exit 200ok, but 409: parking.stats.occupiedlots=0 while should be equal to 1
                                        responseCL.incongruity.msg = err;
                                        whiteList.openDoor(carplateParam);
                                        return res.status(201).send(responseCL);
                                    }else { //Car can't Exit 422, carplate is not registered in car parked list and in reservation list so,
                                        // most probably there was an error in reading carplate.
                                        responseCL.incongruity.msg= err;
                                        Reservation.create({carplate:carplateParam},function(err,data){
                                            if(err) return res.status(500).send({ error: 'something blew up in rollback reservation, ERROR:'+ err  });
                                            else{
                                                return res.status(422).send(responseCL);
                                            }
                                        });
                                    }
                                } else {
                                    whiteList.openDoor(carplateParam);
                                    return res.status(201).send(responseCL);
                                }
                            });
                        }else{// ELSE{ Return Non puo uscire 402 Payment Required, 400,401,404,500 }
                            return(res.status(canLeaveResponse.statusCode).send(err));
                        }
                    });


                    // });
                }

            }
            else{ // the car is not in reservation list


                carIsLeavingParking(carplateParam,dataCarOut,function(err,responseCL){
                    if(err){
                        if(responseCL.incongruity.type === 500) return res.status(500).send({ error: 'something blew up in car leaving action, ERROR:'+ err  }); //DB ERROR
                        else if(responseCL.incongruity.type === 409){ //Car can Exit 200ok, but 409: parking.stats.occupiedlots=0 while should be equal to 1
                            responseCL.incongruity.msg = err;
                            whiteList.openDoor(carplateParam);
                            return res.status(201).send(responseCL);
                        }else { //Car can't Exit 422, carplate is not registered in car parked list and in reservation list so,
                            // most probably there was an error in reading carplate.
                            responseCL.incongruity.msg= err;
                            return res.status(422).send(responseCL);
                        }
                    }
                    whiteList.openDoor(carplateParam);
                    res.status(201).send(responseCL);
                });

            }

        }
        else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });


});



function verifyQueryFields(fieldsArray,callback){
    var noValidfields=[];

    fieldsArray.forEach(function(value){
        if (!(CarParked.schema.path(value)))
            noValidfields.push(value);
    });

    if(noValidfields.length>0){
        var errorStr='invalid request fields ';
        noValidfields.forEach(function(value){
            errorStr = errorStr + value;
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
                    validQuery['dateIn'] = {"$gte": queryFields[v], "$lte": queryFields[v] };
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateOutlte":
                if (validateDate(queryFields[v]))
                    validQuery['dateOut'] = {"$lte": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateOutlt":
                if (validateDate(queryFields[v]))
                    validQuery['dateOut'] = {"$lt": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateOutgte":
                if (validateDate(queryFields[v]))
                    validQuery['dateOut'] = {"$gte": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateOutgt":
                if (validateDate(queryFields[v]))
                    validQuery['dateOut'] = {"$gt": queryFields[v]};
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "dateOute":
                if (validateDate(queryFields[v]))
                    validQuery['dateOut'] = {"$gte": queryFields[v], "$lte": queryFields[v] };
                else noValidQuery.push("invalid date:" + queryFields[v]);
                break;
            case "reserved":
                if (queryFields[v].toString() === "true" || queryFields[v].toString() === "1") {
                    validQuery['hasReserved'] = true;
                } else if (queryFields[v].toString() === "false" || queryFields[v].toString() === "0") {
                    validQuery['hasReserved'] = false;
                } else noValidQuery.push("no boolean value [0,1,true,false]:" + queryFields[v]);
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
                } else if (queryFields[v].toString() === "false" || queryFields[v].toString() === "0") {
                    validQuery['dateOut'] = {$exists: true};
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


    //console.log("option:" + util.inspect(options));

    if(options) {

        var asc = options.asc ? options.asc : [];
        var desc = options.desc ? options.desc : [];


        var noValidfields = [];
        var sort = {};

        asc.forEach(function (value) {
            if (!(CarParked.schema.path(value)))
                noValidfields.push(value);
            else
                sort[value] = 1;
        });

        desc.forEach(function (value) {
            if (!(CarParked.schema.path(value)))
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



/* GET carparked listing.
 *
 * la query è del tipo: /carparked?skip=20&limit=100&fields=dataIn,dataOut,Carplate,...&q=carplate:val+DateInAfter:val+DateOutBefore:val
 *
 * Q params: carplate,dateInAfter,dateInBefore,dateOutAfter,dateOutBefore,reserved
 *
  * */
router.get('/', function(req, res) {

    //TODO: returns ALL reservations, must be changed to return only authorized resources
    //given an authenticated user (by token)

    var fields = req.dbQueryFields;

    var query;


    var splitedFields= fields ? fields.split(" ") :[];


    //vrify query fields
    verifyQueryFields(splitedFields,function(err){
       if(err) return res.status(400).send(err);

        verifyQuery(req.query,function(errVQ,response){
            if(errVQ){

                return res.status(errVQ.type).send(errVQ);
            }
            query=response;
            //console.log("Query" + util.inspect(query));
            verifySortFields(req.sort,function(errVSF,option){
                if(errVSF) {

                    return res.status(400).send(errVSF);
                }
                else {
                    if(option){
                        req.dbPagination.sort=option;
                    }

                    CarParked.findAll(query, fields, req.dbPagination, function (errFAll, results) {

                        if (!errFAll) {
                            if (results && results.carparkeds.length > 0) {
                                res.status(200).send(results);
                            }
                            else {
                                res.status(204).end(); // no content
                            }
                        }
                        else {
                            res.status(500).send({ error: 'something blew up, ERROR:' + errFAll  });
                        }
                    });
                }
            });


        });
    });

});








/* GET CarParked by id. */
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
            if (!(CarParked.schema.path(value)))
                noValidfields.push(value);
        });


        if(noValidfields.length>0){
            var errorStr='invalid request fields ';
            noValidfields.forEach(function(value){
                errorStr = errorStr + value;
            });
            return res.status(400).send({error:errorStr});
        }

        //console.log("Fields: " + fields);

        CarParked.findById(id, fields, function(err, results){
            if(!err){
                if(results) res.status(200).send(results);
                else res.status(404).send({ error: 'no car parked found with specified id'});
            }
            else{
                res.status(500).send({ error: 'something blew up, ERROR:'+err  });
            }

        });
    });




});





module.exports = router;
