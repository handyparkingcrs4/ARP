//var test= require('unit');
var should = require('should');
var mongoose = require('mongoose');
var _ = require('underscore')._;
var async = require('async');
var arpService = require("../models/startUp");
var Reservation = require('../models/reservations').Reservation;
var CarParked=require('../models/carParked').CarParked;
var Parking=require('../models/parking').ArpParking;
//var Lot = require('../models/lots').Lot;
//var l = require('../models/lots');
var request = require('request');
var app = require('../app');
var util = require('util');
var dateTest = require('unit.js');
var conf = require('../config').conf;

var APIURL = 'http://localhost:3001';

var server;


function start(result,done){
    console.log("6 @@@@@@@>>>>>CONNECTION");
    console.log(JSON.stringify(result));
    console.log("6 @@@@@@@<<<<CONNECTION");

    /////


    var getTokenDataBody = JSON.stringify(conf.carDriverTestUser);



    request.post({ url : Parking.urlHandyParkingcore + "/token",
        body : getTokenDataBody,
        headers:  {'content-type': 'application/json'}
    }, function(error, response, body){
        if(!error){
            bodyRes=JSON.parse(body);
            CarDriverUserTestToken=bodyRes.token;
            CarDriverUserTestUserId=bodyRes.userId;

            app.set('port', process.env.PORT || 3001);

            server = app.listen(app.get('port'), function() {
                console.log('TEST Express server listening on port ' + server.address().port);
                done();
            });

        }else console.log("ERROR IN CARDRIVER TOKEN REQUEST (BEFORE MODULE) " + error);




    });
}

 describe('ARP CARPARKED API ASYNC', function(){

    before(function(done){

        arpService.startService(function(err,result){
            if(!err) {
                start(result,done);
            }else{
                Parking.save(function(err,data){
                    if(!err){

                        arpService.stopService(function(err,result){

                            if(!err) {
                                arpService.startService(function(err,result){

                                    if(!err) {
                                        start(result,done);
                                    }else{
                                        console.log("ERROR: " + err);
                                    }
                                });
                            }else{
                                console.log("ERROR: " + err);
                            }
                        });

                    }
                });
                // console.log("ERROR: " + err);
            }
        });

    });

    after(function(done){
        Parking.validity=conf.parkingForTest.validity;
        arpService.stopService(function(err,result){

            if(!err) {

                console.log(JSON.stringify(result));
                done();
            }else{
                console.log("ERROR: " + err);
            }

        });

        server.close();
    });


    beforeEach(function(done){


      var range = _.range(100);

      var nowDate= new Date();
      var day=nowDate.valueOf();
      //day=day-200;

      async.each(range, function(e,cb){
          carparked = new CarParked({
              carplate: "AA123"+e+"CA",
              notes: ""+e,
              dateIn: new Date(day-(60*60*24*1000*e)),
              dateOut: new Date(day-(2*60*60*24*1000*e)),
              hasReserved: e > 50 ? true : false

          });

          carparked.save(function(err, reservation){
              if (err) throw err;
              cb();

          });

      }, function(err){
          done();
      });
    });

    afterEach(function(done){
      Parking.stats.freeLots=2;
      Parking.stats.occupiedLots=0;
      Parking.stats.reservedLots=0;
      Parking.stats.notAvailableLots=0;


        CarParked.remove(function(err, product){
            if(err) throw err;
            Reservation.remove(function(err, product){
                if(err) throw err;
                done();
            });
        });


    });



    function sleepT(millis){

         var date = new Date();
         var curDate = null;
         do {
             curDate = new Date();
             //console.log("SLEEP: " + (curDate-date).toString() );
         }while(curDate-date < millis);
    };








    describe('POST /carparked/actions/carIn', function(){

        it('no body Sended', function(done){

            var url = APIURL+'/carparked/actions/carIn';
            request.post({ url : url,
                headers: {'content-type': 'application/json'}
            }, function(error, response){
                if(error) throw error;
                else{
                    response.statusCode.should.be.equal(400);
                    var results = JSON.parse(response.body);
                    //results.should.have.property('dateIn');
                    results.should.have.property('error');
                    results.error.should.be.equal('request body missing');
                    done();
                }
            });
        });
    });



    describe('POST /carparked/actions/carIn', function(){

        it('no carplate field Sended in body', function(done){

            var reservation = {

                carplat:'ale romanino'

            };
            var reservBody = JSON.stringify(reservation);

            var url = APIURL+'/carparked/actions/carIn';

            request.post({ url : url,
                body : reservBody,
                headers: {'content-type': 'application/json'}
            }, function(error, response){
                if(error) throw error;
                else{
                    response.statusCode.should.be.equal(400);
                    var results = JSON.parse(response.body);
                    //results.should.have.property('dateIn');
                    results.should.have.property('error');
                    results.error.should.be.equal('missing field carplate in body request');
                    done();
                }
            });
        });
    });




     describe('POST /carparked/actions/carIn', function(){

         it('should be possible parking a car', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };
             var reservBody = JSON.stringify(reservation);

             var url = APIURL+'/carparked/actions/carIn';

             request.post({ url : url,
                 body : reservBody,
                 headers: {'content-type': 'application/json'}
             }, function(error, response){
                 if(error) throw error;
                 else{
                     response.statusCode.should.be.equal(201);
                     var results = JSON.parse(response.body);
                     //console.log("RESPOMSE after parking " + util.inspect(results));
                     results.should.have.property('parkInfo');
                     results.should.have.property('parkingStatus');
                     results.parkInfo.carplate.should.be.equal(reservation.carplate);
                     //results.error.should.be.equal('missing field carplate body request');
                     done();
                 }
             });
         });
     });




    describe('POST /carparked/actions/carIn', function(){

        it('should not be possible parking a car, no lots available', function(done){

            var reservation = {

                carplate:'ale romanino'

            };

            Parking.reserveLot(function(err,resul){ // lock 1° lot
                if(err) throw err
                else{
                    Parking.reserveLot(function(err,resul){ //lock 2° lot
                        if(err) throw err
                        else{
                            var reservBody = JSON.stringify(reservation);

                            var url = APIURL+'/carparked/actions/carIn';

                            request.post({ url : url,
                                body : reservBody,
                                headers: {'content-type': 'application/json'}
                            }, function(error, response){
                                if(error) throw error;
                                else{
                                    response.statusCode.should.be.equal(423);
                                    var results = JSON.parse(response.body);
                                    results.should.have.property('warning');
                                    results.warning.should.be.equal('No Lots available at the moment');
                                    done();
                                }
                            });
                        }
                    });
                }
            });

        });
    });



     describe('POST /carparked/actions/carIn', function(){

         it('should not be possible parking a car, car already in carparked list', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };

             CarParked.create({carplate:'ale romanino' , dateIn:new Date()},function(err,resu){
                 var reservBody = JSON.stringify(reservation);

                 var url = APIURL+'/carparked/actions/carIn';

                 request.post({ url : url,
                     body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(409);
                         var results = JSON.parse(response.body);
                         results.should.have.property('warning');
                         results.warning.should.be.equal('Carplate is registered as already parked in carparked or/and reservation list');
                         done();
                     }
                 });

             });

         });
     });


     describe('POST /carparked/actions/carIn', function(){

         it('should not be possible parking a car, car already in car parked reservation list', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };

             Reservation.create({carplate:'ale romanino' , dateIn:new Date()},function(err,resu){
                 var reservBody = JSON.stringify(reservation);

                 var url = APIURL+'/carparked/actions/carIn';

                 request.post({ url : url,
                     body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(409);
                         var results = JSON.parse(response.body);
                         results.should.have.property('warning');
                         results.warning.should.be.equal('Carplate is registered as already parked in carparked or/and reservation list');
                         done();
                     }
                 });

             });

         });
     });


     describe('POST /carparked/actions/carIn', function(){

         it('should be possible parking a car, car in reservation list', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };

             Reservation.create({carplate:'ale romanino'},function(err,resu){
                 var reservBody = JSON.stringify(reservation);

                 var url = APIURL+'/carparked/actions/carIn';

                 var parkinStats=Parking.getStats();

                 request.post({ url : url,
                     body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(201);
                         var results = JSON.parse(response.body);
                         results.should.have.property('parkInfo');
                         results.should.have.property('parkingStatus');
                         results.parkingStatus.freeLots.should.be.equal(parkinStats.freeLots);
                         results.parkingStatus.occupiedLots.should.be.equal(parkinStats.occupiedLots);
                         results.parkingStatus.reservedLots.should.be.equal(parkinStats.reservedLots);
                         results.parkInfo.carplate.should.be.equal(reservation.carplate);
                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);

                         Reservation.findById(resu._id,function(err,rsvrsu){
                            rsvrsu.dateIn.should.not.be.equal(undefined);
                         });


                         done();
                     }
                 });

             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('no body Sended', function(done){

             var url = APIURL+'/carparked/actions/carOut';
             request.post({ url : url,
                 headers: {'content-type': 'application/json'}
             }, function(error, response){
                 if(error) throw error;
                 else{
                     response.statusCode.should.be.equal(400);
                     var results = JSON.parse(response.body);
                     //results.should.have.property('dateIn');
                     results.should.have.property('error');
                     results.error.should.be.equal('request body missing');
                     done();
                 }
             });
         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('no carplate field Sended in body', function(done){

             var reservation = {

                 carplat:'ale romanino'

             };
             var reservBody = JSON.stringify(reservation);

             var url = APIURL+'/carparked/actions/carOut';

             request.post({ url : url,
                 body : reservBody,
                 headers: {'content-type': 'application/json'}
             }, function(error, response){
                 if(error) throw error;
                 else{
                     response.statusCode.should.be.equal(400);
                     var results = JSON.parse(response.body);
                     //results.should.have.property('dateIn');
                     results.should.have.property('error');
                     results.error.should.be.equal('missing field carplate in body request');
                     done();
                 }
             });
         });
     });


/*  ::TODO
     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruence type 409: no occuppied lots available ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             Reservation.create(reservation,function(err,resu){
                CarParked.create(reservation,function(err,resu){
                    Parking.stats.occupiedLots=0;

                    var reservBody = JSON.stringify(reservation);

                    var url = APIURL+'/carparked/actions/carOut';

                    request.post({ url : url,
                        body : reservBody,
                        headers: {'content-type': 'application/json'}
                    }, function(error, response, body){
                        if(error) throw error;
                        else{
                           // console.log("BODY::::"+ body);
                            response.statusCode.should.be.equal(201);
                            var results = JSON.parse(response.body);
                            results.should.have.property('incongruity');
                            results.should.have.property('parkInfo');
                            results.should.have.property('parkingStatus');
                            results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                            results.incongruity.type.should.be.equal(409);
                            results.parkInfo.carplate.should.be.equal(reservation.carplate);
                            results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                            results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                            results.parkingStatus.occupiedLots.should.be.equal(0);
                            done();
                        }
                    });
                });
             });

         });
     });
*/

/* TODO
     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date(),
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'ale romanino',
                 dateIn:new Date(),
                 dateOut:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(prkedCar,function(err,resu){

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list when carplate not esist ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
                 //dateOut:new Date()
             };

             var park = {

                 carplate:'ale romanin'

             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });

     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list carplate not exist and dataOut setted ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
                 //dateOut:new Date()
             };

             var park = {

                 carplate:'ale romanin',
                 dateOut:new Date()

             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200, car can leave parking', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             Reservation.create(reservation,function(err,resu){
                 CarParked.create(reservation,function(err,resu){

                     Parking.stats.occupiedLots=1;

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                            response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.should.not.have.property('incongruity');
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             Parking.stats.occupiedLots.should.be.equal(0);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });
             });

         });
     });




     describe('POST /carparked/actions/carOut', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO CARPLATE) ', function(done){

             var reservation = {

                 carplate:'ale romanino'
             };

             var park = {

                 carplate:'ale romanin'
                 //dateOut:new Date()

             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(422);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false)', function(done){

             var reservation = {

                 carplate:'ale romanino'
             };

             var park = {

                 carplate:'ale romanino',
                 dateOut:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             //console.log(util.inspect(response.body));

                             response.statusCode.should.be.equal(422);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200 when car In is wrongly registered only in carparked list but not in reservation In list, incongruence type 409: no occuppied lots available', function(done){

             var reservation = {

                 carplate:'ale romanino'
                 //dateIn:new Date()
             };
             var parkin = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(parkin,function(err,resu){
                     Parking.stats.occupiedLots=0;

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                             results.incongruity.type.should.be.equal(409);
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200, car can leave parking also that dateIn isn\'t registered in reservation list', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 //dateIn:new Date()
             };

             var prki = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(prki,function(err,resu){

                     Parking.stats.occupiedLots=1;

                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.should.not.have.property('incongruity');
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             Parking.stats.occupiedLots.should.be.equal(0);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });
             });

         });
     });



     //////////
     describe('POST /carparked/actions/carOut', function(){

         it('test 422 in not reserved carplate, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false)', function(done){

             var parkin = {

                 carplate:'ale romanino',
                 dateOut:new Date()
             };


                 CarParked.create(parkin,function(err,resu){

                     var reservBody = JSON.stringify(parkin);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             //console.log(util.inspect(response.body));

                             response.statusCode.should.be.equal(422);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });


         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200 in not reserved carplate but, incongruence type 409: no occuppied lots available', function(done){


             var parkin = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


                 CarParked.create(parkin,function(err,resu){
                     Parking.stats.occupiedLots=0;

                     var reservBody = JSON.stringify(parkin);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                             results.incongruity.type.should.be.equal(409);
                             results.parkInfo.carplate.should.be.equal(parkin.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });


         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200 in not reserved carplate', function(done){

             var prki = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


                 CarParked.create(prki,function(err,resu){

                     Parking.stats.occupiedLots=1;

                     var reservBody = JSON.stringify(prki);

                     var url = APIURL+'/carparked/actions/carOut';

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.should.not.have.property('incongruity');
                             results.parkInfo.carplate.should.be.equal(prki.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             Parking.stats.occupiedLots.should.be.equal(0);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });


         });
     });

     */
     /////////


     ///// PARAM

     describe('POST /carparked/actions/carIn/:IdCarplate', function(){

         it('should be possible parking a car', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };
             //var reservBody = JSON.stringify(reservation);

             var url = APIURL+'/carparked/actions/carIn/' + reservation.carplate;

             request.post({ url : url,
                 //body : reservBody,
                 headers: {'content-type': 'application/json'}
             }, function(error, response){
                 if(error) throw error;
                 else{
                     response.statusCode.should.be.equal(201);
                     var results = JSON.parse(response.body);
                     console.log("RESPOMSE after parking " + util.inspect(results));
                     results.should.have.property('parkInfo');
                     results.should.have.property('parkingStatus');
                     results.parkInfo.carplate.should.be.equal(reservation.carplate);
                     //results.error.should.be.equal('missing field carplate body request');
                     done();
                 }
             });
         });
     });




     describe('POST /carparked/actions/carIn/:IdCarplate', function(){

         it('should not be possible parking a car, no lots available', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };

             Parking.reserveLot(function(err,resul){ // lock 1° lot
                 if(err) throw err
                 else{
                     Parking.reserveLot(function(err,resul){ //lock 2° lot
                         if(err) throw err
                         else{
                             //var reservBody = JSON.stringify(reservation);

                             var url = APIURL+'/carparked/actions/carIn/' + reservation.carplate;

                             request.post({ url : url,
                                // body : reservBody,
                                 headers: {'content-type': 'application/json'}
                             }, function(error, response){
                                 if(error) throw error;
                                 else{
                                     response.statusCode.should.be.equal(423);
                                     var results = JSON.parse(response.body);
                                     results.should.have.property('warning');
                                     results.warning.should.be.equal('No Lots available at the moment');
                                     done();
                                 }
                             });
                         }
                     });
                 }
             });

         });
     });



     describe('POST /carparked/actions/carIn/:IdCarplate', function(){

         it('should not be possible parking a car, car already in carparked list', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };

             CarParked.create({carplate:'ale romanino' , dateIn:new Date()},function(err,resu){
                 //var reservBody = JSON.stringify(reservation);

                 var url = APIURL+'/carparked/actions/carIn/' + reservation.carplate;

                 request.post({ url : url,
                     //body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(409);
                         var results = JSON.parse(response.body);
                         results.should.have.property('warning');
                         results.warning.should.be.equal('Carplate is registered as already parked in carparked or/and reservation list');
                         done();
                     }
                 });

             });

         });
     });


     describe('POST /carparked/actions/carIn/:IdCarplate', function(){

         it('should not be possible parking a car, car already in car parked reservation list', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };

             Reservation.create({carplate:'ale romanino' , dateIn:new Date()},function(err,resu){
                // var reservBody = JSON.stringify(reservation);

                 var url = APIURL+'/carparked/actions/carIn/' + reservation.carplate;

                 request.post({ url : url,
                     //body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(409);
                         var results = JSON.parse(response.body);
                         results.should.have.property('warning');
                         results.warning.should.be.equal('Carplate is registered as already parked in carparked or/and reservation list');
                         done();
                     }
                 });

             });

         });
     });


     describe('POST /carparked/actions/carIn/:IdCarplate', function(){

         it('should be possible parking a car, car in reservation list', function(done){

             var reservation = {

                 carplate:'ale romanino'

             };

             Reservation.create({carplate:'ale romanino'},function(err,resu){
               //  var reservBody = JSON.stringify(reservation);

                 var url = APIURL+'/carparked/actions/carIn/' + reservation.carplate;

                 var parkinStats=Parking.getStats();

                 request.post({ url : url,
                    // body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(201);
                         var results = JSON.parse(response.body);
                         results.should.have.property('parkInfo');
                         results.should.have.property('parkingStatus');
                         results.parkingStatus.freeLots.should.be.equal(parkinStats.freeLots);
                         results.parkingStatus.occupiedLots.should.be.equal(parkinStats.occupiedLots);
                         results.parkingStatus.reservedLots.should.be.equal(parkinStats.reservedLots);
                         results.parkInfo.carplate.should.be.equal(reservation.carplate);
                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);

                         Reservation.findById(resu._id,function(err,rsvrsu){
                             rsvrsu.dateIn.should.not.be.equal(undefined);
                         });


                         done();
                     }
                 });

             });

         });
     });


