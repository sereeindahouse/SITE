const e = require("connect-flash");
let User = require("../models/User");
let Post = require("../models/Post");

exports.checkLogin = function(req, res, next) {
    console.log("checkLogin - req.session.user:", req.session ? req.session.user : "no session");
    if (req.session && req.session.user) {
        return next();
    } else {
        req.flash("errors", "Та энэ үйлдлийг хийхийн тулд нэвтэрсэн байх шаардлагатай.");
        req.session.save(function() {
            res.redirect("/");
        });
    }
};

exports.logout= function(req, res) {
    req.session.destroy(function() {
        res.redirect("/");
    });

};


exports.home = async function(req,res){
    if(req.session.user){
        try {
            // fetch feed posts (exclude my own for now)
            const posts = await Post.feed({ excludeUser: req.session.user.username, limit: 25 });
            res.render("home-dashboard", { username: req.session.user.username, user: req.session.user, posts });
            return;
        } catch (e) {
            console.error("home feed error:", e);
            res.render("home-dashboard", { username: req.session.user.username, user: req.session.user, posts: [] });
            return;
        }
    }
    // for guests rely on res.locals.errors (set in app.js middleware) and res.locals.user
    res.render("home-guest");
};
exports.login = function(req,res){
    let user = new User(req.body);
    user.login().then(function(){
        console.log("login successful - user:", user.data);
        // store useful info in session
        req.session.user = {
            _id: user.data._id || user.data.id || null,
            username: user.data.username || null
        };
        req.session.save(function(){
            res.redirect("/");
        });
    }).catch(function(errors){
        // ensure errors is an array for the view
        if (!Array.isArray(errors)) errors = [errors];
        req.flash("errors", errors);
        req.session.save(function(){
            res.redirect("/");
        });
    });
};



exports.register = function(req,res){
let user= new User(req.body);
user.register().then(()=>{
    req.session.user= {username: user.data.username};
    req.session.save(function(){
    res.redirect("/");
    }); 
}).catch((errors)=>{
    req.flash("errors", errors);
    req.session.save(function(){
    res.redirect("/");
    });
});

};
 
exports.ifUserExists = function(req, res, next) {
    User.findByUsername(req.params.username).then(function(userDocument) {
      if (userDocument) {   
        req.profileUser = userDocument; // store user document in req object for later use
        next();
        } else {
        res.render("404");
        }
    }).catch(function() {
        res.render("404");
    });
    };
    exports.sharedProfileData = async function(req, res, next) {
        let isVisitorsProfile = false;
        if (req.session.user && req.profileUser && req.profileUser._id) {
            try {
                isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
            } catch (_) {
                isVisitorsProfile = false;
            }
        }
        req.isVisitorsProfile = isVisitorsProfile;
        req.isFollowing = false; // Following system not implemented

        // retrieve count of posts only (followers/following not implemented)
        try {
            const posts = await Post.findByAuthor(req.profileUser.username);
            req.postCount = Array.isArray(posts) ? posts.length : 0;
        } catch (_) {
            req.postCount = 0;
        }
        req.followerCount = 0;
        req.followingCount = 0;
        next();
    };
    exports.viewProfile = function(req, res) {
        res.render("profile", {
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isVisitorsProfile: req.isVisitorsProfile,
            isFollowing: req.isFollowing,
            counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount }
        });
    };
    exports.profilePostsScreen = async function(req, res) {
        try {
            const own = await Post.findByAuthor(req.profileUser.username);
            let incoming = [];
            try {
                incoming = await Post.findSharesToUser(req.profileUser.username);
            } catch (_) {}
            const all = [...own, ...incoming];
            // sort by created/shared date descending
            all.sort((a,b) => {
                const da = a.shared && a.shared.sharedDate ? new Date(a.shared.sharedDate) : new Date(a.createdDate || 0);
                const db = b.shared && b.shared.sharedDate ? new Date(b.shared.sharedDate) : new Date(b.createdDate || 0);
                return db - da;
            });
            res.render("profile-posts", { posts: all, profileUsername: req.profileUser.username, user: req.session.user || null });
        } catch (e) {
            console.error("profilePostsScreen error:", e);
            res.render("404");
        }
    };

