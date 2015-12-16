//var test= require('unit');
var should = require('should');
var mongoose = require('mongoose');
var _ = require('underscore')._;
var async = require('async');
var arpService = require("../models/startUp");
var Reservation = require('../models/reservations').Reservation;
var Parking=require('../models/parking').ArpParking;
//var Lot = require('../models/lots').Lot;
//var l = require('../models/lots');
var request = require('request');
var app = require('../app');
var util = require('util');
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


describe('ARP RESERVATION API', function(){

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


      Parking.stats.freeLots=2;
      Parking.stats.occupiedLots=0;
      Parking.stats.reservedLots=0;
      Parking.stats.notAvailableLots=0;
      Parking.validity=conf.parkingForTest.validity;


      var range = _.range(100);

      async.each(range, function(e,cb){
          reservation = new Reservation({
              carplate: "AA123"+e+"CA",
              notes: ""+e,
              dateIn: new Date()
              //dateOut:new Date()

          });

          reservation.save(function(err, reservation){
              if (err) throw err;
              cb();

          });

      }, function(err){

          done();

      });
  });

  afterEach(function(done){

    Reservation.remove(function(err, product){
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




    describe('POST /reservations', function(){

        it('should expire a new reservation, because dateIn not exixst', function(done){

            Parking.validity=1000;

            var reservation = {
                coreId:'TEST EXPIRE',
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
                    results.stats.freeLots.should.be.equal(1);
                    results.stats.occupiedLots.should.be.equal(1);
                    results.stats.reservedLots.should.be.equal(1);

                    Reservation.findById(results.reservation._id,function(err,reservationById){
                        //console.log(util.inspect(reservationById));
                        reservationById.carplate.should.be.equal('ale romanino');
                    });

                    setTimeout(function(){
                        console.log("TIMEOUT EXIPED");
                        Reservation.findById(results.reservation._id,function(err,reservationById){
                            (reservationById === null).should.be.true;
                        });
                        done();
                    },1500);
                }
            });
        });
    });


    describe('POST /reservations', function(){

        it('should not expire a new reservation, because dataIn exist', function(done){

            Parking.validity=1000;
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
                                var retDateIn=new Date(savedDoc.dateIn);
                               // console.log(retDateIn + " " + util.inspect(retDateIn));
                               // console.log(carDateIn + " " + util.inspect(retDateIn));
                                retDateIn.should.be.eql(carDateIn);
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

        it('must return 2 reservations and _metadata, all fields', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=2', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(200);
                    var results = JSON.parse(body);
                    results.should.have.property('_metadata');
                    results.should.have.property('reservations');
                    results._metadata.skip.should.be.equal(0);
                    results._metadata.limit.should.be.equal(2);
                    results._metadata.totalCount.should.be.equal(100);
                    should.exist(results.reservations[0]);
                    var reservation = results.reservations[0];
                    reservation.should.have.property('carplate');
                    reservation.should.have.property('notes');
                    reservation.should.have.property('dateIn');
                    //reservation.should.have.property('dateOut');
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
                    //reservation.should.have.property('dateOut');
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
                    //reservation.should.have.property('dateOut');

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
                    //reservation.should.not.have.property('dateOut');
                }
                done();
            });
        });
    });


    describe('GET /reservations', function(){

        it('must return reservation skip=0,limit=20 fields carplate,dateIn sort by carplate desc and _metadata, all fields', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=20&fields=carplate,dateIn&sortDesc=carplate', function(error, response, body){

                if(error) throw err;
                else{

                    response.statusCode.should.be.equal(200);
                    var results = JSON.parse(body);
                    results.should.have.property('_metadata');
                    results.should.have.property('reservations');
                    results._metadata.skip.should.be.equal(0);
                    results._metadata.limit.should.be.equal(20);
                    results._metadata.totalCount.should.be.equal(100);
                    should.exist(results.reservations[0]);
                    var reservation = results.reservations[0];
                    reservation.should.have.property('carplate');
                    reservation.should.not.have.property('notes');
                    reservation.should.have.property('dateIn');
                    //reservation.should.have.property('dateOut');

                }

                done();

            });

        });

    });


    describe('GET /reservations', function(){

        it('must return reservation skip=0,limit=20 carplate=value, fields:carplate,dateIn, sortBy: carplate desc and _metadata, all fields', function(done){

            var rsvt={
                    carplate:'ale roma',
                    dateIn: new Date()
            }

            Reservation.create(rsvt,function(err,val){
               if(!err){
                   request.get(APIURL+'/reservations?skip=0&limit=20&fields=carplate,dateIn&sortDesc=carplate&carplate='+rsvt.carplate, function(error, response, body){

                       if(error) throw err;
                       else{

                           response.statusCode.should.be.equal(200);
                           var results = JSON.parse(body);
                           results.should.have.property('_metadata');
                           results.should.have.property('reservations');
                           results._metadata.skip.should.be.equal(0);
                           results._metadata.limit.should.be.equal(20);
                           results._metadata.totalCount.should.be.equal(1);
                           should.exist(results.reservations[0]);
                           var reservation = results.reservations[0];
                           reservation.should.have.property('carplate');
                           reservation.should.not.have.property('notes');
                           reservation.should.have.property('dateIn');
                           reservation.carplate.should.be.equal(rsvt.carplate);
                           //reservation.should.have.property('dateOut');

                       }

                       done();

                   });
               }
            });



        });

    });



    describe('GET /reservations', function(){

        it('must return reservation dateIn=value, fields:carplate,dateIn, sortBy: carplate desc and _metadata', function(done){

            var rsvt={
                carplate:'ale roma',
                dateIn: new Date("01/05/1981"),
                notes:'ND'
            }

            Reservation.create(rsvt,function(err,val){
                if(!err){
                    request.get(APIURL+'/reservations?fields=carplate,dateIn&sortDesc=carplate&dateIne=' + rsvt.dateIn.toISOString(), function(error, response, body){

                        if(error) throw err;
                        else{

                            //console.log("ERROR: " + util.inspect(body));
                            response.statusCode.should.be.equal(200);
                            var results = JSON.parse(body);
                            results.should.have.property('_metadata');
                            results.should.have.property('reservations');
                            results._metadata.skip.should.be.equal(0);
                            results._metadata.limit.should.be.equal(50);
                            results._metadata.totalCount.should.be.equal(1);
                            should.exist(results.reservations[0]);
                            var reservation = results.reservations[0];
                            reservation.should.have.property('carplate');
                            reservation.should.not.have.property('notes');
                            reservation.should.have.property('dateIn');
                            reservation.carplate.should.be.equal(rsvt.carplate);
                            //console.log("Date Mongo:" + reservation.dateIn);
                            //console.log("Date DateC:" + rsvt.dateIn.toISOString());
                            reservation.dateIn.should.be.equal(rsvt.dateIn.toISOString());
                            //reservation.should.have.property('dateOut');

                        }

                        done();

                    });
                }
            });



        });

    });



    describe('GET /reservations', function(){

        it('must return reservation dateIn=value, fields:All, and _metadata', function(done){

            var rsvt={
                carplate:'ale roma',
                dateIn: new Date("01/05/1981"),
                notes:'ND'
            }

            Reservation.create(rsvt,function(err,val){
                if(!err){
                    request.get(APIURL+'/reservations?dateIne=' + rsvt.dateIn.toISOString(), function(error, response, body){

                        if(error) throw err;
                        else{

                            //console.log("ERROR: " + util.inspect(body));
                            response.statusCode.should.be.equal(200);
                            var results = JSON.parse(body);
                            results.should.have.property('_metadata');
                            results.should.have.property('reservations');
                            results._metadata.skip.should.be.equal(0);
                            results._metadata.limit.should.be.equal(50);
                            results._metadata.totalCount.should.be.equal(1);
                            should.exist(results.reservations[0]);
                            var reservation = results.reservations[0];
                            reservation.should.have.property('carplate');
                            reservation.should.have.property('notes');
                            reservation.should.have.property('dateIn');
                            reservation.carplate.should.be.equal(rsvt.carplate);
                            reservation.dateIn.should.be.equal(rsvt.dateIn.toISOString());
                            //reservation.should.have.property('dateOut');

                        }

                        done();

                    });
                }
            });



        });

    });


    describe('GET /reservations', function(){

        it('must return reservation whithout skip, limit whith sort', function(done){

            var rsvt={
                carplate:'ale roma',
                dateIn: new Date("01/05/1981"),
                notes:'ND'
            }

            Reservation.create(rsvt,function(err,val){
                if(!err){
                    request.get(APIURL+'/reservations?sortAsc=carplate&dateIne=' + rsvt.dateIn.toISOString(), function(error, response, body){

                        if(error) throw err;
                        else{

                            //console.log("ERROR: " + util.inspect(body));
                            response.statusCode.should.be.equal(200);
                            var results = JSON.parse(body);
                            results.should.have.property('_metadata');
                            results.should.have.property('reservations');
                            results._metadata.skip.should.be.equal(0);
                            results._metadata.limit.should.be.equal(50);
                            results._metadata.totalCount.should.be.equal(1);
                            should.exist(results.reservations[0]);
                            var reservation = results.reservations[0];
                            reservation.should.have.property('carplate');
                            reservation.should.have.property('notes');
                            reservation.should.have.property('dateIn');
                            reservation.carplate.should.be.equal(rsvt.carplate);
                            reservation.dateIn.should.be.equal(rsvt.dateIn.toISOString());
                            //reservation.should.have.property('dateOut');

                        }

                        done();

                    });
                }
            });



        });

    });


    describe('GET /reservations', function(){

        it('must return All reservation all fields, skip=0,limit=50 sortby Caplate ', function(done){

            var rsvt={
                carplate:'ale roma',
                dateIn: new Date("01/05/1981"),
                notes:'ND'
            }

            Reservation.create(rsvt,function(err,val){
                if(!err){
                    request.get(APIURL+'/reservations?sortAsc=carplate', function(error, response, body){

                        if(error) throw err;
                        else{

                            //console.log("ERROR: " + util.inspect(body));
                            response.statusCode.should.be.equal(200);
                            var results = JSON.parse(body);
                            results.should.have.property('_metadata');
                            results.should.have.property('reservations');
                            results._metadata.skip.should.be.equal(0);
                            results._metadata.limit.should.be.equal(50);
                            results._metadata.totalCount.should.be.equal(101);
                            should.exist(results.reservations[0]);
                            var reservation = results.reservations[0];
                            reservation.should.have.property('carplate');
                            reservation.should.have.property('notes');
                            reservation.should.have.property('dateIn');
                            //reservation.should.have.property('dateOut');

                        }

                        done();

                    });
                }
            });



        });

    });



    describe('GET /reservations', function(){

        it('must return error in query field', function(done){

            var rsvt={
                carplate:'ale roma',
                dateIn: new Date()
            }

            Reservation.create(rsvt,function(err,val){
                if(!err){
                    request.get(APIURL+'/reservations?skip=0&limit=20&fields=carplate,dateIn&sortDesc=carplate&carplat='+rsvt.carplate, function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(400);
                            var results = JSON.parse(body);
                            results.should.have.property('error');
                            results.should.have.property('type');
                            results.error.should.be.equal('invalid request params, carplat');
                            //reservation.should.have.property('dateOut');

                        }

                        done();

                    });
                }
            });



        });

    });


    describe('GET /reservations', function(){

        it('must return error in field param', function(done){

            var rsvt={
                carplate:'ale roma',
                dateIn: new Date()
            }

            Reservation.create(rsvt,function(err,val){
                if(!err){
                    request.get(APIURL+'/reservations?skip=0&limit=20&fields=carplat,dateIn&opt=sortDesc:carplate&carplate:'+rsvt.carplate, function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(400);
                            var results = JSON.parse(body);
                            results.should.have.property('error');
                            results.should.have.property('type');
                            results.error.should.be.equal('invalid request fields, carplat');
                            //reservation.should.have.property('dateOut');

                        }

                        done();

                    });
                }
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
                    results.error.should.be.equal('invalid request params, carplat');
                }
                done();
            });
        });
    });


    describe('GET /reservations', function(){

        it('must return fields error, test 400', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1&fields=carplat&carplate=nonMiTrovi', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(400);
                    var results = JSON.parse(body);
                    results.should.have.property('error');
                    results.error.should.be.equal('invalid request fields, carplat');
                }
                done();
            });
        });
    });


    describe('GET /reservations', function(){

        it('must return sort fields error, test 400', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1&fields=carplate&sortAsc=carplat', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(400);
                    var results = JSON.parse(body);
                    results.should.have.property('error');
                    results.error.should.be.equal('invalid option sort fields: carplat');
                }
                done();
            });
        });
    });




    describe('GET /reservations', function(){

        it('must return invalid date error', function(done){

            request.get(APIURL+'/reservations?skip=0&limit=1&fields=carplate&sortAsc=carplate&dateIne=05/50/1950', function(error, response, body){

                if(error) throw err;
                else{
                    response.statusCode.should.be.equal(400);
                    var results = JSON.parse(body);
                    results.should.have.property('error');
                    results.error.should.be.equal('invalid query request, invalid date:05/50/1950');
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
                            //results.should.have.property('dateOut');

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

        it('must NOT update a reservation; notecontents fields erroe', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/'+reserv._id;

                    var aReserv = JSON.stringify({notecontents:'a simple. modified note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv},function(error, response, body){

                        if(error) throw err;
                        else{

                            response.statusCode.should.be.equal(400);
                            var results = JSON.parse(body);
                            results.should.have.property('error');
                            results.error.should.be.equal('Only field notes can be updated');

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

        it('must NOT update a reservation; a 400 error notecontents valid', function(done){


            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{

                    var url = APIURL+'/reservations/carplate/'+reserv.carplate;

                    var aReserv = JSON.stringify({notecontents:'a simple. modified note'});
                    request.put({ url: url, headers: {'content-type': 'application/json'}, body: aReserv},function(error, response, body){

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



    describe('POST /reservations/actions/deleteByCarplate?carplate=', function(){

        it('must delete a reservation by carplate', function(done){

            Reservation.findOne({}, function(err, reserv){

                if(err) throw err;
                else{
                    var url = APIURL+'/reservations/actions/deleteByCarplate?carplate='+reserv.carplate;
                    request.post(url,{},function(error, response, body){

                        if(error) throw err;
                        else{
                            response.statusCode.should.be.equal(201);

                            Reservation.findOne({_id:reserv._id}, function(err, r){
                                should(r).not.be.ok;
                                done();
                            });
                        }
                    });
                }
            });

        });
    });


    //----
    describe('POST /reservations/actions/deleteByCarplate?carplate=', function(){

        it('deleteByCarplate must return a 404 not found', function(done){


            Reservation.findOne({}, function(err, r){

                if(err) throw err;
                else{
                    var url = APIURL+'/reservations/actions/deleteByCarplate?carplate=541ae25819baa50000d8fe00';
                    request.post(url,{},function(error, response, body){

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



});
