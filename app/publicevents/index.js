var express = require('express');
const req = require('request');

// npm install body-parser
var bodyParser = require("body-parser");
const { get } = require('request');
const { urlshortener } = require('googleapis/build/src/apis/urlshortener');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));

////////////////////API KEYS////////////////////
require('dotenv').config({ path: '../api_keys.env' })
let visualWeatherKey = process.env.VISUAL_WEATHER_KEY;
let PREDICT_KEY = process.env.PREDICT_KEY;


/////////////////////FUNCTIONS////////////////////
function apiWeatherEvents(req,res,category =""){
  if(req.query.location === undefined){
    res.json({});
  }else{
    var counter = 0;
    getLatLong(req.query.location, ([lat, lon]) => {
        getEvents(lat, lon, req.query.date,  (body) => {
            console.log(body)
            if(body.results.length > 0){
              
              body.results.map((event,i) => {
                
                  getWeather(lat, lon, toTimestamp(event.start), (weather) => {
                    
                    if(weather != null){
                      let hour = (new Date(event.start)).getHours()
                      console.log(hour)
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
                    
                  })
              })
            }else{
              res.json({});
            }
        },category);
    });
  }
}

function getEvents(lat, lon, date, callback,category = "") {
    req.get(
      {
        url:''+`https://api.predicthq.com/v1/events/?end.lte=${date}&within=40km@${lat},${lon}&start.gte=${date}${category}`+'',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer '+ PREDICT_KEY
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

function getLatLong(location, callback){
    if(location === undefined) return null;
    let location_utf8 = location.toString("utf8"); //convert to utf8
    
    req.get(`http://nominatim.openstreetmap.org/search?format=json&q=${location_utf8}`, (err, res, body) => { //get the lat and lon of the location
      if (err){
        return console.log(err); //if there is an error
  
      }else{
        data = JSON.parse(body); //parse the json
        if(data.length > 0){ //location is found
          let lat = JSON.parse(body)[0].lat; //get the lat
          let lon = JSON.parse(body)[0].lon; //get the lon
          return callback([lat, lon]); //callback the lat and lon
  
        }else{ //location is not found
          let splittato = location_utf8.split(/,/g); //split the location
          if(splittato.length > 3){ //if the location is splitted
            splittato.shift(); //remove the first element
            return getLatLong(splittato.toString("utf8"), callback); //get the lat and lon of the second part of the location
  
          }else{ //if the location is not splitted
            console.log("Location not found for the event with location: "+location); //print the location not found
            return callback([null,null]); //callback null
          }
  
        }
      }
  
    });
}

// getWeather - get the weather of the event location by using the lat and lon
function getWeather(lat, lon, time, callback){
  if(lat == null|| lon == null) return callback(null); //if the lat or lon is undefined
  else{
    console.log("Getting weather for: "+lat+" "+lon+" "+time+"...");
    isMidNight(time,(mezzanotte) => {
      if(mezzanotte) time = time + 1;
      //let visualWeatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${time}?key=${visualWeatherKey}&unitGroup=metric&include=current`;
      let visualWeatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${time}?key=${visualWeatherKey}&unitGroup=metric`;
      //console.log(visualWeatherUrl);
      req.get(visualWeatherUrl, (err, res, body) => {
        if (err) return console.log(err);
        else{
          data = JSON.parse(body);
          //console.log(data);
          callback(data);
        }
      });
    });
  }
}

function toTimestamp(strDate){ //convert date to timestamp
  var date = new Date(strDate);
  return date.getTime()/1000 + date.getTimezoneOffset()*60;
}

function farhenheitToCelsius(farhenheit){ //convert farhenheit to celsius
  return (farhenheit - 32) * 5/9; 
}

function isMidNight(timestamp, callback){
  let date = new Date(timestamp*1000);
  return callback(date.getHours() == 0 && date.getMinutes() == 0);
}

/////////////////////API CALLS////////////////////

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

app.listen(80);