var express = require('express');
const req = require('request');

// npm install body-parser
var bodyParser = require("body-parser");
const { get } = require('request');
const { urlshortener } = require('googleapis/build/src/apis/urlshortener');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));

let visualWeatherKey;


app.get('/api/v1/weatherEvents', function(req, res) {
    //let variabili = req.query;
    //let location = variabili.location;
    //let date = variabili.date;


    getLatLong(req.query.location, ([lat, lon]) => {
        getEvents(lat, lon, req.query.date, (body) => {
            console.log (body.results.map((event) => {
                getWeather(lat, lon, toTimestamp(event.start), (weather) => {
                    return {
                        event: event,
                        weather: weather
                    }
                })
            }))
        }) 
    });

});

function getEvents(lat, lon, date, callback) {
    console.log("AAAAAAAAAAAAAA");
    console.log(lat);
    console.log(lon);
    req.get({

        url:''+`https://api.predicthq.com/v1/events/?end.origin=${date}&location_around.origin=${lat}%2C${lon}&start_around.origin=${date}`+'',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer '
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
    var datum = Date.parse(strDate);
    return datum/1000;
  }


  function farhenheitToCelsius(farhenheit){ //convert farhenheit to celsius
    return (farhenheit - 32) * 5/9; 
  }
  
  function isMidNight(timestamp){ //check if the timestamp is at midnight
    let date = new Date(timestamp*1000);
    return date.getHours() == 0 && date.getMinutes() == 0;
  }


app.listen(8889);