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
//require('dotenv').config({ path: 'api_keys.env' })
const visualWeatherKey = process.env.VISUAL_WEATHER_KEY;
// credentials - get the credentials from the environment variables
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uris = [process.env.REDIRECT_URIS];
const predict_key = process.env.PREDICT_KEY;
////////////////////CONSTANTS////////////////////
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// Max days to add to the date
const MAX_ADD_DAYS = 6;

////////////////////FUNCTIONS////////////////////
// getLatLong - get the latitude and longitude of the event location
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

// isMidNight - check if the time is midnight
function isMidNight(timestamp, callback){
  let date = new Date(timestamp*1000);
  return callback(date.getHours() == 0 && date.getMinutes() == 0);
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
              let temp = ((data.currentConditions.temp)*10)/10; // get the temperature in celsius (round to 1 decimal)
              let hour = event.start.date?0:(new Date(start)).getHours()

              
              events[i].weather = data.days[0].hours[hour]; //add the weather data to the event
              events[i].weather.lat = lat;
              events[i].weather.lon = lon;
              
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
          res.render('index', { events }); //send the events to the client
          console.log("All events processed"); //print all events processed
        }
      }

    }); //for each event

  }else{ //if there are no events
    let events = []
    res.render('index', { events });
    console.log('No upcoming events found in next 7 days.'); //print no events found, for testing
  }

}
////////////////////API FUNCTIONS////////////////////
function getPublicEvents(lat, lon, date, callback,category = "") {
  req.get(
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
  if(req.query.location === undefined){
    res.json({});
  }else{
    var counter = 0;
    getLatLong(req.query.location, ([lat, lon]) => {
        getPublicEvents(lat, lon, req.query.date,  (body) => {
            if(body.results.length > 0){
              body.results.map((event,i) => {
                  getWeather(lat, lon, toTimestamp(event.start), (weather) => {
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
                    
                  })
              })
            }else{
              res.json({});
            }
        },category);
    });
  }
}

////////////////////OAUTH FUNCTIONS////////////////////
function authorize(req, res, callback) {
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  if(req.cookies.cookieToken === undefined){
    //console.log("non esiste cookie");
    return getAccessToken(res, oAuth2Client, callback); //get the access token
  }else{
    // yes, cookie was already present 
    //console.log('cookie exists', req.cookies.cookieToken);
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
        //console.log('cookieToken created successfully');
        res.redirect('/');
      });
    }
    

  }else{
    authorize(req, res, getEvents);
  }

});


app.get('/logout', function(req, res){ //index page
  //console.log(req.cookies);
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
  getWeather(req.query.lat, req.query.lon, parseInt(req.query.time), (data) => {
    res.json(data.days[0].hours[(new Date(parseInt(req.query.time*1000))).getHours()]);
  });
});


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
  console.log("Server running on port 80");
});

////////////////////END MAIN////////////////////

