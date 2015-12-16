var config = {

  dev:{
        dbHost:'localhost',
        dbPort:'27017',
        dbName:'hpARPDEVDB',
        //testIntegration: {"parking":"5493edaaa662cc10f2c59676", "car":"54b550360c60905d0b1eb777"},
        carDriverTestUser:{username:"client@pinco.it", password:"123"},
        parkingForTest:{
            description: 'description',
            location : {coordinates:[0,0], type: 'Point'},
            address: 'Parking Address',
            city: 'City Parking',
            pricePerHour: {second: {}, first: {}},
            days : [],
            hours :[],
            img:"http://handyparking.crs4.it/wp-content/uploads/2014/10/no_image_available.png",
            web:"http://handyparking.crs4.it",
            reservable : true,
            ltReservable : true,
            prices : {},
            lots: [],
            stats: {
                freeLots: 2,
                occupiedLots: 0,
                reservedLots: 0,
                notAvailableLots: 0
            },
            myUser : "parker@pinco.it",
            myPassword: "123",
            urlArpMiddleware: 'http://localhost:3002',
            urlHandyParkingcore: 'http://localhost:3000',
            admins: [],
            serverURL: 'http://localhost:3001',
            myId:null ,
            myToken:null,
            myTokenExpires:null,
            serverType: "ARP",
            validity: 30000
        },
        limit:50,
        skip:0,
        saveParkingFreq:10,
        retryCoreComunicationTimeOut:30000

  },

  production:{

        dbHost:'localhost',
        dbPort:'27017',
        dbName:'hpARPDB',
        //urlArpMiddleware: 'http://156.148.36.184:3002',
        //urlHandyParkingcore: 'http://156.148.36.184:3000',
        limit:50,
        skip:0,
        saveParkingFreq:10

  }


};
var conf;
if (process.env['NODE_ENV'] === 'dev') {
    conf = config.dev;
}
else{
    conf = config.production;
}

module.exports.conf = conf;
module.exports.generalConf = config;
