const express = require('express');
const path = require('path');
const app = express();
const session = require("express-session");
let router = require("./router");

const  flash=require("connect-flash");
const MongoStore = require("connect-mongo");


app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(
    session({
        secret: "Seree6969",
        store: MongoStore.create({ mongoUrl: process.env.CONNECT_STRING,
        dbName: "MagnusKS",
        collectionName: "session",
        }),
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
    })
);
app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "ejs");
app.use(flash());

app.use(function (req, res, next) {
  res.locals.success = req.flash("success") || [];
  res.locals.errors = req.flash("errors") || [];
  res.locals.user = req.session.user || null;
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use("/",router);

module.exports= app;