var mongoose = require('mongoose');
var findAllFn = require('./metadata').findAll;
var Schema = mongoose.Schema;


var DeviceSensorsSchema = new Schema({
    deviceIp: { type:String, index: true, required: true},
    description: String,
    typeIO: Boolean
},{strict: "throw"});


// Static method to retrieve parkings WITH metadata
DeviceSensorsSchema.statics.findAll = function(conditions, fields, options, callback){
   return findAllFn(this, 'deviceSensors', conditions, fields, options, callback);
};

var DeviceSensors = mongoose.model('DeviceSensors', DeviceSensorsSchema);



//module.exports.ReservationSchema = ReservationSchema;
module.exports.DeviceSensors = DeviceSensors;
