var mongoose = require('mongoose');
var conf = require('../config').conf;
var db = require("../models/dbConnection");
var coreComunication = require('./coreComunication').CoreComunication;
var Parking = require('./parking').ArpParking;
var ParkingModel = require('./parking').ArpParkingModel;
var ParkingModelSchema = require('./parking').ParkingSchema;
var util = require('util');

var dbParkingDocument;




function saveParkingNow(callback){

    if(dbParkingDocument) {
        ParkingModelSchema.eachPath(function (path) {
            // if(Parking[path] && (path!="_id"))
            if (Parking[path])
                dbParkingDocument[path] = Parking[path];
        });

        dbParkingDocument.save(function (err, res) {
            callback(null);
        });
    }else callback("Parking Not Saved");
}


function saveParking(timeOut){

    console.log("Saving PARKING......." + Parking.validity + " " + (new Date()).getTime());

    setTimeout(function(){
        saveParkingNow(function(err){
            var sec=conf.saveParkingFreq * 1000;
            saveParking(sec);
        });
    },timeOut);


}

function saveToken(token){
    Parking.myToken=token.myToken;
    Parking.myTokenExpires=token.myTokenExpires;
    //Parking.myId=token.myId;
    Parking.admins=[token.myId];
}

function updateParking(newValues){

    ParkingModelSchema.eachPath(function(path){
        if(newValues[path])
            Parking[path]=newValues[path];
    })
}

exports.startService = function connect(callback){
    db.connect(function(err){
        if(err){
            //console.log("Unable to connect to DB, err:" +err);
            callback("Unable to connect to DB, err:" +err,null);
        }else{
            //console.log("Connected to DB");
            ParkingModel.findOne({},function(err,results){
               if(err){
                   callback("Unable find out parking information " + err,null);
               }else{
                   if(!results){ // No Parking Saved
                       callback("No Parking information loaded in the DB. Should insert the information before run ARP service");
                   } else{

                       dbParkingDocument=results;
                       updateParking(results);

                       coreComunication.getToken(function(err,token){
                           if(err){
                               saveParking(60);
                               callback(null,{DB_Connection:"connected OK", Init_Parking:"OK", Token:err });
                           } else{ // Send Informatin to Core
                               saveToken(token);
                                coreComunication.pubblishToCore(function(err,publishied){
                                   if(err){
                                       saveParking(60);
                                       callback(null,{DB_Connection:"connected OK", Init_Parking:"OK", Token:token, Published_To_Core: err });
                                   }else{
                                       Parking.myId=publishied._id;
                                       saveParking(0)
                                       callback(null,{DB_Connection:"connected OK", Init_Parking:"OK", Token:token, Published_To_Core: publishied });
                                   }
                                });
                           }
                       });
                   }
               }
            });
        }
    });

};


exports.stopService = function disconnect(callback){

    saveParkingNow(function(){
        db.disconnect(function(err){

            if(err){
                //console.log();
                callback('Unable to disconnect from database' + err)
            }else{
                //console.log('Disconnected from database');
                callback(null,{DB_Disconnection:"Disconnected from database"});
            }

        });
    })

};
