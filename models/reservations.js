var mongoose = require('mongoose');
var findAllFn = require('./metadata').findAll;
var Schema = mongoose.Schema;


var ReservationSchema = new Schema({
    carplate: { type:String, index: true, required: true},
    dateIn: Date,
    coreId:String,
    //dateOut: Date,
    notes: String
},{strict: "throw"});


// Static method to retrieve parkings WITH metadata
ReservationSchema.statics.findAll = function(conditions, fields, options, callback){
   return findAllFn(this, 'reservations', conditions, fields, options, callback);
};

var Reservation = mongoose.model('Reservation', ReservationSchema);



//module.exports.ReservationSchema = ReservationSchema;
module.exports.Reservation = Reservation;
