////////////////////REQUIREMENTS////////////////////
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const request = require('request');
const {Console} = require('console');
const express = require('express');
const cookieParser = require('cookie-parser');
const { container } = require('googleapis/build/src/apis/container');
let app = express();
app.use(cookieParser());
app.set('view engine', 'pug');
app.set('views', './views');

////////////////////API KEYS////////////////////
//require('dotenv').config({ path: '../api_keys.env' })

// credentials - get the credentials from the environment variables
const predict_key = process.env.PREDICT_KEY;
////////////////////CONSTANTS////////////////////

// Max days to add to the date
const MAX_ADD_DAYS = 6;

////////////////////FUNCTIONS////////////////////
// toTimestamp - convert a date to a timestamp
function toTimestamp(strDate){ //convert date to timestamp
  var datum = Date.parse(strDate);
  return datum/1000;
}




////////////////////API FUNCTIONS////////////////////
function getPublicEvents(lat, lon, date, callback,category = "") {
  request.get(
    {
      url:''+`https://api.predicthq.com/v1/events/?end.lte=${date}&within=40km@${lat},${lon}&start.gte=${date}${category}`+'',
      headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer '+ predict_key
      }
    }, (err, res, body) => { //get the lat and lon of the location
    
    if (err){
      return console.log(err); //if there is an error

    }else{
      //console.log(JSON.parse(body)); //parse the json
      callback (JSON.parse(body))

  }

})
}

function apiWeatherEvents(req,res,category =""){
  console.log("Getting weather events...");
  if(req.query.location === undefined){
    res.json({});
  }else{
    var counter = 0;
    console.log(req.query.location)
    request.get(`http://latlonservice.default.svc.cluster.local:80?location=${req.query.location}`,  (err_coord, res_coord, body_coord)=> {   
      let lat = (JSON.parse(body_coord)).lat;
      let lon = (JSON.parse(body_coord)).lon;
      if(lat && lon){
        getPublicEvents(lat, lon, req.query.date,  (body) => {
          console.log(body);
          if(body.results.length > 0){
            body.results.map((event,i) => {
              request.get(`http://weatherservice.default.svc.cluster.local:80?lat=${lat}&lon=${lon}&time=${toTimestamp(event.start)}`, (err_weather, res_weather, body_weather) => {
                let weather = JSON.parse(body_weather).weather;
                  if(weather != null){
                    let hour = (new Date(event.start)).getHours();
                    body.results[i].weather = weather.days[0].hours[hour]; //add the weather data to the event
                  }
                  if(++counter === body.results.length){ //if all the events have been processed
                    if(req.query.maxtemperature && req.query.mintemperature){ //if the max and min temperature are requested
                      res.json((body.results).filter((n)=> n.weather.temp <= req.query.maxtemperature && n.weather.temp >= req.query.mintemperature)); 
                    }else if(req.query.mintemperature){
                      res.json((body.results).filter((n)=> n.weather.temp >= req.query.mintemperature)); 
                    }else if(req.query.maxtemperature){   
                      res.json((body.results).filter((n)=> n.weather.temp <= req.query.maxtemperature)); 
                    }else{
                      res.json(body.results);
                    }
                    console.log("All events processed"); //print all events processed
                  }
                  
                });
            });
          }else{
            res.json({});
          }
        },category);
      }else{ //if there is no location
        res.json({error: "No location found"});
      }
    });
  }
}


////////////////////END FUNCTIONS////////////////////


////////////////////API CALLS////////////////////
app.get('/api/v1/weatherEvents', function(req, res) {
  apiWeatherEvents(req,res);
});
app.get('/api/v1/weatherEvents/concerts', function(req, res) {
  apiWeatherEvents(req,res,"&category=concerts");
});
app.get('/api/v1/weatherEvents/sports', function(req, res) {
  apiWeatherEvents(req,res,"&category=sports");
});
app.get('/api/v1/weatherEvents/community', function(req, res) {
  apiWeatherEvents(req,res,"&category=community");
});
app.listen(80, function(){
    console.log("Service-api running on port 80");
  });
////////////////////END MAIN////////////////////

