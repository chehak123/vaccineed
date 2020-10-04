require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
var Request = require("request");
const https = require('https');
const alert = require('alert');
const { userInfo } = require('os');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://abhishek_0504:9971749520a@cluster0-b6e9z.mongodb.net/vaccineuserDB", {useNewUrlParser: true , useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  name: String,
  age: Number,
  blood: String,
  address: String,
  aadhar: String,
  emergency: String,
  reason: String,
  disease: String,
  link: String,
  contact: Number,
  status: String
});

const stockSchema = new mongoose.Schema ({
  available: Number,
  need: Number,
  upcoming: Number
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
stockSchema.plugin(passportLocalMongoose);
stockSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Stock = new mongoose.model("Stock", stockSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID:"289206322346-6i0t5jt43tjff1et7cui5n2q10grk2bi.apps.googleusercontent.com",
    clientSecret: "KQiqmvY2aZ_T9lJ6vYhD2k6m",
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


let tempUser = {} ;

app.get("/", function(req, res){
  https.get("https://api.thevirustracker.com/free-api?countryTotal=IN" , function(response)
  {
  response.on("data" , function(data)
  {
      var apidata = JSON.parse(data);
      const deaths = apidata.countrydata[0].total_deaths;
      const treated = apidata.countrydata[0].total_recovered;
      const infected = apidata.countrydata[0].total_cases;
      const newcases = apidata.countrydata[0].total_new_cases_today;


      res.render("firstPage" , { deaths:deaths , treated:treated , infected:infected , newcases:newcases})
  })
  });
});

app.get("/userPannel", function(req, res){
  res.render("userPannel" , {userInfo : tempUser});
});

app.get("/user/:id", function(req, res){
  let reqUser = req.params.id;
  User.find( {_id : reqUser } , function(err , user){
    if(err) {
      console.log(err);
    }
    else{
      console.log(user);
      res.render("user" , {userInfo:user[0]});
    }
  })
});

app.get("/userInfo/:id", function(req, res){
  console.log(req.params.id);
  let reqUser = req.params.id;
  User.find( {_id : reqUser } , function(err , user){
    if(err) {
      console.log(err);
    }
    else{
      console.log(user);
      res.render("user" , {userInfo:user[0]});
    }
  })
});

app.get("/stock", function(req, res){

  let count = 0;

  User.find(function(err , users){
    if(err) {
      console.log(err);
    }
    else{
      console.log(users);
      users.forEach(function(user){
        count +=1;
      })
    }
  })

  Stock.find(function(err , stock){
    if(err) {
      console.log(err);
    }
    else{
      console.log(stock);

      if (req.isAuthenticated()){
        res.render("stock" , {stock:stock , need:count});
      } 
      else {
        alert("Oops! plz login.");
        res.redirect("/login"); 
      }
  }}
  )
});

app.get("/admin_list", function(req, res){
  User.find( {emergency : "yes" } , function(err , user){
    if(err) {
      console.log(err);
    }
    else{
      console.log(user);
      res.render("admin_list" , {users:user});
    }
  })
});

app.get("/users_list", function(req, res){

  User.find( { emergency: "no" } ,function(err , users){
    if(err) {
      console.log(err);
    }
    else{
      // console.log(users);
      if (req.isAuthenticated()){
        res.render("users_list" , {users:users});
      } else {
        alert("Oops! plz login.");
        res.redirect("/login");
      }
    }
  })
});

app.get("/admin", function(req, res){

  if (req.isAuthenticated()){
    res.render("admin");
  } else {
    alert("Oops! plz login.");
    res.redirect("/login");
  }
});


app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/button", function(req, res){
  console.log(req);
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/done/:id", function(req, res){
  const reqUserId = req.params.id;
  User.findOneAndUpdate( {_id : reqUserId } , {status : "done"} , function(err , user){
    if(err) {
      // console.log(err);
    }
    else{
      // console.log(user);
      // res.render("user" , {userInfo:user[0]});
    }
  })

  User.find( {emergency : "no"} ,function(err , users){
    if(err) {
      // console.log(err);
    }
    else{
      // console.log(users);
      res.render("users_list" , {users: users})
    }
  })
 // console.log(req.params.id);
 
});

app.get("/pending/:id", function(req, res){
  const reqUserId = req.params.id;
  User.findOneAndUpdate( {_id : reqUserId } , {status : "pending"} , function(err , user){
    if(err) {
      // console.log(err);
    }
    else{
      // console.log(user);
      // res.render("user" , {userInfo:user[0]});
    }
  })

  User.find( {emergency : "no"} ,function(err , users){
    if(err) {
      // console.log(err);
    }
    else{
      // console.log(users);
      res.render("users_list" , {users: users})
    }
  })
 // console.log(req.params.id);
 
});

app.get("/cancel/:id", function(req, res){
  const reqUserId = req.params.id;
  User.findOneAndDelete( {_id : reqUserId } ,function(err , user){
    if(err) {
      // console.log(err);
    }
    else{
      // console.log(user);
      // res.render("user" , {userInfo:user[0]});
    }
  })

  User.find({emergency : "no"} ,function(err , users){
    if(err) {
      // console.log(err);
    }
    else{
      // console.log(users);
      res.render("users_list" , {users: users})
    }
  })
 // console.log(req.params.id);
 
});


app.post("/register", function(req, res){

  console.log(req.body);

  let Ustatus = "pending";

  if(req.body.emergency === "yes")
  {
    Ustatus = "emergency"
  }

  User.register({
    username: req.body.username,
    name: req.body.name,
    age: req.body.Age,
    blood: req.body.blood_grp,
    address: req.body.address,
    aadhar: req.body.Adhaar_no,
    emergency: req.body.emergency,
    reason: req.body.reason,
    disease: req.body.disease,
    link: req.body.Signature,
    contact: req.body.contact,
    status: Ustatus,
    }, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
       res.render("userPannel" , {userInfo:user});
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  const email = req.body.username

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        if(req.body.username === "admin@123.com")
        {
          res.redirect("/admin")
        }
        else
        {
          User.find( {username : email } , function(err , user){
            if(err) {
              console.log(err);
            }
            else{
              console.log(user);
              tempUser = user[0];
              res.redirect("/userPannel");
            }
          })
        }
      });
    }
  });

});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started");
});

