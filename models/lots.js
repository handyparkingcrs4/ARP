var mongoose = require('mongoose');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var LotSchema = new Schema({
  location: {
    lat : Number,
    lon : Number,
    number : String
  },
    reservable : {type:Boolean, required:true, default:false},
  status : { type:String, enum:['occupied','free','reserved', 'notavailable'], default: 'free', required : 'true'},
  description : String
},{strict: "throw"});

var Lot = mongoose.model('Lot', LotSchema);

/*
Lot.method.occupy = function(){
  this.status = 'occupied';
};

Lot.method.free = function(){
  this.status = 'free';
};

Lot.method.isFree = function(){
  return this.status === 'free';
};

Lot.method.reserve = function(){
  this.status = 'reserved';
};
*/
module.exports.LotSchema = LotSchema;
module.exports.Lot = Lot;
