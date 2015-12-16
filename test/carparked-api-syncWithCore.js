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
var coreComunication = require('../models/coreComunication').CoreComunication;

var APIURL = 'http://localhost:3001';

var server;
var CarDriverUserTestToken,CarDriverUserTestUserId,reservationId,carId;



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

        }else console.log("ERROR IN CARDRIVER TOKEN REQUEST (BEFORE ALL MODULE) " + error);




    });
}

 describe('ARP CARPARKED API SYNC', function(){

    before(function(done){


       // if(Parking.myId)
        /*
        Parking.save(function(err,data){
            if(!err){
                console.log("##################### < TEST PARKING > #####################");
                console.log(data);
                console.log("##################### > TEST PARKING < #####################");
            }
        });*/





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

       // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" + AdminUserId);
        /*
        var url = conf.urlHandyParkingcore ;
        request.del({ url:url +"/users/" + AdminUserId,
                headers: {'content-type': 'application/json','Authorization' : "Bearer "+ AdminToken}},
            function(err,res,body){
                Console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" + body);

        });*/

        /*
        Parking.remove(function(err,clb){

        });*/

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

        Parking.stats.freeLots=2;
        Parking.stats.occupiedLots=0;
        Parking.stats.reservedLots=0;
        Parking.stats.notAvailableLots=0;

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


        CarParked.remove(function(err, product){
            if(err) throw err;
            done();
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







     describe(' Verify Parking Validity', function(){

         it('test Parking comunication with HandyParking Core ', function(done){




             coreComunication.getToken(function(err,token){
                 (err===null).should.be.true;
                 token.myId.should.be.equal(Parking.admins[0]);

                 coreComunication.pubblishToCore(function(errc,publishied){
                    // var res=JSON.parse();
                     (errc===null).should.be.true;
                     publishied._id.should.be.equal(Parking.myId);
                     done();

                 });
             });



         });
     });


     describe(' Verify Car Driver User Test', function(){

         it('test Ca Driver User Test comunication with HandyParking Core ', function(done){

             request.get({ url : Parking.urlHandyParkingcore + "/users/" + CarDriverUserTestUserId +"/cars",
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var res = JSON.parse(body);
                     carId=res.cars[0]._id;
                     (carId===null).should.be.false;
                     //res._id.should.be.equal(CarDriverUserTestUserId);
                 }
                 done();
             });

         });
     });






     describe('POST /carparked/actions/carOut', function(){

         it('test 201, incongruence type 409: no occuppied lots available ', function(done){



             var reservation = {
                 carplate:'ale romanino',
                 dateIn:new Date()
             };

             var reservationTest = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201, incongruence type 409: no occuppied lots available"
                 //dateOut:new Date()
             };

             //console.log("????????????????????????TOKEN " + CarDriverUserTestToken );
             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservationTest),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 //console.log("BODYYYYYYYYY: " + body);
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" + body);
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


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});


                             }
                         });
                     });
                 } else console.log("ERROR IN RESERVATION REQUEST " + error);
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 201, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist ', function(done){
             console.log("Start");
             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist"
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000aa',
                 dateIn:new Date(),
                 dateOut:new Date()
             };


            // Parking.validity=5000;
             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                        var reservResults = JSON.parse(body);
                        reservationId=reservResults._id;
                        Reservation.findOneAndUpdate({carplate:prkedCar.carplate},{dateIn:prkedCar.dateIn},function(err,data){
                            if(!err) {
                                CarParked.create(prkedCar, function (err, resu) {

                                    var reservBody = JSON.stringify(prkedCar);

                                    var url = APIURL + '/carparked/actions/carOut';

                                    request.post({ url: url,
                                        body: reservBody,
                                        headers: {'content-type': 'application/json'}
                                    }, function (error, response) {
                                        if (error) throw error;
                                        else {
                                            //console.log("%%%%%%%%%%%%%%%%% MSG:" + response.body);
                                            response.statusCode.should.be.equal(201);
                                            var results = JSON.parse(response.body);
                                            results.should.have.property('incongruity');
                                            results.should.not.have.property('parkInfo');
                                            results.should.not.have.property('parkingStatus');
                                            results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                            results.incongruity.type.should.be.equal(422);


                                            request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                                headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                            }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);console.log("END");done();});



                                        }
                                    });
                                });
                            }else (err===null).should.be.true;
                        });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 201, incongruity type: 422 , msg:No carplate in carparked list when carplate not esist ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201, incongruity type: 422 , msg:No carplate in carparked list when carplate not esist "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000bb'
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                         if(!err) {

                             CarParked.create(prkedCar, function (err, resu) {

                                 var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut';

                                 request.post({ url: url,
                                     body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         //console.log("££££££££££££££££ body" + response.body);
                                         results.should.have.property('incongruity');
                                         results.should.not.have.property('parkInfo');
                                         results.should.not.have.property('parkingStatus');
                                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                         results.incongruity.type.should.be.equal(422);

                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list carplate not exist and dataOut setted  ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 200, incongruity type: 422 , msg:No carplate in carparked list carplate not exist and dataOut setted "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000bb',
                 dateOut:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                         if(!err) {

                             CarParked.create(prkedCar, function (err, resu) {

                                 var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut';

                                 request.post({ url: url,
                                     body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         results.should.have.property('incongruity');
                                         results.should.not.have.property('parkInfo');
                                         results.should.not.have.property('parkingStatus');
                                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                         results.incongruity.type.should.be.equal(422);


                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });




     describe('POST /carparked/actions/carOut', function(){

         it('test 200, car can leave parking', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 200, car can leave parking"
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                         if(!err) {

                             CarParked.create(prkedCar, function (err, resu) {

                                 Parking.stats.occupiedLots=1;

                                 var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut';

                                 request.post({ url: url,
                                     body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         results.should.have.property('parkInfo');
                                         results.should.have.property('parkingStatus');
                                         results.should.not.have.property('incongruity');
                                         results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                         results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                         Parking.stats.occupiedLots.should.be.equal(0);
                                         results.parkingStatus.occupiedLots.should.be.equal(0);


                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });





     describe('POST /carparked/actions/carOut', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO CARPLATE) ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO CARPLATE) "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000bb'
                // dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                             CarParked.create(prkedCar, function (err, resu) {

                                 Parking.stats.occupiedLots=1;

                                 var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut';

                                 request.post({ url: url,
                                     body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(422);
                                         var results = JSON.parse(response.body);
                                         results.should.have.property('incongruity');
                                         results.should.not.have.property('parkInfo');
                                         results.should.not.have.property('parkingStatus');
                                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                         results.incongruity.type.should.be.equal(422);


                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false)', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false) "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000aa',
                  dateOut:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=1;

                         var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut';

                         request.post({ url: url,
                             body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(422);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.not.have.property('parkInfo');
                                 results.should.not.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                 results.incongruity.type.should.be.equal(422);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 201 when car In is wrongly registered only in carparked list but not in reservation In list, incongruence type 409: no occuppied lots available', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201 when car In is wrongly registered only in carparked list but not in reservation In list, incongruence type 409: no occuppied lots available"
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=0;

                         var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut';

                         request.post({ url: url,
                             body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(201);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.have.property('parkInfo');
                                 results.should.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                                 results.incongruity.type.should.be.equal(409);
                                 results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                 results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                 results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                 results.parkingStatus.occupiedLots.should.be.equal(0);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });

     describe('POST /carparked/actions/carOut', function(){

         it('test 201 when car In is wrongly registered only in carparked list but not in reservation In list', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201 when car In is wrongly registered only in carparked list but not in reservation In list"
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=1;

                         var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut';

                         request.post({ url: url,
                             body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(201);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('parkInfo');
                                 results.should.have.property('parkingStatus');
                                 results.should.not.have.property('incongruity');
                                 results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                 results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                 results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                 Parking.stats.occupiedLots.should.be.equal(0);
                                 results.parkingStatus.occupiedLots.should.be.equal(0);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruence type 409: no occuppied lots available ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 200, incongruence type 409: no occuppied lots available "
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=0;

                         var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut';

                         request.post({ url: url,
                             body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(201);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.have.property('parkInfo');
                                 results.should.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                                 results.incongruity.type.should.be.equal(409);
                                 results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                 results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                 results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                 results.parkingStatus.occupiedLots.should.be.equal(0);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"ttest 200, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist"
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date(),
                 dateOut:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;

                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                     if(!err) {

                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=1;

                         var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut';

                         request.post({ url: url,
                             body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(201);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.not.have.property('parkInfo');
                                 results.should.not.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                 results.incongruity.type.should.be.equal(422);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });
                     }else (err===null).should.be.true;
                 });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });

///

     describe('POST /carparked/actions/carOut', function(){

         it('test 201, incongruence type 409: no occuppied lots available ', function(done){

             var reservation = {
                 carplate:'ale romanino',
                 dateIn:new Date()
             };

             var reservationTest = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201, incongruence type 409: no occuppied lots available"
                 //dateOut:new Date()
             };

             //console.log("????????????????????????TOKEN " + CarDriverUserTestToken );
             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservationTest),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 //console.log("BODYYYYYYYYY: " + body);
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" + body);
                     CarParked.create(reservation,function(err,resu){
                         Parking.stats.occupiedLots=0;

                         //var reservBody = JSON.stringify(reservation);

                         var url = APIURL+'/carparked/actions/carOut/' + reservation.carplate ;

                         request.post({ url : url,
                             //body : reservBody,
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

                                 //console.log("REMOVE RESERVATION: " + reservationId + " CarOut: " + body);
                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {
                                     //console.log("REMOVED RESERVATION: " + reservationId + " body: " + body);
                                     done();
                                 });

                             }
                         });
                     });
                 } else console.log("ERROR IN RESERVATION REQUEST " + error);
             });
         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 201, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist"
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000aa',
                 dateIn:new Date(),
                 dateOut:new Date()
             };


             // Parking.validity=5000;
             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     Reservation.findOneAndUpdate({carplate:prkedCar.carplate},{dateIn:prkedCar.dateIn},function(err,data){
                         if(!err) {
                             CarParked.create(prkedCar, function (err, resu) {

                                 var reservBody = JSON.stringify(prkedCar);

                                 var url = APIURL + '/carparked/actions/carOut/'+ prkedCar.carplate;

                                 request.post({ url: url,
                                    // body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         //console.log("%%%%%%%%%%%%%%%%% MSG:" + response.body);
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         results.should.have.property('incongruity');
                                         results.should.not.have.property('parkInfo');
                                         results.should.not.have.property('parkingStatus');
                                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                         results.incongruity.type.should.be.equal(422);

                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {
                                             //Parking.validity=1000;
                                             //console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);
                                             done();});

                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 201, incongruity type: 422 , msg:No carplate in carparked list when carplate not esist ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201, incongruity type: 422 , msg:No carplate in carparked list when carplate not esist "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000bb'
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                         if(!err) {

                             CarParked.create(prkedCar, function (err, resu) {

                                 //var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut/aa000aa';

                                 request.post({ url: url,
                                     //body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         //console.log("££££££££££££££££ body" + response.body);
                                         results.should.have.property('incongruity');
                                         results.should.not.have.property('parkInfo');
                                         results.should.not.have.property('parkingStatus');
                                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                         results.incongruity.type.should.be.equal(422);

                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list carplate not exist and dataOut setted  ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 200, incongruity type: 422 , msg:No carplate in carparked list carplate not exist and dataOut setted "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000bb',
                 dateOut:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                         if(!err) {

                             CarParked.create(prkedCar, function (err, resu) {

                                 //var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut/aa000aa';

                                 request.post({ url: url,
                                     //body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         results.should.have.property('incongruity');
                                         results.should.not.have.property('parkInfo');
                                         results.should.not.have.property('parkingStatus');
                                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                         results.incongruity.type.should.be.equal(422);


                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });




     describe('POST /carparked/actions/carOut', function(){

         it('test 200, car can leave parking', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 200, car can leave parking"
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;
                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                         if(!err) {

                             CarParked.create(prkedCar, function (err, resu) {

                                 Parking.stats.occupiedLots=1;

                                // var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut/' + prkedCar.carplate;

                                 request.post({ url: url,
                                    // body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         results.should.have.property('parkInfo');
                                         results.should.have.property('parkingStatus');
                                         results.should.not.have.property('incongruity');
                                         results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                         results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                         results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                         Parking.stats.occupiedLots.should.be.equal(0);
                                         results.parkingStatus.occupiedLots.should.be.equal(0);


                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });


                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });





     describe('POST /carparked/actions/carOut', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO CARPLATE) ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO CARPLATE) "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000bb'
                 // dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=1;

                         //var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut/aa000aa';

                         request.post({ url: url,
                             //body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(422);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.not.have.property('parkInfo');
                                 results.should.not.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                 results.incongruity.type.should.be.equal(422);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false)', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 422, warning: Inconsistent status, the car wasn\'t regeistered when entered (NO DATEIN==true And DATEOUT== false) "
                 //dateOut:new Date()
             };

             var prkedCar = {

                 carplate:'aa000aa',
                 dateOut:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=1;

                        // var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut/'+ prkedCar.carplate;

                         request.post({ url: url,
                             //body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(422);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.not.have.property('parkInfo');
                                 results.should.not.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                 results.incongruity.type.should.be.equal(422);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 201 when car In is wrongly registered only in carparked list but not in reservation In list, incongruence type 409: no occuppied lots available', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201 when car In is wrongly registered only in carparked list but not in reservation In list, incongruence type 409: no occuppied lots available"
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=0;

                         //var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut/'+ prkedCar.carplate;

                         request.post({ url: url,
                            // body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(201);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.have.property('parkInfo');
                                 results.should.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                                 results.incongruity.type.should.be.equal(409);
                                 results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                 results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                 results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                 results.parkingStatus.occupiedLots.should.be.equal(0);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });

     describe('POST /carparked/actions/carOut', function(){

         it('test 201 when car In is wrongly registered only in carparked list but not in reservation In list', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 201 when car In is wrongly registered only in carparked list but not in reservation In list"
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=1;

                        // var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut/'+ prkedCar.carplate;

                         request.post({ url: url,
                            // body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(201);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('parkInfo');
                                 results.should.have.property('parkingStatus');
                                 results.should.not.have.property('incongruity');
                                 results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                 results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                 results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                 Parking.stats.occupiedLots.should.be.equal(0);
                                 results.parkingStatus.occupiedLots.should.be.equal(0);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });



     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruence type 409: no occuppied lots available ', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"test 200, incongruence type 409: no occuppied lots available "
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;


                     CarParked.create(prkedCar, function (err, resu) {

                         Parking.stats.occupiedLots=0;

                       //  var reservBody = JSON.stringify({carplate:'aa000aa'});

                         var url = APIURL + '/carparked/actions/carOut/'+ prkedCar.carplate;

                         request.post({ url: url,
                           //  body: reservBody,
                             headers: {'content-type': 'application/json'}
                         }, function (error, response) {
                             if (error) throw error;
                             else {
                                 response.statusCode.should.be.equal(201);
                                 var results = JSON.parse(response.body);
                                 results.should.have.property('incongruity');
                                 results.should.have.property('parkInfo');
                                 results.should.have.property('parkingStatus');
                                 results.incongruity.msg.should.be.equal('lots to free should be less than occuppied lots');
                                 results.incongruity.type.should.be.equal(409);
                                 results.parkInfo.carplate.should.be.equal(prkedCar.carplate);
                                 results.parkInfo.should.have.property('dateIn').not.equal(undefined);
                                 results.parkInfo.should.have.property('dateOut').not.equal(undefined);
                                 results.parkingStatus.occupiedLots.should.be.equal(0);


                                 request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                     headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                 }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                             }
                         });
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });


     describe('POST /carparked/actions/carOut', function(){

         it('test 200, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist', function(done){

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 dateIn:new Date(),
                 notes:"ttest 200, incongruity type: 422 , msg:No carplate in carparked list when dateOut Exist"
                 //dateOut:new Date()
             };

             var prkedCar = {
                 carplate:'aa000aa',
                 dateIn:new Date(),
                 dateOut:new Date()
             };


             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {
                 if (!error) {
                     var reservResults = JSON.parse(body);
                     reservationId=reservResults._id;

                     Reservation.findOneAndUpdate({carplate:"aa000aa"},{dateIn:reservation.dateIn},function(err,data){
                         if(!err) {

                             CarParked.create(prkedCar, function (err, resu) {

                                 Parking.stats.occupiedLots=1;

                                // var reservBody = JSON.stringify({carplate:'aa000aa'});

                                 var url = APIURL + '/carparked/actions/carOut/'+ prkedCar.carplate;

                                 request.post({ url: url,
                                    // body: reservBody,
                                     headers: {'content-type': 'application/json'}
                                 }, function (error, response) {
                                     if (error) throw error;
                                     else {
                                         response.statusCode.should.be.equal(201);
                                         var results = JSON.parse(response.body);
                                         results.should.have.property('incongruity');
                                         results.should.not.have.property('parkInfo');
                                         results.should.not.have.property('parkingStatus');
                                         results.incongruity.msg.should.be.equal('No carplate in carparked list');
                                         results.incongruity.type.should.be.equal(422);


                                         request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservationId,
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservationId + " body: " + body);done();});
                                     }
                                 });
                             });
                         }else (err===null).should.be.true;
                     });



                 }else{ // cosi mi segnla errore
                     (error===null).should.be.true;
                 }
             });

         });
     });



     describe('POST /carparked/actions/carIn', function(){

         it('should be possible parking a car, car is not in reservation list: Test upload parking stats in core after a car parking (coreComunication.updateLostsStats()) ', function(done){

             Parking.stats.occupiedLots=0;
             Parking.stats.freeLots=2;
             Parking.stats.reservedLots=0;
             Parking.stats.notAvailableLots=0;

             coreComunication.updateLostsStats();

             var stats;
             request.get({ url : Parking.urlHandyParkingcore + "/parkings/"+ Parking.myId,
                 //body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {

                 if(!error){

                   stats=JSON.parse(body).stats;

                     //console.log("STATSSSSSSSSSSSS:" + util.inspect(stats));

                     var reservation = {

                         carplate:'aa000aa'

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
                            // console.log("RESPOMSE after parking " + util.inspect(results));
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);

                             request.get({ url : Parking.urlHandyParkingcore + "/parkings/"+ Parking.myId,
                                // body : JSON.stringify(reservation),
                                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                             }, function(error, response, body) {

                                 if(!error) {
                                     var resultsStats = JSON.parse(body);
                                     //console.log("STATSSSSSSSSSSSS:" + util.inspect(resultsStats.stats));
                                     resultsStats.stats.freeLots.should.be.lessThan(stats.freeLots);
                                     resultsStats.stats.occupiedLots.should.be.greaterThan(stats.occupiedLots);
                                     //results.error.should.be.equal('missing field carplate body request');
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

         it('should be possible parking a car, car is not in reservation list: Test upload parking stats in core after a car parking and after a coreComunication.updateLostsStats() fails (coreComunication.resendStats) ', function(done){



             //this.timeout(4000);
             var oldRetryCoreComunicationTimeOut=conf.retryCoreComunicationTimeOut
             conf.retryCoreComunicationTimeOut=1000;
             Parking.stats.occupiedLots=0;
             Parking.stats.freeLots=2;
             Parking.stats.reservedLots=0;
             Parking.stats.notAvailableLots=0;

             coreComunication.updateLostsStats();

             var stats;
             request.get({ url : Parking.urlHandyParkingcore + "/parkings/"+ Parking.myId,
                 //body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {

                 if(!error){

                     stats=JSON.parse(body).stats;

                    // console.log("STATSSSSSSSSSSSS:" + util.inspect(stats));

                     var reservation = {

                         carplate:'aa000aa'

                     };
                     var reservBody = JSON.stringify(reservation);

                     var url = APIURL+'/carparked/actions/carIn';

                     var oldID=Parking.myId;
                     Parking.myId="0";

                     request.post({ url : url,
                         body : reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function(error, response){
                         if(error) throw error;
                         else{
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                            // console.log("RESPOMSE after parking " + util.inspect(results));
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.parkInfo.carplate.should.be.equal(reservation.carplate);
                             Parking.myId=oldID;

                             request.get({ url : Parking.urlHandyParkingcore + "/parkings/"+ Parking.myId,
                                 // body : JSON.stringify(reservation),
                                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                             }, function(error, response, body) {

                                 if(!error) {
                                     var resultsStats = JSON.parse(body);
                                    //console.log("STATTTTTTTTTS:" + util.inspect(resultsStats.stats));
                                     resultsStats.stats.freeLots.should.be.equal(stats.freeLots);
                                     resultsStats.stats.occupiedLots.should.be.equal(stats.occupiedLots);
                                     //results.error.should.be.equal('missing field carplate body request');
                                     setTimeout(function(){
                                         request.get({ url : Parking.urlHandyParkingcore + "/parkings/"+ Parking.myId,
                                             // body : JSON.stringify(reservation),
                                             headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                         }, function(error, response, body) {

                                             if(!error) {
                                                 var resultsStats = JSON.parse(body);
                                                 //console.log("STATTTTTTTTTS:" + util.inspect(resultsStats.stats));
                                                 resultsStats.stats.freeLots.should.be.lessThan(stats.freeLots);
                                                 resultsStats.stats.occupiedLots.should.be.greaterThan(stats.occupiedLots);
                                                 //results.error.should.be.equal('missing field carplate body request');
                                                 conf.retryCoreComunicationTimeOut=oldRetryCoreComunicationTimeOut;
                                                 done();
                                             }
                                         });
                                     },conf.retryCoreComunicationTimeOut);
                                 }
                             });





                         }
                     });

                 }

             });




         });
     });



     describe('POST /carparked/actions/carIn', function(){

         it('should be possible parking a car, car is in reservation list: Test upload reservation stats in core after a car parking (coreComunication.carParking())', function(done){
            this.timeout(4000);
             Parking.stats.occupiedLots=0;
             Parking.stats.freeLots=2;
             Parking.stats.reservedLots=0;
             Parking.stats.notAvailableLots=0;

             coreComunication.updateLostsStats();

                     var prk = {

                         carplate:'aa000aa'

                     };



                     var reservation = {
                         parking: Parking.myId,
                         car:carId,
                         //dateIn:new Date(),
                         notes:"should be possible parking a car, car is in reservation list: Test upload reservation stats in core after a car parking (coreComunication.carParking())"
                         //dateOut:new Date()
                     };


                     request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                         body : JSON.stringify(reservation),
                         headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                     }, function(error, response, body) {

                         if(!error) {

                             var reservToCore=JSON.parse(body);
                             //var reservResults = JSON.parse(body);
                             reservationId=reservToCore._id;

                             should.not.exist(reservToCore.dateIn);

                             var reservBody = JSON.stringify(prk);

                             var url = APIURL + '/carparked/actions/carIn';
                             var parkinStats=Parking.getStats();


                             request.post({ url: url,
                                 body: reservBody,
                                 headers: {'content-type': 'application/json'}
                             }, function (error, response) {
                                 if (error) throw error;
                                 else {
                                     response.statusCode.should.be.equal(201);
                                     var results = JSON.parse(response.body);
                                     results.should.have.property('parkInfo');
                                     results.should.have.property('parkingStatus');
                                     results.parkingStatus.freeLots.should.be.equal(parkinStats.freeLots);
                                     results.parkingStatus.occupiedLots.should.be.equal(parkinStats.occupiedLots);
                                     results.parkingStatus.reservedLots.should.be.equal(parkinStats.reservedLots);
                                     results.parkInfo.carplate.should.be.equal(prk.carplate);
                                     results.parkInfo.should.have.property('dateIn').not.equal(undefined);


                                     request.get({ url: Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id,
                                         // body : JSON.stringify(reservation),
                                         headers: {'content-type': 'application/json', 'Authorization': "Bearer " + CarDriverUserTestToken}
                                     }, function (error, response, body) {

                                         if (!error) {
                                             var resultsStats = JSON.parse(body);
                                             should.exist(resultsStats.dateIn);
                                             request.del({ url : Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id,
                                                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                             }, function(error, response, body) {console.log("REMOVE RESERVATION: " + reservToCore._id + " body: " + body);done();});
                                         }
                                     });
                                 }
                             });
                         }else (error===null).should.be.true;
                     });
         });
     });



     describe('POST /carparked/actions/carIn', function(){

         it('should be possible parking a car, car is in reservation list: Test upload reservation stats in core after a car parking fails (coreComunication.resendCarParking())', function(done){
             this.timeout(4000);
             Parking.stats.occupiedLots=0;
             Parking.stats.freeLots=2;
             Parking.stats.reservedLots=0;
             Parking.stats.notAvailableLots=0;

             var oldRetryCoreComunicationTimeOut=conf.retryCoreComunicationTimeOut;
             conf.retryCoreComunicationTimeOut=1000;

             coreComunication.updateLostsStats();

             var prk = {

                 carplate:'aa000aa'

             };

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 //dateIn:new Date(),
                 //notes:"should be possible parking a car, car is in reservation list: Test upload reservation stats in core after a car parking fails (coreComunication.resendCarParking())"
                 notes:"should be possible parking a car, car is in reservation list: Test upload reservation stats in core after a car parking fails (coreComunication.resendCarParking())"
                 //dateOut:new Date()
             };


             request.post({ url: Parking.urlHandyParkingcore + "/reservations",
                 body: JSON.stringify(reservation),
                 headers: {'content-type': 'application/json', 'Authorization': "Bearer " + CarDriverUserTestToken}
             }, function (error, response, body) {


                 if(!error) {

                     var reservToCore=JSON.parse(body);

                     //console.log("%%%%%%%%%%%%%%%%%%%%%%%%% ReserV:" + body );

                     should.not.exist(reservToCore.dateIn);

                     var reservBody = JSON.stringify(prk);

                     var url = APIURL + '/carparked/actions/carIn';
                     var parkinStats=Parking.getStats();


                     // change token to fails corecominucation.carParking and test corecomunication.resendparkings
                     var oldToken=Parking.myToken;
                     Parking.myToken=0;


                     request.post({ url: url,
                         body: reservBody,
                         headers: {'content-type': 'application/json'}
                     }, function (error, response) {
                         if (error) throw error;
                         else {
                             //console.log("%%%%%%%%%%%%%%%%%%%%%%%%% CARIN: " + response.body);
                             response.statusCode.should.be.equal(201);
                             var results = JSON.parse(response.body);
                             results.should.have.property('parkInfo');
                             results.should.have.property('parkingStatus');
                             results.parkingStatus.freeLots.should.be.equal(parkinStats.freeLots);
                             results.parkingStatus.occupiedLots.should.be.equal(parkinStats.occupiedLots);
                             results.parkingStatus.reservedLots.should.be.equal(parkinStats.reservedLots);
                             results.parkInfo.carplate.should.be.equal(prk.carplate);
                             results.parkInfo.should.have.property('dateIn').not.equal(undefined);

                             Parking.myToken=oldToken;

                             request.get({ url: Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id,
                                 // body : JSON.stringify(reservation),
                                 headers: {'content-type': 'application/json', 'Authorization': "Bearer " + CarDriverUserTestToken}
                             }, function (error, response, body) {
                                     //console.log("2222222");
                                     if (!error) {
                                         var resultsStats = JSON.parse(body);
                                         should.not.exist(resultsStats.dateIn);
                                         setTimeout(function(){
                                             request.get({ url: Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id,
                                                 // body : JSON.stringify(reservation),
                                                 headers: {'content-type': 'application/json', 'Authorization': "Bearer " + CarDriverUserTestToken}
                                             }, function (error, response, body) {
                                                 // console.log("33333333");
                                                 if (!error) {
                                                     var resultsStats = JSON.parse(body);
                                                     should.exist(resultsStats.dateIn);
                                                     conf.retryCoreComunicationTimeOut=oldRetryCoreComunicationTimeOut;

                                                     request.del({ url : Parking.urlHandyParkingcore + "/reservations/" +  reservToCore._id,
                                                         headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
                                                     }, function(error, response, body) {console.log("REMOVE RESERVATION: " +  reservToCore._id + " body: " + body);done();});
                                                 }
                                             });
                                         },conf.retryCoreComunicationTimeOut*2);
                                     }
                             });






                         }
                     });
                 }else (error===null).should.be.true;

             });

         });
     });





     describe('POST /carparked/actions/carIn', function(){

         it('test corecomunication.removereservation: should expire a new reservation, because dateIn not exixst', function(done){
             this.timeout(4000);
             Parking.stats.occupiedLots=0;
             Parking.stats.freeLots=2;
             Parking.stats.reservedLots=0;
             Parking.stats.notAvailableLots=0;
             var oldParkingVal=Parking.validity;
             Parking.validity=1000;

             coreComunication.updateLostsStats();

             var prk = {

                 carplate:'aa000aa'

             };

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 //dateIn:new Date(),
                 notes:"test corecomunication.removereservation: should expire a new reservation, because dateIn not exixst)"
                 //dateOut:new Date()
             };

             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {

                 if(!error) {

                     var reservToCore=JSON.parse(body);

                     console.log("%%%%%%%%%%%%%%%%%%%%%%%%% ReserV:" + body );
                     console.log("%%%%%%%%%%%%%%%%%%%%%%%%% ReserV:" + Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id );
                     should.not.exist(reservToCore.dateIn);

                     setTimeout(function(){
                         request.get({ url: Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id,
                             // body : JSON.stringify(reservation),
                             headers: {'content-type': 'application/json', 'Authorization': "Bearer " + CarDriverUserTestToken}
                         }, function (error, response, body) {
                             // console.log("33333333");
                             if (!error) {
                                 Parking.validity=oldParkingVal;
                                 //conf.retryCoreComunicationTimeOut=oldRetryCoreComunicationTimeOut;
                                // var resultsStats = JSON.parse(response);
                                 response.statusCode.should.be.equal(204);
                                 done();

                             }else (error===null).should.be.true;
                         });
                     },Parking.validity*2);

                 }else (error===null).should.be.true;
             });
         });
     });



     describe('POST /carparked/actions/carIn', function(){

         it('test corecomunication.resendRemoveReservation after a removeReservation fails: should expire a new reservation, because dateIn not exixst', function(done){
             this.timeout(4000);
             Parking.stats.occupiedLots=0;
             Parking.stats.freeLots=2;
             Parking.stats.reservedLots=0;
             Parking.stats.notAvailableLots=0;
             var oldParkingVal=Parking.validity;
             Parking.validity=500;

             var oldretryCoreComunicationTimeOut=conf.retryCoreComunicationTimeOut;
             conf.retryCoreComunicationTimeOut=2000;



             coreComunication.updateLostsStats();

             var prk = {

                 carplate:'aa000aa'

             };

             var reservation = {
                 parking: Parking.myId,
                 car:carId,
                 //dateIn:new Date(),
                 notes:"test corecomunication.resendRemoveReservation after a removeReservation fails: should expire a new reservation, because dateIn not exixst"
                 //dateOut:new Date()
             };

             request.post({ url : Parking.urlHandyParkingcore + "/reservations",
                 body : JSON.stringify(reservation),
                 headers: {'content-type': 'application/json','Authorization' : "Bearer "+ CarDriverUserTestToken}
             }, function(error, response, body) {

                 if(!error) {
                     var oldPrkingToken=Parking.myToken;
                     Parking.myToken=0;
                     var reservToCore=JSON.parse(body);

                     //console.log("%%%%%%%%%%%%%%%%%%%%%%%%% ReserV PARKIG=0:" + body );

                     response.statusCode.should.be.equal(201);
                     should.not.exist(reservToCore.dateIn);


                     setTimeout(function(){
                         request.get({ url: Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id,
                             // body : JSON.stringify(reservation),
                             headers: {'content-type': 'application/json', 'Authorization': "Bearer " + CarDriverUserTestToken}
                         }, function (error, response, body) {
                             // console.log("33333333");
                             if (!error) {
                                 Parking.validity=oldParkingVal;
                                 Parking.myToken=oldPrkingToken;
                                 //conf.retryCoreComunicationTimeOut=oldRetryCoreComunicationTimeOut;
                                 // var resultsStats = JSON.parse(response);
                                 response.statusCode.should.be.equal(200);
                                 setTimeout(function(){
                                     request.get({ url: Parking.urlHandyParkingcore + "/reservations/" + reservToCore._id,
                                         // body : JSON.stringify(reservation),
                                         headers: {'content-type': 'application/json', 'Authorization': "Bearer " + CarDriverUserTestToken}
                                     }, function (error, response, body) {
                                         if (!error) {
                                             response.statusCode.should.be.equal(204);
                                             conf.retryCoreComunicationTimeOut=oldretryCoreComunicationTimeOut;
                                             done();

                                         }else (error===null).should.be.true;
                                     });
                                 },conf.retryCoreComunicationTimeOut);


                             }else (error===null).should.be.true;
                         });
                     },Parking.validity+(Parking.validity/2));

                 }else (error===null).should.be.true;
             });
         });
     });



     describe('POST /carparked/actions/carIn', function(){

         it('Wait to Time OUT EXPIRES', function(done){



             this.timeout(4000);
             setTimeout(function(){
                 done();
             },3000);



         });
     });


///


});
