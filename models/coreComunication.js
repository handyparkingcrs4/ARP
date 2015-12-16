var request = require('request');
var conf = require('../config').conf;
var Parking = require('./parking').ArpParking;
var moment = require('moment');


function Corecomunication() {

    //this.myHPCoreId=Parking.myId;
    // this.urlHPCore =  Parking.urlHandyParkingcore;
    this.timeOutQueue = [];
    // this.removeReservationQueue=[];
    // getToken(this);
}



function tokenIsValid(callback) {

    var that = this;
    var expiringToken = Parking.myTokenExpires;


    var now = moment().add(120, 'seconds');
    var renewDelay = expiringToken - now;

    if (renewDelay < 0) {
        that.getToken(function (err, token) {
            if (!err) {
                bodyRes = JSON.parse(token);
                if (bodyRes.error) {
                    console.log("Can not renew the token " + bodyRes.error);
                    callback("Can not renew the token " + bodyRes.error);
                }
                else {
                    Parking.myTokenExpires = bodyRes.expires;
                    callback(null);
                }
            } else {
                console.log("Can not renew the token " + err);
                callback("Can not renew the token " + err);
            }
        });
    } else callback(null);


}

Corecomunication.prototype.pubblishToCore = function (callback) {

    //clone Parking
    var coreParking = JSON.parse(JSON.stringify(Parking));
    tokenIsValid(function (err) {
        if (!err) {

            delete coreParking.myId;
            delete coreParking.myToken;
            delete coreParking.myTokenExpires;
            delete coreParking.myUser;
            delete coreParking.myPassword;
            delete coreParking.urlArpMiddleware;
            delete coreParking.urlHandyParkingcore;
            delete coreParking._id;


            var getParkingDataBody = JSON.stringify(coreParking);

            if (Parking.myId) {
                request.put({ url: Parking.urlHandyParkingcore + "/parkings/" + Parking.myId,
                    body: getParkingDataBody,
                    headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
                }, function (error, response, body) {
                    if (!error) {
                        callback(null, JSON.parse(body));
                    } else callback("ERROR IN PUBLISHING UPDATE PARKING INFO " + error, null);
                });
            } else {
                request.post({ url: Parking.urlHandyParkingcore + "/parkings",
                    body: getParkingDataBody,
                    headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
                }, function (error, response, body) {
                    if (!error) {
                        callback(null, JSON.parse(body));
                    } else callback("ERROR IN PUBLISHING PARKING INFO " + error, null);
                });
            }
        } else callback(err);
    });
}





Corecomunication.prototype.getToken = function (callback) {
    var bodyJson = {
        "username": Parking.myUser,
        "password": Parking.myPassword
    };
    var getTokenDataBody = JSON.stringify(bodyJson);


    request.post({ url: Parking.urlHandyParkingcore + "/token",
        body: getTokenDataBody,
        headers: {'content-type': 'application/json'}
    }, function (error, response, body) {
        if (!error) {
            bodyRes = JSON.parse(body);
            if (bodyRes.error)
                callback("ERROR TOKEN REQUEST " + body, null);
            else {
                callback(null, {myToken: bodyRes.token, myTokenExpires: bodyRes.expires, myId: bodyRes.userId });
            }

        } else callback("ERROR TOKEN REQUEST " + error, null);
    });
}

/////
Corecomunication.prototype.resendCarParking = function (timeOut, ntimes, reservId, date) {

    var that = this;
    var fullUrlHPCore = Parking.urlHandyParkingcore + '/reservations/' + reservId;

    tokenIsValid(function (err) {
        if (!err) {
            setTimeout(function () {

                var bodyJson = {
                    dateIn: date
                };
                var updateDataBody = JSON.stringify(bodyJson);

                request.put({ url: fullUrlHPCore,
                    body: updateDataBody,
                    headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
                }, function (error, response) {
                    if (error || !(response.statusCode === 200)) {
                        if (ntimes <= 5) {
                            that.resendCarParking(2 * timeOut, ntimes + 1, reservId, date);
                            console.error("something blew up, ERROR:" + response.statusCode + " --> " + response.body);
                        } else console.error("impossible to set that the car parked in reservation byID:" + reservId);

                    }
                });

            }, timeOut);
        } else callback(err);
    });

};


