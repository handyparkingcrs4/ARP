var mongoose = require('mongoose');
var lots = require('./lots');
var LotSchema = lots.LotSchema;
var Lot = lots.Lot;
var Schema = mongoose.Schema;
var util = require('util');
var Promise = require('promise');
var wait = require('wait.for');
var conf = require('../config').conf;

 //ObjectId = Schema.ObjectId;

//var findAllFn = require('./metadata').findAll;


var ParkingSchema  = new Schema({

  description : {type:String, required:true},

  location : {coordinates:{type: [Number], default: [0,0] }, 'type': {
      type: String,
      required: true,
      enum: ['Point', 'LineString', 'Polygon'],
      default: 'Point'} } ,  // [ lng, lat ]
  address : {type:String, required:true },
  city : {type:String, required:true},
  //locationDescr : String,
  pricePerHour : {
    first : { price :{ type:Number }, interval :{type:String} },
    second : { price :{ type:Number }, interval :{type:String} }
  },
  days : [],
  hours :[],
  img:{type:String, default : "http://handyparking.crs4.it/wp-content/uploads/2014/10/no_image_available.png"},
  web:String,
  reservable : {type:Boolean, required:true, default:false},
  ltReservable : {type:Boolean, required:true, default:false},
  validity: Number,
  prices : {},
  lots : [LotSchema],  //Array of lots
  stats : {
    freeLots : {type:Number, min:0, default:0},
    occupiedLots : {type:Number, min:0, default:0},
    reservedLots : {type:Number, min:0, default:0},
    notAvailableLots : {type:Number, min:0, default:0}
  },
  admins : [],
  serverURL : String,
  serverType : {type:String, enum:['ARP','IPM']},
  myId : String,
  myToken : String,
  myTokenExpires: Number,
  myUser : String,
  myPassword: String,
  urlArpMiddleware: String,
  urlHandyParkingcore: String

},{strict: "throw"});




ParkingSchema.methods.addLot = function(lot){
    this.lots.push(new Lot(lot));
    if (lot.status == 'free')
        this.stats.freeLots += 1;
    if (lot.status == 'occupied')
        this.stats.occupiedLots += 1;
    if (lot.status == 'reserved')
        this.stats.reservedLots += 1;
    if (lot.status == 'notavailable')
        this.stats.notAvailableLots += 1;
    this.checkLotsNum();
    //FIXME: save or not?
};

ParkingSchema.methods.getMyId = function(num){
    return(this.myId);
};

ParkingSchema.methods.addSimpleFreeLots = function(num){
  for (var i=0; i<num; i++)
    this.lots.push(new Lot());
  this.stats.freeLots += num;
};

ParkingSchema.methods.addSimpleOccupiedLots = function(num){
  for (var i=0; i<num; i++)
    this.lots.push(new Lot({status : 'occupied'}));
  this.stats.occupiedLots += num;
};
ParkingSchema.methods.addSimpleReservedLots = function(num){
  for (var i=0; i<num; i++)
    this.lots.push(new Lot({status : 'reserved'}));
  this.stats.reservedLots += num;
};
ParkingSchema.methods.checkLotsNum = function(){
    var lTot = this.lots.length;
    var sTot = this.stats.freeLots + this.stats.occupiedLots + this.stats.reservedLots + this.stats.notAvailableLots;
    if (lTot !== sTot)
        throw 'Incoerence between lots ('+lTot+') and stats ('+sTot+')';
};

ParkingSchema.methods.totalLots = function(){
  this.checkLotsNum();
  var lTot = this.lots.length;
  return lTot;
};



ParkingSchema.methods.getLotsByQuery = function(query){ //Maybe already in mongoose? NO, it's not.
  var res = this.lots.filter(function(element){
    var q = true;
    for (var attribute in query){
      q = (q && (element[attribute] == query[attribute]));
    }
    return q;
  });

  return res;
};



/*
Reserve al lot
 */
ParkingSchema.methods.reserveLot = function(cb){
  this.stats.freeLots-=1;
  this.stats.occupiedLots+=1;
  this.stats.reservedLots+=1;
  var lotsStatus={freeLots: this.stats.freeLots, occupiedLots:this.stats.occupiedLots, reservedLots:this.stats.reservedLots};
  cb('',lotsStatus);


};


/*
 cancelReservation a lot
 */
ParkingSchema.methods.cancelReservation = function(cb){
    this.stats.freeLots+=1;
    this.stats.occupiedLots-=1;
    this.stats.reservedLots-=1;
    var lotsStatus={freeLots: this.stats.freeLots, occupiedLots:this.stats.occupiedLots, reservedLots:this.stats.reservedLots};
    cb('',lotsStatus);
};


ParkingSchema.methods.shouldOccuppyLots = function(lotsNum,cb){
    if(lotsNum<= this.stats.freeLots){
        this.stats.freeLots-=lotsNum;
        this.stats.occupiedLots+=lotsNum;
        var lotsStatus={freeLots: this.stats.freeLots, occupiedLots:this.stats.occupiedLots, reservedLots:this.stats.reservedLots};
        var err='';
    }else{
        var err='No Lots Available';
    }
    cb(err,lotsStatus);
};

