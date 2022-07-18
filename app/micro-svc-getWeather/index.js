const express = require('express');
const request = require('request');
let app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());


//require('dotenv').config({ path: '../api_keys.env' })
const visualWeatherKey = process.env.VISUAL_WEATHER_KEY;

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
      request.get(visualWeatherUrl, (err, res, body) => {
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

// isMidNight - check if the time is midnight
function isMidNight(timestamp, callback){
  let date = new Date(timestamp*1000);
  return callback(date.getHours() == 0 && date.getMinutes() == 0);
}

app.get('/', function(req, res){
  let lat = req.query.lat; //get the lat
  let lon = req.query.lon; //get the lon
  let time = parseInt(req.query.time); //get the time
  getWeather(lat, lon, time, (weather) => { //get the weather of the location
    if(weather === undefined){ //if the weather is undefined
      res.json(
        {
          weather: null
        }); //null the weather
    }else{
      console.log(weather)
      res.json(
        {
          weather: weather
        }); //callback the weather
    }
  }
  );
});

app.listen(80, function(){
  console.log("microservice-getWeather running on port 80");
});