Corecomunication.prototype.carParking = function (reservationId, date) {
    var that = this;

    var fullUrlHPCore = Parking.urlHandyParkingcore + '/reservations/' + reservationId;

    var bodyJson = {
        dateIn: date
    };
    var updateDataBody = JSON.stringify(bodyJson);

    tokenIsValid(function (err) {
        if (!err) {
            request.put({ url: fullUrlHPCore,
                body: updateDataBody,
                headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
            }, function (error, response) {
                if (error || !(response.statusCode === 200)) {
                    that.resendCarParking(conf.retryCoreComunicationTimeOut, 1, reservationId, date);
                    console.error("something blew up, ERROR:" + response.statusCode + " --> " + response.body);
                }
            });
        } else callback(err);
    });
};

/////


Corecomunication.prototype.carCanLeaveParking = function (reservationId, date, callback) {
    //var that=this;

    tokenIsValid(function (err) {
        if (!err) {
            var fullUrlHPCore = Parking.urlHandyParkingcore + '/reservations/actions/CarOut/' + reservationId;

            var bodyJson = {
                dateOut: date
            };
            var updateDataBody = JSON.stringify(bodyJson);

            //console.log("MY TOKEN CAR CAN LEAVE" + Parking.myToken);

            request.post({ url: fullUrlHPCore,
                body: updateDataBody,

                headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
            }, function (error, response, body) {
                //console.log("ERROR POST  NOT FOUND:::: code:"+response.statusCode + " erro:"+ error + " body:" + body);
                //console.log("ERROR:::::" + error);
                if (error)
                    return (callback({error: "something blew up: " + error}, {statusCode: 500}));
                else {
                    if (response.statusCode == 201) return (callback(null, response));
                    else return (callback({error: body}, {statusCode: response.statusCode}));
                }
            });
        } else callback(err);
    });


};


Corecomunication.prototype.resendRemoveReservation = function (timeOut, ntimes, reservId) {

    var that = this;
    var fullUrlHPCore = Parking.urlHandyParkingcore + '/reservations/' + reservId;

    tokenIsValid(function (err) {
        if (!err) {
            setTimeout(function () {


                request.del({ url: fullUrlHPCore,
                    headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
                }, function (error, response) {
                    if (error || !(response.statusCode === 200))
                        if (ntimes <= 5) {
                            that.resendRemoveReservation(2 * timeOut, ntimes + 1, reservId);
                        } else console.error("After 5 attempts, was not possible to remove reservation id:" + reservId);

                });

            }, timeOut);
        } else callback(err);
    });

};


Corecomunication.prototype.removeReservation = function (reservationId) {

    var that = this;

    var fullUrlHPCore = Parking.urlHandyParkingcore + '/reservations/' + reservationId;

    tokenIsValid(function (err) {
        if (!err) {

            request.del({ url: fullUrlHPCore,
                headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
            }, function (error, response) {
                if (error || !(response.statusCode === 200))
                    that.resendRemoveReservation(conf.retryCoreComunicationTimeOut, 1, reservationId);
            });
        } else callback(err);
    });
};


Corecomunication.prototype.updateLostsStats = function () {

    var that = this;
    tokenIsValid(function (err) {
        if (!err) {
            // Reset any setted timeout
            that.timeOutQueue.forEach(function (value) {
                clearTimeout(value);
            });
            that.timeOutQueue = [];
            // End


            var fullUrlHPCore = Parking.urlHandyParkingcore + '/parkings/' + Parking.myId;
            var bodyJson = {
                stats: Parking.getStats()
            };
            var updateDataBody = JSON.stringify(bodyJson);


            request.put({ url: fullUrlHPCore,
                body: updateDataBody,
                headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
            }, function (error, response) {
                if (error || !(response.statusCode === 201))
                    that.resendStats(conf.retryCoreComunicationTimeOut, 1);

            });
        } else callback(err);
    });
};

Corecomunication.prototype.resendStats = function (timeOut, ntimes) {

    var that = this;
    tokenIsValid(function (err) {
        if (!err) {
            var timeOutId = setTimeout(function () {

                var fullUrlHPCore = Parking.urlHandyParkingcore + '/parkings/' + Parking.myId;
                var bodyJson = {
                    stats: Parking.getStats()
                };
                var updateDataBody = JSON.stringify(bodyJson);

                request.put({ url: fullUrlHPCore,
                    body: updateDataBody,
                    headers: {'content-type': 'application/json', 'Authorization': "Bearer " + Parking.myToken}
                }, function (error, response) {
                    if (error || !(response.statusCode === 201))
                        if (ntimes <= 5) {
                            that.resendStats(2 * timeOut, ntimes + 1);
                        }
                });

            }, timeOut);

            //push Id in timeout queue
            that.timeOutQueue.push(timeOutId);
        } else callback(err);
    });
};

var instance = null;


function getCoreComunication() {

    if (!instance) {
        instance = new Corecomunication();
    }
    return instance;
}


module.exports.CoreComunication = getCoreComunication();
