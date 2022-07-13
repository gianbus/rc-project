////////////////////REQUIREMENTS////////////////////
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const req = require('request');
const {Console} = require('console');
const express = require('express');
const { container } = require('googleapis/build/src/apis/container');
let app = express();

////////////////////API KEYS////////////////////
require('dotenv').config({ path: 'api_keys.env' })
let visualWeatherKey = process.env.VISUAL_WEATHER_KEY;

////////////////////CONSTANTS////////////////////
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = 'token.json';
// Max days to add to the date
const MAX_ADD_DAYS = 7;

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
        return null;
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
  console.log("Getting weather for: "+lat+" "+lon+" "+time+"...");
  if(isMidNight(time)){ //if the event is at midnight add one second
    time = time + 1;
  }
  let visualWeatherUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${time}?key=${visualWeatherKey}&include=current`;
  req.get(visualWeatherUrl, (err, res, body) => {
    if (err) return console.log(err);
    else{
      data = JSON.parse(body);
      callback(data);
    }
  });
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

// getEvents - 
function getEvents(auth, callback) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    timeMax: addDays(new Date(), MAX_ADD_DAYS).toISOString(), //get the next 7 days
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    callback(res.data.items);
  })
}

//get the events and link the weather to them
function linkWeatherToEvents(events){
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

            let temp = Math.round(farhenheitToCelsius(parseInt(data.currentConditions.temp))*10)/10; //convert to celsius and round to 1 decimal place
            events[i].weather = data.currentConditions; //add the weather data to the event
            console.log(counter); //print the counter
          
            if(++counter ===events.length){ //if all the events have been processed
              console.log(events); //print the events
              console.log("All events processed"); //print all events processed
            }

          }); //get weather data

        }); //get lat and lon

      }else{ //if there is no location
        console.log(`${i} - ${start} - ${event.summary} - No location`); //print the event without location
        console.log(counter); //print the counter

        if(++counter === events.length){ //if all the events have been processed
          console.log(events); //print the events
          console.log("All events processed"); //print all events processed
        }
      }

    }); //for each event

  }else{
    console.log('No upcoming events found in next 7 days.'); //print no events found, for testing
  }

  

}

////////////////////OAUTH FUNCTIONS////////////////////
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    //if there is not a stored token, get the access token
    if (err) return getAccessToken(oAuth2Client, callback); 
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, linkWeatherToEvents);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

 module.exports = { 
  SCOPES,
  getEvents,
};

////////////////////END OAUTH////////////////////

////////////////////END FUNCTIONS////////////////////

fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), getEvents);
});


app.get('/', function(req, res){ //index page
  res.send("Hello World!");
});

app.get('/login', function(req, res){ //login page
  res.send("Login Page");
});

app.listen(80, function(){
  console.log("Server running on port 80");
});


