var express = require('express'),
  app = express(),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  mongodb = require("mongodb"),
  ObjectID = mongodb.ObjectID,
  db,
  path = require('path'),
  Jimp = require("jimp"),
  request = require('request'),
  cheerio = require('cheerio'),
  base64Img = require('base64-img')


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

app.post("/createTopic/:lat/:lon/", function(req, res) {
  var url = "https://hackgt-api.ncrcloud.com/messaging/pubsub-topics"
  var lat = Math.round(req.params.lat * 1000) / 1000 
  var lon = Math.round(req.params.lon * 1000) / 1000

  request.post({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic dXNlclNhbXBsZTpQYXNzd29yZDEyIw==',
      'Host': 'nep-gateway.swenglabs.ncr.com',
      'nep-application-key': '8a808f0d515f1f1001515f1fdc010002',
      'nep-correlation-id': ' 24qefhpqu9h3ro2gr'
    },
    url: url,
    json: {"name": req.body.bus, "description": req.body.description, "journalEntryTypeId": {"name": "GATEWAY_SERVICE_POLICY_NOTIFICATION"}, "logPayload": true}
  }, function(error, response, body) {

    db.collection("ar").find({
      "latitude" : lat,
      "longitude" : lon
    }).count().then(function(num) {
      if (num > 0) {
        db.collection("ar").update({"latitude": lat, "longitude": lon}, {$addToSet: { 
        "topics": {
          "specific-latitude" : req.params.lat,
          "specific-longitude" : req.params.lon,
          "topic" : req.body.bus,
          "description" : req.body.description,
          "time" : new Date()
        }}})

        res.status(200).send("New topic added!")

      } else {
        if((!req.body.bus || typeof req.body.bus != "string") || (!req.body.description || typeof req.body.description != "string")) {
          res.status(400).send("400 Bad Request")
        }

        var toPost = {
          "latitude" : lat,
          "longitude" : lon,
          "posts" : [],
          "topics" : [{
            "specific-latitude" : req.params.lat,
            "specific-longitude" : req.params.lon,
            "business" : req.body.bus,
            "description" : req.body.description,
            "time" : new Date()
          }]
        }
     
        db.collection("ar").insertOne(toPost, function(err) {
          if (err) {
            console.log("Error adding new post! " + err);
            process.exit(1)
          }
          console.log(toPost)
          res.status(200).send("New topic added!")
        })
      }
    })
  })

})

// app.get("/getBusinesses/:lat/:lon", function(req, res) {
//   var lat = Math.round(req.params.lat * 1000) / 1000 
//   var lon = Math.round(req.params.lon * 1000) / 1000
//   request.get({
//     headers: {
//       'Authorization': 'Basic dXNlclNhbXBsZTpQYXNzd29yZDEyIw==',
//       'Host': 'nep-gateway.swenglabs.ncr.com',
//       'nep-application-key': '8a808f0d515f1f1001515f1fdc010002',
//       'nep-correlation-id': ' 24qefhpqu9h3ro2gr'
//     },
//     url: url,
//   }, function(error, response, body) {
//     db.collection("ar").find({
//       "latitude" : lat,
//       "longitude" : lon
//     }).toArray().then(function(arr) {
      
//     })
//   }
  
// })


app.get("/nearestJobs/:zip", function(req, res) {
  var imgURLS = [];
  var titles = [];
  var companies = [];
  var urls = [];
  var all = [];
  var url = "https://www.dice.com/jobs/sort-distance-pc-true-l-" + req.params.zip + "-radius-5-jobs"
  request(url, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(html);
      var j, k, m, n = 0;

      $('img').attr('onerror', 'errorImg(this)').each(function(i, element) {
        if (i > 0 && i < 6) {
          console.log(i)
          console.log("https://" + $(this).prop('src').replace("//", ""))
          imgURLS.push("https://" + $(this).prop('src').replace("//", ""))

          console.log($(this).prop('alt'))
          companies.push($(this).prop('alt'))
        }
      })

      $('a[itemprop="url"]').each(function(i, element) {
        if (i < 5) {
          console.log(i)
          console.log("https://www.dice.com" + $(this).prop('href'))
          urls.push("https://www.dice.com" + $(this).prop('href'))

          console.log($(this).prop('title'))
          titles.push($(this).prop('title'))
        }
      });

      sendJobs(0, imgURLS, titles, companies, urls, all, res)
    

  }});
})

