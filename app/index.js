////////////////////REQUIREMENTS////////////////////
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const req = require('request');
const {Console} = require('console');
const express = require('express');
const cookieParser = require('cookie-parser');
const { container } = require('googleapis/build/src/apis/container');
let app = express();
app.use(cookieParser());
app.set('view engine', 'pug');
app.set('views', './views');

////////////////////API KEYS////////////////////
require('dotenv').config({ path: 'api_keys.env' })
let visualWeatherKey = process.env.VISUAL_WEATHER_KEY;
// credentials - get the credentials from the token file
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uris = [process.env.REDIRECT_URIS];

////////////////////CONSTANTS////////////////////
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = 'token.json';
// Max days to add to the date
const MAX_ADD_DAYS = 6;

////////////////////FUNCTIONS////////////////////
// getLatLong - get the latitude and longitude of the event location
function getLatLong(location, callback){
  if(location === undefined) return null;
  let location_utf8 = location.toString("utf8"); //convert to utf8
  
  req.get(`http://nominatim.openstreetmap.org/search?format=json&q=${location_utf8}`, (err, res, body) => { //get the lat and lon of the location
    if (err) return console.log(err); //if there is an error
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

  });
}

// toTimestamp - convert a date to a timestamp
function toTimestamp(strDate){ //convert date to timestamp
  var datum = Date.parse(strDate);
  return datum/1000;
}

// getWeather - get the weather of the event location by using the lat and lon
function getWeather(lat, lon, time, callback){
  if(lat == null|| lon == null) return callback(null); //if the lat or lon is undefined
  else{
    console.log("Getting weather for: "+lat+" "+lon+" "+time+"...");
    if(isMidNight(time)){ //if the event is at midnight add one second
      time = time + 1;
    }
    let visualWeatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${time}?key=${visualWeatherKey}&include=current`;
    req.get(visualWeatherUrl, (err, res, body) => {
      if (err) return console.log(err);
      else{
        data = JSON.parse(body);
        console.log(lon);
        data.currentConditions.lon = lon;
        data.currentConditions.lat = lat;
        callback(data);
      }
    });
  }
}

// farhrenheitToCelsius - convert a temperature from fahrenheit to celsius
function farhenheitToCelsius(farhenheit){
  return (farhenheit - 32) * 5/9; 
}

// isMidNight - check if the time is midnight
function isMidNight(timestamp){
  let date = new Date(timestamp*1000);
  return date.getHours() == 0 && date.getMinutes() == 0;
}

// addDays - add days to a date and return the new date
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// getEvents - get the events from the calendar 
function getEvents(auth, callback, response) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    timeMax: addDays(new Date(), MAX_ADD_DAYS).toISOString(), //get the next 7 days
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    callback(response, res.data.items);
  })
}

//get the events and link the weather to them
function linkWeatherToEvents(res, events){
  //console.log(events); //print all the events, for testing
  var counter = 0;
  if(events.length){ //if there are events
    console.log('Upcoming events:');

    events.forEach((event, i) => { //for each event
      const start = event.start.dateTime || event.start.date;
      events[i].weather = {}; //add empty weather data to the event
      
      if(events[i].location !== undefined){ //if there is a location

        console.log(i + ` - ${start} - ${event.summary}`); //print the event Summary

        getLatLong(events[i].location, ([lat, lon]) => {
          
          getWeather(lat, lon, toTimestamp(start), (data) => {
            if(data != null){ //if the weather is found
              let temp = Math.round(farhenheitToCelsius(parseInt(data.currentConditions.temp))*10)/10; //convert to celsius and round to 1 decimal place
              events[i].weather = data.currentConditions; //add the weather data to the event
            }
          
            if(++counter ===events.length){ //if all the events have been processed
              console.log(events);
              res.render('index', { events }); //send the events to the client
              console.log("All events processed"); //print all events processed
            }

          }); //get weather data

        }); //get lat and lon

      }else{ //if there is no location
        console.log(`${i} - ${start} - ${event.summary} - No location`); //print the event without location

        if(++counter === events.length){ //if all the events have been processed
          console.log(events); //print the events
          console.log("All events processed"); //print all events processed
        }
      }

    }); //for each event

  }else{ //if there are no events
    console.log('No upcoming events found in next 7 days.'); //print no events found, for testing
  }

}

////////////////////OAUTH FUNCTIONS////////////////////
function authorize(req, res, callback) {
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  if(req.cookies.cookieToken === undefined){
    console.log("non esiste cookie");
    return getAccessToken(res, oAuth2Client, callback); //get the access token
  }else{
    // yes, cookie was already present 
    console.log('cookie exists', req.cookies.cookieToken);
    oAuth2Client.setCredentials(JSON.parse(req.cookies.cookieToken));
    callback(oAuth2Client, linkWeatherToEvents, res);
  }
}

// getAccessToken - get the access token
function getAccessToken(res, oAuth2Client, callback) {

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  res.send("<a href='" + authUrl + "'>Click here to authorize</a>");
}

module.exports = { 
  SCOPES,
  getEvents,
};

////////////////////END OAUTH////////////////////
////////////////////END FUNCTIONS////////////////////


////////////////////START MAIN////////////////////

app.get('/', function(req, res){ //index page
  console.log(req.cookies);
  
    
  if(req.query.code){ //if there is a code
    let oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    if(req.cookies.cookieToken !== undefined){ //if there is cookie
      authorize(req, res, getEvents);
    }else{
      oAuth2Client.getToken(req.query.code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        oAuth2Client.setCredentials(token);
        // no: set a new cookie
        res.cookie('cookieToken',JSON.stringify(token), { maxAge: 900000, httpOnly: true });
        console.log('cookieToken created successfully');
        res.redirect('/');
      });
    }
    

  }else{
    authorize(req, res, getEvents);
  }

});


app.get('/logout', function(req, res){ //index page
  console.log(req.cookies);
  res.clearCookie('cookieToken');
  res.redirect('/');
});

app.get('/test', function(req, res){ //index page
  res.render('index', { lacacca: 'cacca' });
});

app.get('/image', function(req, res){ //index page
  
  if(req.query.img)
    res.sendFile( __dirname + '/views/icons/'+ req.query.img + '.png');
});

app.get('/weather', function(req, res){ //index page
  getWeather(req.query.lat, req.query.lon, req.query.timestamp, (data) => {
    res.send(data);
  });
});

app.listen(80, function(){
  console.log("Server running on port 80");
});

////////////////////END MAIN////////////////////