/* TODO

     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200, incongruence type 409: no occuppied lots available ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             Reservation.create(reservation,function(err,resu){
                 CarParked.create(reservation,function(err,resu){
                     Parking.stats.occupiedLots=0;

                    // var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                        // body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                             results.incongruity.type.should.be.equal(409);
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });
             });

         });
     });



     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
                 //dateOut:new Date()
             };
             var prk = {

                 carplate:'ale romanino',
                 dateIn:new Date(),
                 dateOut:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(prk,function(err,resu){

                    // var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                        // body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });


     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list when carplate not esist ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
                 //dateOut:new Date()
             };

             var park = {

                 carplate:'ale romanin'

             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                    // var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                         //body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });

     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list carplate not exist and dataOut setted ', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
                 //dateOut:new Date()
             };

             var park = {

                 carplate:'ale romanin',
                 dateOut:new Date()

             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                    // var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                       //  body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });

     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200, car can leave parking', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             Reservation.create(reservation,function(err,resu){
                 CarParked.create(reservation,function(err,resu){

                     Parking.stats.occupiedLots=1;

                    // var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                         //body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.should.not.have.property('incongruity');
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             Parking.stats.occupiedLots.should.be.equal(0);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });
             });

         });
     });




     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO CARPLATE) ', function(done){

             var reservation = {

                 carplate:'ale romanino'
             };

             var park = {

                 carplate:'ale romanin'
                 //dateOut:new Date()

             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                    // var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                       //  body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(422);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });



     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false)', function(done){

             var reservation = {

                 carplate:'ale romanino'
             };

             var park = {

                 carplate:'ale romanino',
                 dateOut:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(park,function(err,resu){

                    // var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + park.carplate;

                     request.post({ url : url,
                        // body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             //console.log(util.inspect(response.body));

                             response.statusCode.should.be.equal(422);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.not.have.property('parkInfo');
                             results.should.not.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('No carplate in carparked list');
                             results.incongruity.type.should.be.equal(422);
                             done();
                         }
                     });
                 });
             });

         });
     });


     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200 when car In is wrongly registered only in carparked list but not in reservation In list, incongruence type 409: no occuppied lots available', function(done){

             var reservation = {

                 carplate:'ale romanino'
                 //dateIn:new Date()
             };
             var parkin = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(parkin,function(err,resu){
                     Parking.stats.occupiedLots=0;

                     //var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                       //  body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('incongruity');
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                             results.incongruity.type.should.be.equal(409);
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });
             });

         });
     });


     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200, car can leave parking also that dateIn isn\'t registered in reservation list', function(done){

             var reservation = {

                 carplate:'ale romanino',
                 //dateIn:new Date()
             };

             var prki = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };

             Reservation.create(reservation,function(err,resu){
                 CarParked.create(prki,function(err,resu){

                     Parking.stats.occupiedLots=1;

                     //var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate;

                     request.post({ url : url,
                        // body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.should.not.have.property('incongruity');
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                             results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                             Parking.stats.occupiedLots.should.be.equal(0);
                             results.parkingStatus.occupiedLots.should.be.equal(0);
                             done();
                         }
                     });
                 });
             });

         });
     });




     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 422 in not reserved carplate, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false)', function(done){

             var parkin = {

                 carplate:'ale romanino',
                 dateOut:new Date()
             };


             CarParked.create(parkin,function(err,resu){

                 //var reservBody = JSON.stringify(parkin);

                 var url = APIURL+'/carparked/actions/carOut/' + parkin.carplate;

                 request.post({ url : url,
                    // body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         //console.log(util.inspect(response.body));

                         response.statusCode.should.be.equal(422);
                         var results = JSON.parse(response.body);
                         results.should.have.property('incongruity');
                         results.should.not.have.property('parkInfo');
                         results.should.not.have.property('parkingStatus');
                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                         results.incongruity.type.should.be.equal(422);
                         done();
                     }
                 });
             });


         });
     });


     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200 in not reserved carplate but, incongruence type 409: no occuppied lots available', function(done){


             var parkin = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             CarParked.create(parkin,function(err,resu){
                 Parking.stats.occupiedLots=0;

                // var reservBody = JSON.stringify(parkin);

                 var url = APIURL+'/carparked/actions/carOut/' + parkin.carplate;

                 request.post({ url : url,
                    // body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(201);
                         var results = JSON.parse(response.body);
                         results.should.have.property('incongruity');
                         results.should.have.property('parkInfo');
                         results.should.have.property('parkingStatus');
                         results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                         results.incongruity.type.should.be.equal(409);
                         results.parkInfo.carplate.should.be.equal(parkin.carplate);
                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                         results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                         results.parkingStatus.occupiedLots.should.be.equal(0);
                         done();
                     }
                 });
             });


         });
     });


     describe('POST /carparked/actions/carOut/:idcarplate', function(){

         it('test 200 in not reserved carplate', function(done){

             var prki = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             CarParked.create(prki,function(err,resu){

                 Parking.stats.occupiedLots=1;

                // var reservBody = JSON.stringify(prki);

                 var url = APIURL+'/carparked/actions/carOut/' + prki.carplate;

                 request.post({ url : url,
                   //  body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(201);
                         var results = JSON.parse(response.body);
                         results.should.have.property('parkInfo');
                         results.should.have.property('parkingStatus');
                         results.should.not.have.property('incongruity');
                         results.parkInfo.carplate.should.be.equal(prki.carplate);
                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                         results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                         Parking.stats.occupiedLots.should.be.equal(0);
                         results.parkingStatus.occupiedLots.should.be.equal(0);
                         done();
                     }
                 });
             });


         });
     });
*/



     describe('GET /carparked', function(){

         it('must return 2 carparked and _metadata, all fields', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=2', function(error, response, body){

                 if(error) throw err;
                 else{
                     //console.log("BODY RESPONSE:" + util.inspect(body));
                     response.statusCode.should.be.equal(200);
                     var results = JSON.parse(body);
                     results.should.have.property('_metadata');
                     results.should.have.property('carparkeds');
                     results._metadata.skip.should.be.equal(0);
                     results._metadata.limit.should.be.equal(2);
                     results._metadata.totalCount.should.be.equal(100);
                     should.exist(results.carparkeds[0]);
                     var carparked = results.carparkeds[0];
                     carparked.should.have.property('carplate');
                     carparked.should.have.property('notes');
                     carparked.should.have.property('dateIn');
                     carparked.should.have.property('dateOut');
                     carparked.should.have.property('hasReserved');

                 }
                 done();
             });

         });

     });




     describe('GET /carparked', function(){

         it('must return 2 carparked and _metadata, fields carplate,dateIn', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=2&fields=dateIn,carplate', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(200);
                     var results = JSON.parse(body);
                     results.should.have.property('_metadata');
                     results.should.have.property('carparkeds');
                     results._metadata.skip.should.be.equal(0);
                     results._metadata.limit.should.be.equal(2);
                     results._metadata.totalCount.should.be.equal(100);
                     should.exist(results.carparkeds[0]);
                     var carparked = results.carparkeds[0];
                     carparked.should.have.property('carplate');
                     carparked.should.not.have.property('notes');
                     carparked.should.have.property('dateIn');
                     carparked.should.not.have.property('dateOut');
                     carparked.should.not.have.property('hasReserved');

                 }
                 done();
             });

         });

     });

     describe('GET /carparked', function(){

         it('must return 400 error, error in fields carplatee', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=2&fields=dateIn,carplatee', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(400);
                     var results = JSON.parse(body);
                     results.should.have.property('error');
                     results.error.should.be.equal('invalid request fields carplatee');
                 }
                 done();
             });

         });

     });


     describe('GET /carparked', function(){

         it('must return 400 error, error in query fields reserved', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=2&fields=dateIn,carplate&hasReserved=true', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(400);
                     var results = JSON.parse(body);
                     results.should.have.property('error');
                     results.error.should.be.equal('invalid request params, hasReserved');
                 }
                 done();
             });

         });

     });


     describe('GET /carparked', function(){

         it('must return 20 carparked and _metadata, hasReserved:true, fields all', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=20&reserved=true', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(200);
                     var results = JSON.parse(body);
                     results.should.have.property('_metadata');
                     results.should.have.property('carparkeds');
                     results._metadata.skip.should.be.equal(0);
                     results._metadata.limit.should.be.equal(20);
                     results._metadata.totalCount.should.be.equal(49);
                     should.exist(results.carparkeds[0]);
                     var carparked = results.carparkeds[0];
                     carparked.should.have.property('carplate');
                     carparked.should.have.property('notes');
                     carparked.should.have.property('dateIn');
                     carparked.should.have.property('dateOut');
                     carparked.should.have.property('hasReserved');
                     carparked.hasReserved.should.be.equal(true);

                 }
                 done();
             });

         });

     });

     describe('GET /carparked', function(){

         it('must return 20 carparked and _metadata, hasReserved:true, fields carplate,dateIn,hasReserved', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=20&fields=dateIn,hasReserved,carplate&reserved=true', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(200);
                     var results = JSON.parse(body);
                     results.should.have.property('_metadata');
                     results.should.have.property('carparkeds');
                     results._metadata.skip.should.be.equal(0);
                     results._metadata.limit.should.be.equal(20);
                     results._metadata.totalCount.should.be.equal(49);
                     should.exist(results.carparkeds[0]);
                     var carparked = results.carparkeds[0];
                     carparked.should.have.property('carplate');
                     carparked.should.not.have.property('notes');
                     carparked.should.have.property('dateIn');
                     carparked.should.not.have.property('dateOut');
                     carparked.should.have.property('hasReserved');
                     carparked.hasReserved.should.be.equal(true);

                 }
                 done();
             });

         });

     });


     describe('GET /carparked', function(){

         it('must return 20 carparked and _metadata, hasReserved:true, fields carplate,dateIn,hasReserved sort dataOut desc', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=20&fields=dateIn,hasReserved,carplate&reserved=true&sortDesc=dateOut,carplate', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(200);
                     var results = JSON.parse(body);
                     results.should.have.property('_metadata');
                     results.should.have.property('carparkeds');
                     results._metadata.skip.should.be.equal(0);
                     results._metadata.limit.should.be.equal(20);
                     results._metadata.totalCount.should.be.equal(49);
                     should.exist(results.carparkeds[0]);
                     var carparked = results.carparkeds[0];
                     carparked.should.have.property('carplate');
                     carparked.should.not.have.property('notes');
                     carparked.should.have.property('dateIn');
                     carparked.should.not.have.property('dateOut');
                     carparked.should.have.property('hasReserved');
                     carparked.hasReserved.should.be.equal(true);
                     carparked.dateIn.should.be.greaterThan(results.carparkeds[1].dateIn);
                     dateTest.date(new Date(carparked.dateIn)).isAfter(new Date(results.carparkeds[1].dateIn));
                 }
                 done();
             });

         });

     });


     describe('GET /carparked', function(){

         it('must return 20 carparked and _metadata, hasReserved:true, fields carplate,dateIn,hasReserved sort dataOut Asc', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=20&fields=dateIn,hasReserved,carplate&reserved=true&sortAsc=dateOut,carplate', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(200);
                     var results = JSON.parse(body);
                     results.should.have.property('_metadata');
                     results.should.have.property('carparkeds');
                     results._metadata.skip.should.be.equal(0);
                     results._metadata.limit.should.be.equal(20);
                     results._metadata.totalCount.should.be.equal(49);
                     should.exist(results.carparkeds[0]);
                     var carparked = results.carparkeds[0];
                     carparked.should.have.property('carplate');
                     carparked.should.not.have.property('notes');
                     carparked.should.have.property('dateIn');
                     carparked.should.not.have.property('dateOut');
                     carparked.should.have.property('hasReserved');
                     carparked.hasReserved.should.be.equal(true);
                     carparked.dateIn.should.be.lessThan(results.carparkeds[1].dateIn);
                     dateTest.date(new Date(carparked.dateIn)).isBefore(new Date(results.carparkeds[1].dateIn));
                 }
                 done();
             });

         });

     });




     describe('GET /carparked', function(){

         it('must return 20 carparked and _metadata, hasReserved:true, fields carplate,dateIn,hasReserved sort dataOut desc', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=20&fields=dateIn,hasReserved,carplate&reserved=false&sortAsc=dateOut,carplate', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(200);
                     var results = JSON.parse(body);
                     results.should.have.property('_metadata');
                     results.should.have.property('carparkeds');
                     results._metadata.skip.should.be.equal(0);
                     results._metadata.limit.should.be.equal(20);
                     results._metadata.totalCount.should.be.equal(51);
                     should.exist(results.carparkeds[0]);
                     var carparked = results.carparkeds[0];
                     carparked.should.have.property('carplate');
                     carparked.should.not.have.property('notes');
                     carparked.should.have.property('dateIn');
                     carparked.should.not.have.property('dateOut');
                     carparked.should.have.property('hasReserved');
                     carparked.hasReserved.should.be.equal(false);
                     carparked.dateIn.should.be.lessThan(results.carparkeds[1].dateIn);
                     dateTest.date(new Date(carparked.dateIn)).isBefore(new Date(results.carparkeds[1].dateIn));
                 }
                 done();
             });

         });

     });



     describe('GET /carparked', function(){

         it('must return 400, invalid option sort fields: dateOut', function(done){

             request.get(APIURL+'/carparked?skip=0&limit=20&fields=dateIn,hasReserved,carplate&reserved=false&sortAsc=dataOut,carplate', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(400);
                     var results = JSON.parse(body);
                     results.should.have.property('error');
                     results.should.have.property('type');
                     results.type.should.be.equal(400);
                     results.error.should.be.equal('invalid option sort fields: dataOut');
                 }
                 done();
             });

         });

     });


     describe('GET /carparked', function(){

         it('must return 400, invalid option sort fields: dateOut', function(done){

             request.get(APIURL+'/carparked?sortAsc=dataOut,carplate', function(error, response, body){

                 if(error) throw err;
                 else{
                     response.statusCode.should.be.equal(400);
                     var results = JSON.parse(body);
                     results.should.have.property('error');
                     results.should.have.property('type');
                     results.type.should.be.equal(400);
                     results.error.should.be.equal('invalid option sort fields: dataOut');
                 }
                 done();
             });

         });

     });


     describe('GET /carparked/Id', function(){

         it('must return 400, opt is not valid in get by id', function(done){

             var obj={'carplate':"ale",
                      'hasReserved':true
             };
             CarParked.create(obj,function(err,res){
                 if(!err){
                     request.get(APIURL+'/carparked/'+ res._id +'?skip=0&limit=20&fields=dateIn,hasReserved,carplate&sortAsc=dateOut,carplate', function(error, response, body){
                         //console.log("ERRRRRRRROOO:" + util.inspect(body));
                         if(error) throw err;
                         else{
                             response.statusCode.should.be.equal(400);
                             var results = JSON.parse(body);
                             results.should.have.property('error');
                             results.error.should.be.equal('sort option param are not valid in get by Id');
                         }
                         done();
                     });
                 }

             })



         });

     });


     describe('GET /carparked/Id', function(){

         it('must return 200, hasReserved:true, fields carplate,dateIn,hasReserved', function(done){

             var obj={'carplate':"ale",
                 'hasReserved':true,
                 dateIn:new Date()
             };
             CarParked.create(obj,function(err,res){
                 if(!err) {

                     request.get(APIURL + '/carparked/'+res._id+'?skip=0&limit=20&fields=dateIn,hasReserved,carplate', function (error, response, body) {

                         if (error) throw err;
                         else {
                             response.statusCode.should.be.equal(200);
                             var results = JSON.parse(body);

                             results.should.have.property('carplate');
                             results.should.not.have.property('notes');
                             results.should.have.property('dateIn');
                             results.should.not.have.property('dateOut');
                             results.should.have.property('hasReserved');
                             results.hasReserved.should.be.equal(true);
                         }
                         done();
                     });
                 }
             });

         });

     });


     describe('GET /carparked/Id', function(){

         it('must return 400, hasReserved:true, fields dataIn invalid', function(done){

             var obj={'carplate':"ale",
                 'hasReserved':true,
                 dateIn:new Date()
             };
             CarParked.create(obj,function(err,res){
                 if(!err) {

                     request.get(APIURL + '/carparked/'+res._id+'?skip=0&limit=20&fields=dataIn,hasReserved,carplate', function (error, response, body) {

                         if (error) throw err;
                         else {
                             response.statusCode.should.be.equal(400);
                             var results = JSON.parse(body);

                             results.should.have.property('error');
                             results.error.should.be.equal('invalid request fields dataIn');
                         }
                         done();
                     });
                 }
             });

         });

     });


     describe('GET /carparked/Id', function(){

         it('must return 400, hasReserved:true, fields dataIn invalid', function(done){

             var obj={'carplate':"ale",
                 'hasReserved':true,
                 dateIn:new Date()
             };
             CarParked.create(obj,function(err,res){
                 if(!err) {

                     request.get(APIURL + '/carparked/'+res._id+'?skip=0&limit=20&fields=dataIn,hasReserved,carplate', function (error, response, body) {

                         if (error) throw err;
                         else {
                             response.statusCode.should.be.equal(400);
                             var results = JSON.parse(body);

                             results.should.have.property('error');
                             results.error.should.be.equal('invalid request fields dataIn');
                         }
                         done();
                     });
                 }
             });

         });

     });


     describe('GET /carparked/Id', function(){

         it('must return 400, field q invalid', function(done){

             var obj={'carplate':"ale",
                 'hasReserved':true,
                 dateIn:new Date()
             };
             CarParked.create(obj,function(err,res){
                 if(!err) {

                     request.get(APIURL + '/carparked/'+res._id+'?skip=0&limit=20&fields=dateIn,hasReserved,carplate&reserved=true', function (error, response, body) {

                         if (error) throw err;
                         else {
                             response.statusCode.should.be.equal(400);
                             var results = JSON.parse(body);

                             results.should.have.property('error');
                             results.error.should.be.equal('query param \'q\' are not valid in get by Id');
                         }
                         done();
                     });
                 }
             });

         });

     });





     describe('POST /carparked/actions/carOut', function(){

         it('test 422 in not reserved carplate, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false)', function(done){

             var parkin = {

                 carplate:'ale romanino',
                 dateOut:new Date()
             };

             CarParked.create(parkin,function(err,resu){

                 var reservBody = JSON.stringify(parkin);

                 var url = APIURL+'/carparked/actions/carOut';

                 request.post({ url : url,
                     body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         //console.log(util.inspect(response.body));
                         response.statusCode.should.be.equal(422);
                         var results = JSON.parse(response.body);
                         results.should.have.property('incongruity');
                         results.should.not.have.property('parkInfo');
                         results.should.not.have.property('parkingStatus');
                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                         results.incongruity.type.should.be.equal(422);
                         done();
                     }
                 });
             });


         });
     });

     describe('POST /carparked/actions/carOut', function(){

         it('test 201 in not reserved carplate but, incongruence type 409: no occuppied lots available', function(done){


             var parkin = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             CarParked.create(parkin,function(err,resu){
                 Parking.stats.occupiedLots=0;

                 var reservBody = JSON.stringify(parkin);

                 var url = APIURL+'/carparked/actions/carOut';

                 request.post({ url : url,
                     body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(201);
                         var results = JSON.parse(response.body);
                         results.should.have.property('incongruity');
                         results.should.have.property('parkInfo');
                         results.should.have.property('parkingStatus');
                         results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                         results.incongruity.type.should.be.equal(409);
                         results.parkInfo.carplate.should.be.equal(parkin.carplate);
                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                         results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                         results.parkingStatus.occupiedLots.should.be.equal(0);
                         done();
                     }
                 });
             });


         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 200 in not reserved carplate', function(done){

             var prki = {

                 carplate:'ale romanino',
                 dateIn:new Date()
             };


             CarParked.create(prki,function(err,resu){

                 Parking.stats.occupiedLots=1;

                 var reservBody = JSON.stringify(prki);

                 var url = APIURL+'/carparked/actions/carOut';

                 request.post({ url : url,
                     body : reservBody,
                     headers: {'content-type': 'application/json'}
                 }, function(error, response){
                     if(error) throw error;
                     else{
                         response.statusCode.should.be.equal(201);
                         var results = JSON.parse(response.body);
                         results.should.have.property('parkInfo');
                         results.should.have.property('parkingStatus');
                         results.should.not.have.property('incongruity');
                         results.parkInfo.carplate.should.be.equal(prki.carplate);
                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                         results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                         Parking.stats.occupiedLots.should.be.equal(0);
                         results.parkingStatus.occupiedLots.should.be.equal(0);
                         done();
                     }
                 });
             });


         });
     });


     /////////

     ///// END PARAM




    /*
    describe('POST /reservations', function(){

        it('should not expire a new reservation', function(done){
            var reservation = {

                carplate:'ale romanino'

            };
            var reservBody = JSON.stringify(reservation);
            var url = APIURL+'/reservations';
            request.post({ url : url,
                body : reservBody,
                headers: {'content-type': 'application/json'}
            }, function(error, response){
                if(error) throw error;
                else{
                    response.statusCode.should.be.equal(201);
                    var results = JSON.parse(response.body);
                    //results.should.have.property('dateIn');
                    results.should.have.property('reservation');
                    results.should.have.property('stats');
                    results.reservation.carplate.should.be.equal(reservation.carplate);
                    results.reservation.should.have.property('carplate');
                    results.reservation.should.have.property('_id');
                    //console.log(results);
                    results.stats.freeLots.should.be.equal(1);
                    results.stats.occupiedLots.should.be.equal(1);
                    results.stats.reservedLots.should.be.equal(1);

                    Reservation.findById(results.reservation._id,function(err,reservationById){
                        //console.log(util.inspect(reservationById));
                        reservationById.carplate.should.be.equal('ale romanino');
                        var carDateIn= new Date();
                        reservationById.dateIn=carDateIn;
                        reservationById.save(function(err,savedDoc){
                            if(!err) {
                                savedDoc.should.have.property('dateIn');
                                savedDoc.dateIn.should.be.eql(carDateIn);
                                setTimeout(function () {
                                    Reservation.findById(results.reservation._id, function (err, reservationById) {
                                        (reservationById === null).should.be.false;
                                        reservationById.carplate.should.be.equal('ale romanino');
                                        reservationById.should.have.property('dateIn');
                                        reservationById.dateIn.should.be.eql(carDateIn);
                                    });
                                    done();
                                }, 1500);
                            }else console.log("ERROR SAVING CARIN");
                        });
                    });
                }
            });
        });
    });


    describe('POST /reservations', function(){

        it('should not possible to make a new reservation : carplate already in reservation list', function(done){
            var reservation = {

                carplate:'ale romanino'

            };

            Reservation.create(reservation,function(err,reservationdocument){

                if(err) throw  err;
                else{
                    var reservBody = JSON.stringify(reservation);
                    var url = APIURL+'/reservations';
                    request.post({ url : url,
                        body : reservBody,
                        headers: {'content-type': 'application/json'}
                    }, function(error, response){
                        if(error) throw error;
                        else{
                            response.statusCode.should.be.equal(409);
                            var results = JSON.parse(response.body);
                            var strbody='carplate ' + reservation.carplate + '  already in reservation list';
                            results.warning.should.be.equal(strbody);
                            done();
                        }
                    });
                }
            });
        });
    });








    describe('POST /reservations', function(){

        it('should be not possible make reservation : not available lots', function(done){
            var reservation = {

                carplate:'ale romanino'

            };

            Parking.reserveLot(function(err,resul){ // lock 1° lot
                if(err) throw err
                else{
                    Parking.reserveLot(function(err,resul){ //lock 2° lot
                        if(err) throw err
                        else{
                            var reservBody = JSON.stringify(reservation);
                            var url = APIURL+'/reservations';
                            request.post({ url : url,
                                body : reservBody,
                                headers: {'content-type': 'application/json'}
                            }, function(error, response){
                                if(error) throw error;
                                else{
                                    response.statusCode.should.be.equal(423);
                                    var results = JSON.parse(response.body);
                                    var strbody='No Lots available at the moment';
                                    results.warning.should.be.equal(strbody);
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });
    });




    describe('POST /reservations', function(){

        it('should create a new reservation', function(done){
            var reservation = {

                carplate:'ale romanino'

            };
            var reservBody = JSON.stringify(reservation);
            var url = APIURL+'/reservations';
            request.post({ url : url,
                body : reservBody,
                headers: {'content-type': 'application/json'}
            }, function(error, response){
                if(error) throw error;
                else{
                    response.statusCode.should.be.equal(201);
                    var results = JSON.parse(response.body);
                    //results.should.have.property('dateIn');
                    results.should.have.property('reservation');
                    results.should.have.property('stats');
                    results.reservation.carplate.should.be.equal(reservation.carplate);
                    results.reservation.should.have.property('carplate');
                    results.reservation.should.have.property('_id');
                    //console.log(results);
                    results.stats.freeLots.should.be.equal(1);
                    results.stats.occupiedLots.should.be.equal(1);
                    results.stats.reservedLots.should.be.equal(1);
                }
                done();
            });
        });
    });








    describe('GET /reservations', function(){

        it('must return reservations and _metadata no skip no limit, all fields', function(done){

            request.get(APIURL+'/reservations', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(200);
                    var results = JSON.parse(body);
                    results.should.have.property('_metadata');
                    results.should.have.property('reservations');
                    results._metadata.skip.should.be.equal(0);
                    results._metadata.limit.should.be.equal(50);
                    results._metadata.totalCount.should.be.equal(100);
                    should.exist(results.reservations[0]);
                    var reservation = results.reservations[0];
                    reservation.should.have.property('carplate');
                    reservation.should.have.property('notes');
                    reservation.should.have.property('dateIn');
                    reservation.should.have.property('dateOut');
                }
                done();
            });

        });

    });

    describe('GET /reservations', function(){

        it('must return ONE reservation and _metadata, all fields', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1', function(error, response, body){

                if(error) throw err;
                else{

                    response.statusCode.should.be.equal(200);
                    var results = JSON.parse(body);
                    results.should.have.property('_metadata');
                    results.should.have.property('reservations');
                    results._metadata.skip.should.be.equal(0);
                    results._metadata.limit.should.be.equal(1);
                    results._metadata.totalCount.should.be.equal(100);
                    should.exist(results.reservations[0]);
                    var reservation = results.reservations[0];
                    reservation.should.have.property('carplate');
                    reservation.should.have.property('notes');
                    reservation.should.have.property('dateIn');
                    reservation.should.have.property('dateOut');

                }

                done();

            });

        });

    });


    describe('GET /reservations', function(){

        it('must return ONE reservation and _metadata, carplate fields', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1&fields=carplate', function(error, response, body){

                if(error) throw err;
                else{

                    response.statusCode.should.be.equal(200);
                    var results = JSON.parse(body);
                    results.should.have.property('_metadata');
                    results.should.have.property('reservations');
                    results._metadata.skip.should.be.equal(0);
                    results._metadata.limit.should.be.equal(1);
                    results._metadata.totalCount.should.be.equal(100);
                    should.exist(results.reservations[0]);
                    var reservation = results.reservations[0];
                    reservation.should.have.property('carplate');
                    reservation.should.not.have.property('notes');
                    reservation.should.not.have.property('dateIn');
                    reservation.should.not.have.property('dateOut');
                }
                done();
            });
        });
    });

    describe('GET /reservations', function(){

        it('must return no reservation, test 204', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1&fields=carplate&carplate=nonMiTrovi', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(204);
                }
                done();
            });
        });
    });


    describe('GET /reservations', function(){

        it('must return params error, test 400', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1&fields=carplate&carplat=nonMiTrovi', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(400);
                    var results = JSON.parse(body);
                    results.should.have.property('error');
                    results.error.should.be.equal('invalid request params carplat');
                }
                done();
            });
        });
    });


    describe('GET /reservations', function(){

        it('must return fields error, test 400', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1&fields=carplat&carplat=nonMiTrovi', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(400);
                    var results = JSON.parse(body);
                    results.should.have.property('error');
                    results.error.should.be.equal('invalid request fields carplat');
                }
                done();
            });
        });
    });





    describe('GET /reservations/:id', function(){

        it('must return a reservation by id, all fields', function(done){

            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/'+reserv._id;
                    request.get(url,function(error, response, body){
                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(200);
                            var results = JSON.parse(response.body);
                            results.should.have.property('carplate');
                            results.should.have.property('notes');
                            results.should.have.property('dateIn');
                            results.should.have.property('dateOut');

                        }

                        done();
                    });

                }


            });


        });
    });


    describe('GET /reservations/:id', function(){

        it('must return a reservation by id, carplate fields', function(done){

            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/'+reserv._id+'?fields=carplate';
                    request.get(url,function(error, response, body){
                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(200);
                            var results = JSON.parse(response.body);
                            results.should.have.property('carplate');
                            results.should.not.have.property('notes');
                            results.should.not.have.property('dateIn');
                            results.should.not.have.property('dateOut');
                        }

                        done();
                    });
                }
            });
        });
    });

    describe('GET /reservations/:id', function(){

        it('must return a  400 error , carplat fields error', function(done){

            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/'+reserv._id+'?fields=carplat';
                    request.get(url,function(error, response, body){
                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(400);
                            var results = JSON.parse(body);
                            results.should.have.property('error');
                            results.error.should.be.equal('invalid request fields carplat');
                        }
                        done();
                    });
                }
            });
        });
    });

    describe('GET /reservations/:id', function(){

        it('must return a 404, reservation not found', function(done){



            var url = APIURL+'/reservations/541ae25819baa50000d8fe00';
            request.get(url,function(error, response, body){
                if(error) throw err;
                else{

                    response.statusCode.should.be.equal(404);
                }

                done();
            });

        });

    });



    describe('PUT /reservations/:id', function(){

        it('must update a reservation', function(done){

            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/'+reserv._id;

                    var aReserv = JSON.stringify({notes:'a simple. modified note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv}, function(error, response, data){

                        if(error) throw err;
                        else{
                            var results = JSON.parse(data);
                            response.statusCode.should.be.equal(200);
                            results.notes.should.be.equal('a simple. modified note');
                        }

                        done();
                    });

                }
            });
        });
    });

    //----

    describe('PUT /reservations/:id', function(){

        it('must NOT update a reservation; a 500, something blew up, ERROR:', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/'+reserv._id;

                    var aReserv = JSON.stringify({notecontents:'a simple. modified note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv},function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(500);

                        }

                        done();
                    });

                }
            });
        });
    });


    //----
    describe('PUT /reservations/:id', function(){

        it('must NOT update a reservation; a 404, not found, should be returned', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/541ae25819baa50000d8fe00';

                    var aReserv = JSON.stringify({notes:'NEW note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv},function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(404);

                        }

                        done();
                    });

                }
            });
        });
    });

    //----
    describe('PUT /reservations/:id', function(){

        it('must NOT update a reservation; a 400, body missin, should be returned', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/'+reserv.carplate;

                    var aReserv = JSON.stringify({notes:'NEW note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}},function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(400);

                        }

                        done();
                    });

                }
            });
        });
    });




    ///Carplate
    describe('PUT /reservations/carplate/:carplate', function(){

        it('must update a reservation', function(done){

            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/carplate/'+reserv.carplate;

                    var aReserv = JSON.stringify({notes:'a simple. modified note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv}, function(error, response, data){

                        if(error) throw err;
                        else{
                            var results = JSON.parse(data);
                            response.statusCode.should.be.equal(200);
                            results.notes.should.be.equal('a simple. modified note');
                        }

                        done();
                    });

                }
            });
        });
    });

    //----

    describe('PUT /reservations/carplate/:carplate', function(){

        it('must NOT update a reservation; a 500, something blew up, ERROR:', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/carplate/'+reserv.carplate;

                    var aReserv = JSON.stringify({notecontents:'a simple. modified note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv},function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(500);

                        }

                        done();
                    });

                }
            });
        });
    });




    describe('PUT /reservations/carplate/:carplate', function(){

    it('must NOT update a reservation; a 404, not found, should be returned', function(done){


        Reservation.findOne({}, function(err, reserv){

            if(err) throw err;
            else{

                var url = APIURL+'/reservations/carplate/541ae25819baa50000d8fe00';

                var aReserv = JSON.stringify({notes:'NEW note'});
                request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv},function(error, response, body){

                    if(error) throw err;
                    else{

                        response.statusCode.should.be.equal(404);

                    }

                    done();
                });

            }
        });
    });
    });

    //----
    describe('PUT /reservations/carplate/:carplate', function(){

        it('must NOT update a reservation; a 400, body missin, should be returned', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/carplate/'+reserv.carplate;

                    var aReserv = JSON.stringify({notes:'NEW note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}},function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(400);

                        }

                        done();
                    });

                }
            });
        });
    });



    describe('DELETE /reservations/:id', function(){

        it('must delete a reservation by id', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{
                    var url = APIURL+'/reservations/'+reserv._id;
                    request.del(url,{},function(error, response, body){

                        if(error) throw err;
                        else{
                            response.statusCode.should.be.equal(200);

                            Reservation.findOne({_id:reserv._id}, function(err, r){

                                should(r).not.be.ok;
                                done();
                            });
                        }
                    });//end req
                }
            });

        });
    });


    //----
    describe('DELETE /reservations/:id', function(){

        it('must return a 404 not found', function(done){


            Reservation.findOne({}, function(err, r){

                if(err) throw err;
                else{
                    var url = APIURL+'/reservations/541ae25819baa50000d8fe00';
                    request.del(url,{},function(error, response, body){

                        if(error) throw err;
                        else{
                            response.statusCode.should.be.equal(404);
                            done();

                        }
                    });//end req
                }
            });

        });
    });



    describe('DELETE /reservations/carplate/:carplate', function(){

        it('must delete a reservation by carplate', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{
                    var url = APIURL+'/reservations/carplate/'+reserv.carplate;
                    request.del(url,{},function(error, response, body){

                        if(error) throw err;
                        else{
                            response.statusCode.should.be.equal(200);

                            Reservation.findOne({_id:reserv._id}, function(err, r){

                                should(r).not.be.ok;
                                done();
                            });
                        }
                    });//end req
                }
            });

        });
    });


    //----
    describe('DELETE /reservations/carplate/:carplate', function(){

        it('must return a 404 not found', function(done){


            Reservation.findOne({}, function(err, r){

                if(err) throw err;
                else{
                    var url = APIURL+'/reservations/carplate/541ae25819baa50000d8fe00';
                    request.del(url,{},function(error, response, body){

                        if(error) throw err;
                        else{
                            response.statusCode.should.be.equal(404);
                            done();

                        }
                    });//end req
                }
            });

        });
    });
    */


});