function sendJobs(cur, img, titles, comp, urls, all, toSend) {
  base64Img.requestBase64(img[cur], function(err, res, body) {
    console.log(img[cur])
    all.push({
      "company" : comp[cur],
      "jobTitle" : titles[cur],
      "url" : urls[cur],
      "image" : body.trim().replace("data:image/jpeg;base64,", "").replace("data:image/jpeg;base64", "").replace("data:image/png;base64,", "").split("base64,")[1]
    })
    if (cur < 4) {
      sendJobs(cur + 1, img, titles, comp, urls, all, toSend)
    } else {
      console.log(all)
      toSend.status(200).send(all);
    }
  });    
}



app.get("/getTopics/:lat/:lon", function(req, res) {
  var lat = Math.round(req.params.lat * 1000) / 1000 
  var lon = Math.round(req.params.lon * 1000) / 1000
  var url = "hackgt-api.ncrcloud.com/messaging/pubsub-topics"
  request({
    headers: {
      'Authorization': 'Basic dXNlclNhbXBsZTpQYXNzd29yZDEyIw==',
      'nep-application-key': '8a808f0d515f1f1001515f1fdc010002',
      'nep-correlation-id': 'messaging-example'
    },
    uri: url,
    method: 'GET'
  }, function (err, response, body) {
    db.collection("ar").find({
      "latitude" : lat,
      "longitude" : lon
    }).toArray().then(function(arr) {
      var encs = []
      var topics = arr[0].topics
      var len = topics.length;

      encodeTopics(res, 0, topics, encs)
    })
  });
})


app.get("/:lat/:lon", function(req, res) {
  var lat = Math.round(req.params.lat * 1000) / 1000 
  var lon = Math.round(req.params.lon * 1000) / 1000

  db.collection("ar").find({
    "latitude" : lat,
    "longitude" : lon
  }).toArray().then(function(arr) {
    var encs = []
    var posts = arr[0].posts
    var len = posts.length;
    var i = 0;

    encodePosts(res, 0, posts, encs)
  })
   
})


function encodeTopics(res, cur, topics, encs) {
  Jimp.read("./verified-bubble.png", function (err, image) {
        Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(function (font) {
          console.log(topics[cur])

        image.print(font, 30, 60, topics[cur].bus, 700);
        }).then(
          Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(function (font) {
          image.print(font, 30, 110, topics[cur].description, 700);
          image.getBase64(Jimp.MIME_PNG, function(err, enc) {
            console.log(enc.replace("data:image/png;base64,", "").trim())
            encs.push([topics[cur]['specific-latitude'], topics[cur]['specific-longitude'], enc.replace("data:image/png;base64,", "").trim()])

            if (cur == topics.length - 1) {
              res.status(200).send(encs);
            } else {
              encodeTopics(res, cur + 1, topics, encs)
            }
          });
        }))
      });
}

function encodePosts(res, cur, posts, encs) {
  Jimp.read("./img.png", function (err, image) {
        Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(function (font) {
          console.log(posts[cur])

        image.print(font, 30, 60, posts[cur].username, 700);
        }).then(
          Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(function (font) {
          image.print(font, 30, 110, posts[cur].textpost, 700);
          image.getBase64(Jimp.MIME_PNG, function(err, enc) {
            console.log(enc.replace("data:image/png;base64,", "").trim())
            encs.push([posts[cur]['specific-latitude'], posts[cur]['specific-longitude'], enc.replace("data:image/png;base64,", "").trim()])

            if (cur == posts.length - 1) {
              res.status(200).send(encs);
            } else {
              encodePosts(res, cur + 1, posts, encs)
            }
          });
        }))
      });
}

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
  var lat = Math.round(req.params.lat * 1000) / 1000 
  var lon = Math.round(req.params.lon * 1000) / 1000
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
        "specific-latitude" : req.params.lat,
        "specific-longitude" : req.params.lon,
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
              "specific-latitude" : req.params.lat,
              "specific-longitude" : req.params.lon,
              "username" : req.body.username,
              "textpost" : req.body.textpost,
              "time" : new Date()
            }
          ],
          "topics" : []
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
