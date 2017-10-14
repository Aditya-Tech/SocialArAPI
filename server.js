var express = require('express'),
  app = express(),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  mongodb = require("mongodb"),
  ObjectID = mongodb.ObjectID,
  db,
  path = require('path');


app.use(cors());

const MongoClient = require('mongodb').MongoClient

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

MongoClient.connect("mongodb://aditya:aditya@ds121015.mlab.com:21015/ar", function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = database;
  console.log("Database connection ready");

  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}


app.get("/", function(req, res) {

  db.collection("ar").find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get data.");
    } else {
      res.status(200).json(docs);
    }
  });
})


app.get("/:lat/:lon", function(req, res) {
  //console.log(db.collection("ar").find())
    if (db.collection("ar").find({"latitude": req.params.lat, 'longitude': req.params.lon}).count() == 0) {
      console.log("LOCATION DOESN'T EXIST IN DATABASE.")
      res.status(400).send("LOCATION DOESN'T EXIST IN DATABASE.")
    } else {
      // console.log(db.collection("ar").find({"latitude": req.params.lat, 'longitude': req.params.lon}).toArray());
      // res.status(200).send(db.collection("ar").find({"latitude": req.params.lat, 'longitude': req.params.lon}).toArray());
      // console.log(JSON.stringify(db.collection("ar").find()));
      // res.status(200).send(db.collection("ar").find());
    }
    console.log("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam")
    res.status(400).send("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam")

})

app.post("/addNewLocation/:lat/:lon", function(req, res) {
  var lat = Math.round(req.params.lat / 10000) * 10000
  var lon = Math.round(req.params.lon / 10000) * 10000
  console.log("Latitude: " + lat)
  console.log("Longitude: " + lon)

  if((!req.body.username || typeof req.body.username != "string") || (!req.body.textpost || typeof req.body.textpost != "string")) {
    res.status(400).send("400 Bad Request")
  }

  var body = {
    "latitude" : lat,
    "longitude" : lon,
    "posts" : [
      {
        "username" : req.body.username,
        "text" : req.body.textpost
      }
    ]
  }
    

  db.collection("ar").insertOne(body, function(err) {
    if (err) {
      console.log("Error adding new post! " + err);
      process.exit(1);
    }
    console.log(body);
  });       
});


app.get("/getNearest/:lat/:lon", function(req, res) {




})
