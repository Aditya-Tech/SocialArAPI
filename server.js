var express = require('express'),
  app = express(),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  mongodb = require("mongodb"),
  ObjectID = mongodb.ObjectID,
  db,
  path = require('path'),
  Jimp = require("jimp")


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
  // var lat = Math.round(req.params.lat * 10000) / 10000 
  // var lon = Math.round(req.params.lon * 10000) / 10000

  // db.collection("ar").find({
  //   "latitude" : lat,
  //   "longitude" : lon
  // }).toArray().then(function(arr) {
  //   console.log(arr)
  // })

  var ret = {
    "posts" : [ 
      {
        "username" : "Aditya",
        "textpost" : "Hi!!!!"
      },
      {
        "username" : "Trevor",
        "textpost" : "Hell!!!"
      }
    ]
    
  }

  res.status(200).json(ret);

   
})


app.post("/getImage", function(req, res) {

  var username = req.body.username
  var text = req.body.textpost

  Jimp.read("./img.png", function (err, image) {
  Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(function (font) {
  image.print(font, 30, 60, username, 700);
  }).then(
    Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(function (font) {
    image.print(font, 30, 110, text, 700);
    image.getBase64(Jimp.MIME_PNG, function(err, enc) {
      console.log(enc.replace("data:image/png;base64,", "").trim())
      res.status(200).send(enc.replace("data:image/png;base64,", "").trim())
    });
  }))
});
})


app.post("/addNewLocation/:lat/:lon", function(req, res) {
  var lat = Math.round(req.params.lat * 10000) / 10000 
  var lon = Math.round(req.params.lon * 10000) / 10000
  // var lat = req.params.lat.toFixed(5)
  // var lon = req.params.lon.toFixed(5)
  console.log("Latitude: " + lat)
  console.log("Longitude: " + lon)


  db.collection("ar").find({
    "latitude" : lat,
    "longitude" : lon
  }).count().then(function(num) {
    if (num > 0) {
      console.log("Entry already exists! Updating data...")
      db.collection("ar").update({"latitude": lat, "longitude": lon}, {$addToSet: { 
      "posts": {
        "username" : req.body.username,
        "textpost" : req.body.textpost,
        "time" : new Date()
      }}})

      res.status(400).send("Entries updated!")

    } else {
        if((!req.body.username || typeof req.body.username != "string") || (!req.body.textpost || typeof req.body.textpost != "string")) {
          res.status(400).send("400 Bad Request")
        }

        var toPost = {
          "latitude" : lat,
          "longitude" : lon,
          "posts" : [
            {
              "username" : req.body.username,
              "textpost" : req.body.textpost,
              "time" : new Date()
            }
          ]
        }
     
        db.collection("ar").insertOne(toPost, function(err) {
          if (err) {
            console.log("Error adding new post! " + err);
            process.exit(1)
          }
          console.log(toPost)
          res.status(200).send("New entry added!")
        })
      }
  })        
})


app.get("/getNearest/:lat/:lon", function(req, res) {




})
