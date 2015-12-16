
var request = require('request');
//var conf = require('../config').conf;
var Parking = require('./parking').ArpParking;





function Whitelist()
{
     this.addList =  [];
     this.removeList =  [];
     //this.that=this;

}


Whitelist.prototype.openDoor = function(carplate){
    var that=this;
    var whiteListUrl=Parking.urlArpMiddleware+'/carleaving/action/OpenByPulsanteSoftware';


   // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!URL:" + whiteListUrl);

    request.post({ url : whiteListUrl,
        headers: {'content-type': 'text/html'}
    }, function(error, response){

       // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!ERRRRR OPEN DOOOR:" + response.statusCode);

        if(!error && response.statusCode===201)
            console.log("Carplate " + carplate + " Can Exit" );
        else{
            setTimeout(function(){
                request.post({ url : whiteListUrl,
                    headers: {'content-type': 'text/html'}
                }, function(error, response){
                    if(!error && response.statusCode===201)
                        console.log("Carplate " + carplate + " Can Exit" );
                    else{
                        setTimeout(function(){
                            request.post({ url : whiteListUrl,
                                headers: {'content-type': 'text/html'}
                            }, function(error, response){
                                if(!error && response.statusCode===201)
                                    console.log("Carplate " + carplate + " Can Exit" );
                                else{
                                    console.log("Error: after 3 attemts ia not possible open the door. error:" + error + "/" + response.body);
                                    //console.log("Error: after 3 attemts ia not possible open the door. error:");
                                }
                            });
                        },1000);
                    }
                });
            },1000);
        }
    });
};

Whitelist.prototype.addCarplate = function(carplate){
    var that=this;
    var whiteListUrl=Parking.urlArpMiddleware+'/whitelist';

    var bodyJson = {

        carplate:carplate

    };
    var reservBody = JSON.stringify(bodyJson);



    request.post({ url : whiteListUrl,
        body : reservBody,
        headers: {'content-type': 'application/json'}
    }, function(error, response){
        if(!error && response.statusCode===201)
            console.log("Carplate " + carplate + " added in white list" );
        else{
            that.addList.push(carplate);
            that.resendLists(30000,1);
        }
    });
};


Whitelist.prototype.removeCarplate = function(carplate){
    var that=this;
    var whiteListUrl=Parking.urlArpMiddleware+'/whitelist';

    var bodyJson = {

        carplate:carplate

    };
    var reservBody = JSON.stringify(bodyJson);



    request.del({ url : whiteListUrl,
        body : reservBody,
        headers: {'content-type': 'application/json'}
    }, function(error, response){
        if(!error && response.statusCode===201)
            console.log("Carplate " + carplate + " added in white list" );
        else{
            that.removeList.push(carplate);
            that.resendLists(30000,1);
        }
    });
};



Whitelist.prototype.resendLists = function(timeOut,ntimes){

    var that=this;

    var bodyJson = {

        carplate:"nn"

    };
    var reservBody;

    setTimeout(function(){
        var sended=0;
        that.addList.every(function(val){

            bodyJson.carplate=val;
            reservBody = JSON.stringify(bodyJson);

            request.post({ url : Parking.urlArpMiddleware+"/whitelist",
                body : reservBody,
                headers: {'content-type': 'application/json'}
            }, function(error, response, body){
                if(!error && response.statusCode===201) {
                    console.log("Carplate " + carplate + " added in white list");
                    sended += 1;
                }else{
                    if(ntimes<=5) that.resendLists(2*timeOut,ntimes+1);
                    return false;
                }
            });
            //if(exit) break;
        });

        if(sended===that.addList.length)
            that.addList=[];
        else if(ntimes<=5) that.resendLists(2*timeOut,ntimes+1);

    },timeOut);

};

var instance = null;


function getWhiteList(){

    if(!instance){
        instance = new Whitelist();
    }
    return instance;
}


module.exports.WhiteList = getWhiteList();
