const express = require('express');
const req = require('request');
let app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());

function getLatLong(location,callback){
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
        callback([lat, lon]); //callback the lat and lon

      }else{ //location is not found
        let splittato = location_utf8.split(/,/g); //split the location
        if(splittato.length > 3){ //if the location is splitted
          splittato.shift(); //remove the first element
          return getLatLong(splittato.toString("utf8"), callback); //get the lat and lon of the second part of the location

        }else{ //if the location is not splitted
          console.log("Location not found for the event with location: "+location); //print the location not found
          callback([null,null]); //callback null
        }
      }
    }
  });
}

app.get('/', function(req, res){ //index page
  console.log(req.query)
  if(req.query.location === undefined){ //if the location is undefined
    res.json(
      {}); //null the lat and lon
  }else{
    let location = req.query.location; //get the location
    getLatLong(location, ([lat, lon]) => { //get the lat and lon of the location
      console.log(lat, lon)
      if(lat == null || lon == null){ //if the lat or lon is undefined
        res.json({}); //null the lat and lon
      }else{
        res.json(
          {
            lat: lat,
            lon: lon
          }); // the lat and lon
      }
    });
  }
});
    
app.listen(80, function(){
  console.log("microservice-getLatLon running on port 80");
});