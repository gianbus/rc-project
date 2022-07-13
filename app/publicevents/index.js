var express = require('express');
const req = require('request');

// npm install body-parser
var bodyParser = require("body-parser");
const { get } = require('request');
const { urlshortener } = require('googleapis/build/src/apis/urlshortener');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));

let visualWeatherKey = 'f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8'; //get the visual weather key


function apiWeatherEvents(req,res,category =""){
  var counter = 0;
  getLatLong(req.query.location, ([lat, lon]) => {
      getEvents(lat, lon, req.query.date,  (body) => {
          if(body.results.length > 0){
            body.results.map((event) => {
                getWeather(lat, lon, toTimestamp(event.start), (weather) => {
                  /*if(req.query.temperature){
                    
                    if(weather.currentConditions.temp <= parseInt(req.query.temperature)){
                      event.weather = weather.currentConditions;
                      
                    }
                    else{
                      body.results.shift();
                      console.log("Event not added because the temperature is too high");
                      console.log(event)
                    }

                  }else{*/
                    event.weather = weather.currentConditions; //add the weather data to the event
                  
                  if(++counter ===body.results.length){ //if all the events have been processed
                    
                    res.json((body.results).filter((n)=> {
                            n.weather.temp <= parseInt(req.query.temperature);
                        }));
                    console.log("All events processed"); //print all events processed
                  }
                })
            })
          }
      },category);
  });
}

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
app.get('/api/v1/weatherEvents/underDeFresco', function(req, res) {
    apiWeatherEvents(req,res);
});


function getEvents(lat, lon, date, callback,category = "") {
    
    req.get(
      {
        url:''+`https://api.predicthq.com/v1/events/?end.lte=${date}&within=10km@${lat},${lon}&start.gte=${date}${category}`+'',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer '+'f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8'
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
            return null;
          }
  
        }
      }
  
    });
}


function getWeather(lat, lon, time, callback){
    console.log("Getting weather for: "+lat+" "+lon+" "+time+"...");
    if(isMidNight(time)){ //if the event is at midnight
      time = time + 1; //add one second 
    }
    let visualWeatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${time}?key=${visualWeatherKey}&include=current`;
    return req.get(visualWeatherUrl, (err, res, body) => {
      if (err) return console.log(err);
      else{
        data = JSON.parse(body);
        return callback(data);
      }
    });
  }




  function toTimestamp(strDate){ //convert date to timestamp
    var date = new Date(strDate);
    return date.getTime()/1000 + date.getTimezoneOffset()*60;
  }


  function farhenheitToCelsius(farhenheit){ //convert farhenheit to celsius
    return (farhenheit - 32) * 5/9; 
  }
  
  function isMidNight(timestamp){ //check if the timestamp is at midnight
    let date = new Date(timestamp*1000);
    return date.getHours() == 0 && date.getMinutes() == 0;
  }


app.listen(8889);