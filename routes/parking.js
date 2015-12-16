var express = require('express');
var middlewares = require('./middlewares');

var DeviceSensors = require('../models/deviceSensors').DeviceSensors;
var Parking = require('../models/parking').ArpParking;
var ParkingSchema = require('../models/parking').ParkingSchema;

var router = express.Router();
var util = require('util');


router.use(middlewares.parsePagination);
router.use(middlewares.parseFields);


/* POST reservation creation. */
/*
router.post('/', function(req, res) {

    //TODO: must be changed to return only authorized resources
    //given an authenticated user (by token)

    if(!req.body) {
        return res.status(400).send({error:'request body missing'});
    }

    if(!(Parking.stats.freeLots>0)){
        return res.status(423).send({warning:'No Lots available at the moment'});
    }

    Reservation.find({carplate:req.body.carplate},"carplate",function(err,docs){
        if(!err){
            if(docs.length==0){
                Reservation.create(req.body, function(err, reserv){
                    if(!err){
                        //console.log("resID:" +reserv._id);
                        var ArpStatus={reservation:reserv};
                        setTimeout(function(){ timeOutCarIn(Parking.validity,reserv._id.toString());},Parking.validity);
                        Parking.reserveLot(function(err,cb){
                            ArpStatus.stats={ 'freeLots': cb.freeLots, 'occupiedLots': cb.occupiedLots, 'reservedLots':cb.reservedLots};
                            //TODO: add CAR in White list
                        });
                        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
                        res.set('Location', fullUrl + "/"+ reserv._id);
                        res.status(201).send(ArpStatus);
                    }
                    else{
                        res.status(500).send({ error: 'something blew up, ERROR:'+err  });
                    }
                });
            } else{
                //console.log("DOCS: " + util.inspect(docs) + " L:" + docs.length);
                var strResponse='carplate ' + docs[0].carplate.toString() + '  already in reservation list';
                return res.status(409).send({warning:strResponse});
            }
        }else{
            res.status(500).send({ error: 'something blew up, ERROR:'+err  });
        }
    });
});
*/



/* GET reservations listing. */
router.get('/stats', function(req, res) {

    //TODO: returns ALL reservations, must be changed to return only authorized resources
    //given an authenticated user (by token)

    res.status(200).send(Parking.stats);
});







/* PUT, update reservation by id. */
router.put('/stats', function(req, res) {
    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)

    if((!req.body)|| (Object.keys(req.body).length===0)) { return res.status(400).send({error:'request body missing'}); }

    if((!('freelots' in req.body)) || (!('occupiedLots' in req.body)) || (!('reservedLots' in req.body)) || (!('notAvailableLots' in req.body)) )
        return res.status(400).send({error:'request body: missing values '});


    Parking.stats.freeLots=body.freeLots;
    Parking.stats.occupiedLots=body.occupiedLots;
    Parking.stats.reservedLots=body.reservedLots;
    Parking.stats.notAvailableLots=body.notAvailableLots;

    res.status(200).send(Parking.stats);

});

/* PUT, update reservation by id. */
router.put('/somestats', function(req, res) {
    //TODO: must be changed to return only authorized reservations
    //given an authenticated user (by token)

    if((!req.body)|| (Object.keys(req.body).length===0)) { return res.status(400).send({error:'request body missing'}); }



    //verify query params
    for (var v in req.body)
        if (! (v in ParkingSchema.stats))
            return res.status(400).send({error:'request body: invalid field ' + v });

    for (var v in req.body)
        Parking.stats[v]=req.body[v];


    res.status(200).send(Parking.stats);

});



module.exports = router;
