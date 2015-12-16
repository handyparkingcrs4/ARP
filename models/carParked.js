var mongoose = require('mongoose');
var findAllFn = require('./metadata').findAll;
var Schema = mongoose.Schema;


var CarParkedSchema = new Schema({
    carplate: { type:String, index: true, required: true},
    dateIn: Date,
    dateOut: Date,
    hasReserved:Boolean,
    notes: String
},{strict: "throw"});


// Static method to retrieve parkings WITH metadata
CarParkedSchema.statics.findAll = function(conditions, fields, options, callback){
    return findAllFn(this, 'carparkeds', conditions, fields, options, callback);
};

var CarParked = mongoose.model('carParked', CarParkedSchema);



//module.exports.ReservationSchema = ReservationSchema;
module.exports.CarParked = CarParked;

