var should = require('should');
var mongoose = require('mongoose');
var _ = require('underscore')._;
var async = require('async');
var dbConnection = require("../models/dbConnection");
var DeviceSensors = require('../models/deviceSensors').DeviceSensors;



describe('DeviceSensors Model', function(){

  before(function(done){

    dbConnection.connect(function(){
      done();
    });
  });

  after(function(done){

    dbConnection.disconnect(function(){
      done();
    });
  });


  beforeEach(function(done){



    var range = _.range(100);

      async.each(range, function(e,cb){
           deviceSensors = new DeviceSensors({
           deviceIp: "192.168.1."+e,
           description: "description, " +e
           });

          deviceSensors.save(function(err, deviceSensors){
               if (err) throw err;
                 cb();
               });

    }, function(err){
      done();
    });
  });

  afterEach(function(done){
      DeviceSensors.remove(function(err, deviceSensors){
            if(err) throw err;
            done();
    });
  });



  describe('findAll({skip:2, limit:30})', function(){

    it('must include _metadata with correct values', function(done){

        DeviceSensors.findAll({}, null, {skip:2, limit:30}, function(err, results){

          if(err) throw err;
          else{
            results.should.have.property('_metadata');
            results.deviceSensors.length.should.be.equal(30);
            results._metadata.skip.should.be.equal(2);
            results._metadata.limit.should.be.equal(30);
            results._metadata.should.have.property('totalCount');
            results._metadata.totalCount.should.be.equal(100);

          }
          done();

      });

    });

  });


  describe('findAll({skip:0, limit:10})', function(){

    it('must include _metadata with correct values', function(done){

        DeviceSensors.findAll({}, null, {skip:0, limit:10}, function(err, results){

          if(err) throw err;
          else{
            //console.log(results);
            results.should.have.property('_metadata');
            results.deviceSensors.length.should.be.equal(10);
            results._metadata.skip.should.be.equal(0);
            results._metadata.limit.should.be.equal(10);
            results._metadata.totalCount.should.be.equal(100);

          }
          done();

      });

    });

  });


  describe('findAll() no pagination', function(){

    it('must include _metadata with default values', function(done){

        DeviceSensors.findAll({}, null, null, function(err, results){

          if(err) throw err;
          else{
            results.should.have.property('_metadata');
            results.deviceSensors.length.should.be.equal(50);
            results._metadata.skip.should.be.equal(0);
            results._metadata.limit.should.be.equal(50);
            results._metadata.totalCount.should.be.equal(100);

          }
          done();

      });

    });

  });





  describe('findAll({skip:0, limit:2})', function(){

    it('must include _metadata with correct values and only 2 entries', function(done){

        DeviceSensors.findAll({}, null, {skip:0, limit:2}, function(err, results){

          if(err) throw err;
          else{
            results.should.have.property('_metadata');
            results.deviceSensors.length.should.be.equal(2);
            results._metadata.skip.should.be.equal(0);
            results._metadata.limit.should.be.equal(2);
            results._metadata.totalCount.should.be.equal(100);

          }
          done();

      });

    });

  });


  describe('findOne()', function(){

      it('check data', function(done){
          DeviceSensors.findOne({}, null, function(err, deviceSensors){
            if(err) throw err;
            else{
                deviceSensors.should.have.property('deviceIp');
                deviceSensors.should.have.property('description');
            }
          done();

      });

    });

  });

});