ParkingSchema.methods.getStats = function(){
     var lotsStatus={freeLots: this.stats.freeLots, occupiedLots:this.stats.occupiedLots, reservedLots:this.stats.reservedLots, notAvailableLots:this.stats.notAvailableLots};
     return(lotsStatus);
};


ParkingSchema.methods.shouldFreeLots = function(lotsNum,cb){
    //console.log("OCCUPPY LOTS: " + this.stats.occupiedLots);
    if(lotsNum<= this.stats.occupiedLots){
        this.stats.freeLots+=lotsNum;
        this.stats.occupiedLots-=lotsNum;
        var err='';
        var lotsStatus={freeLots: this.stats.freeLots, occupiedLots:this.stats.occupiedLots, reservedLots:this.stats.reservedLots};
    }else{
        var err='lots to free should be less than occuppied lots';
        var lotsStatus={freeLots: this.stats.freeLots, occupiedLots:this.stats.occupiedLots, reservedLots:this.stats.reservedLots};
    }
    cb(err,lotsStatus);
};


// Parking.prototype.reserveLot = function(){
//   this.lots.()
// }

var Parking = mongoose.model('Parking', ParkingSchema);


/*




function singleton() {


    Parking.findOne({},function (err, results) {
        if (!err) {

            if (results) {
                ArpParking = results;
            } else {
                Parking.create({
                    description: 'ARP Parking',
                    address: 'Via Parking',
                    city: 'City Parking',
                    pricePerHour: {},
                    lots: [],
                    stats: {
                        freeLots: 2,
                        occupiedLots: 0,
                        reservedLots: 0,
                        notAvailableLots: 0
                    },
                    admins: [],
                    serverUrl: '',
                    serverType: "ARP",
                    validity: 1000
                }, function (err, parki) {
                    ArpParking = parki;
                    cb(ArpParking);
                });

            }/*
             setInterval(function () {
             Parking.findOneAndUpdate({}, ArpParking.stats, function (err, product) {
             if (err) throw err;
             //console.log('Parking ARP: ' +product);
             }, 1000 * 60);


             });*//*
        }
    });
}



function createParking(){

    return (new Promise(function(accept,reject){

        Parking.findOne({},function (err, results) {
            if (!err) {

                if (results) {
                    console.log("TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO " + results);
                    accept(results);
                } else {
                    Parking.create({
                        description: 'ARP Parking',
                        address: 'Via Parking',
                        city: 'City Parking',
                        pricePerHour: {},
                        lots: [],
                        stats: {
                            freeLots: 2,
                            occupiedLots: 0,
                            reservedLots: 0,
                            notAvailableLots: 0
                        },
                        admins: [],
                        serverUrl: '',
                        serverType: "ARP",
                        validity: 1000
                    }, function (err, parki) {
                        console.log("NON NON NON TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO " + parki);
                        accept(parki);
                    });

                }
                /*
                 setInterval(function () {
                 Parking.findOneAndUpdate({}, ArpParking.stats, function (err, product) {
                 if (err) throw err;
                 //console.log('Parking ARP: ' +product);
                 }, 1000 * 60);
                 });*//*

            }else reject("error in db Query");
        });

        console.log("PROMISE END END END END END END END END END END END END END END END END END END END END END END END END END END ");
    }));
}







function provaPromise(){


    return(new Promise(function(fill,reject){
        createParking().done(function (acpt){
            console.log("ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED ACCEPTED");
            fill(acpt);
        },function(rj){
            console.log("REJECTED REJECTED REJECTED REJECTED REJECTED REJECTED REJECTED REJECTED REJECTED REJECTED REJECTED REJECTED");
            reject(reject);
        })}));



}

/*
var timeOut=false;
setTimeout(function stop(){
   timeOut=true;
},3000);

while(!ArpParking && !timeOut){
    console.log("Waiting for Parking data Info");
}
*/


/*
function createP(callback){
    Parking.findOne({},function (err, results) {
        if (!err) {

            if (results) {
                console.log("TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO " + results);
                callback(results);
            } else {
                Parking.create({
                    description: 'ARP Parking',
                    address: 'Via Parking',
                    city: 'City Parking',
                    pricePerHour: {},
                    lots: [],
                    stats: {
                        freeLots: 2,
                        occupiedLots: 0,
                        reservedLots: 0,
                        notAvailableLots: 0
                    },
                    admins: [],
                    serverUrl: '',
                    serverType: "ARP",
                    validity: 1000
                }, function (err, parki) {
                    console.log("NON NON NON TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO TROVATO " + parki);
                    callback(parki);
                });

            }
            /*
             setInterval(function () {
             Parking.findOneAndUpdate({}, ArpParking.stats, function (err, product) {
             if (err) throw err;
             //console.log('Parking ARP: ' +product);
             }, 1000 * 60);
             });*//*

        }
    });
}
*/

//function createTempP(){
var ArpParking=null;


function getSingleton() {
    if(ArpParking==null) {
        ArpParking = new Parking(conf.parkingForTest);
    }
    return ArpParking;
}

module.exports.ParkingSchema = ParkingSchema;
module.exports.ArpParkingModel = Parking;
module.exports.ArpParking = getSingleton();

