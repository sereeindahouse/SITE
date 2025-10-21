const express = require('express');
const router = express.Router();

let userController = require("./controllers/userController");
let postController = require("./controllers/postController");
let messagesController = require("./controllers/messagesController");
let groupController = require("./controllers/groupController");
let friendController = require("./controllers/friendController");
let securityController = require("./controllers/securityController");

// home
router.get("/", userController.home);

// auth
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/logout", userController.logout);
router.get('/forgot-password', securityController.forgotPasswordForm);
router.post('/forgot-password', securityController.forgotPasswordStart);
router.get('/reset-password', securityController.resetPasswordForm); // expects ?token=
router.post('/reset-password', securityController.resetPasswordFinish);

// create post
router.get('/create-post', (req, res) => {
  // if you require authentication, uncomment this check
  // if (!req.session.user) return res.redirect('/login');
  res.render('create-post');
});
router.post("/create-post", userController.checkLogin, postController.createPost);

// posts
router.get("/post/:id", postController.viewSingle);
// add this near other routes (above module.exports)
router.get("/post", function(req, res) {
  return res.redirect("/");
});

// edit/update/delete post
router.get("/post/:id/edit", userController.checkLogin, postController.viewEditScreen);
router.post("/post/:id/edit", userController.checkLogin, postController.edit);
router.post("/post/:id/delete", userController.checkLogin, postController.delete);

// share post (simple self profile share only)
router.post("/post/:id/share", userController.checkLogin, postController.share);
// share post to a friend's profile
router.post("/post/:id/share-to-friend-profile", userController.checkLogin, postController.shareToFriendProfile);

// user search for autocomplete (friend share)
router.get('/user-search', userController.checkLogin, async function(req, res) {
  try {
    const term = (req.query.term || '').toString().trim();
    if (!term) return res.json([]);
    const User = require('./models/User');
    const results = await User.searchByUsername(term, { limit: 10 });
    return res.json(results);
  } catch (e) {
    return res.json([]);
  }
});

// username existence check (AJAX)
router.post("/doesUsernameExist", async function (req, res) {
  try {
    const dbModule = require("./db");
    const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
    const userCollection = db.collection("users");
    const user = await userCollection.findOne({ username: req.body.username });
    res.json({ exists: !!user });
  } catch (e) {
    console.error("Error checking username:", e);
    res.status(500).json({ exists: false, error: "db" });
  }
});

// sign out (alternate)
router.post('/signout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.redirect('back');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// profile routes
router.get(
  "/profile/:username",
  userController.ifUserExists,
  userController.sharedProfileData,
  userController.viewProfile
);

router.get(
  "/profile/:username/posts",
  userController.ifUserExists,
  userController.sharedProfileData,
  userController.profilePostsScreen
);


router.get("/search", postController.search);

router.get("/messages", userController.checkLogin, messagesController.home);
router.get("/messages/:username", userController.checkLogin, messagesController.viewConversation);
router.post("/messages/:username", userController.checkLogin, messagesController.send);

// groups
router.get('/groups', userController.checkLogin, groupController.list);
router.post('/groups', userController.checkLogin, groupController.create);
router.get('/groups/:id', userController.checkLogin, groupController.view);
router.post('/groups/:id/join', userController.checkLogin, groupController.join);
router.post('/groups/:id/leave', userController.checkLogin, groupController.leave);
router.post('/groups/:id/kick/:username', userController.checkLogin, groupController.kick);
router.post('/groups/:id/approve/:username', userController.checkLogin, groupController.approve);
router.post('/groups/:id/reject/:username', userController.checkLogin, groupController.reject);
router.post('/groups/:id/share', userController.checkLogin, groupController.sharePost);
router.post('/groups/share', userController.checkLogin, groupController.sharePost);
router.post('/groups/:id/create-post', userController.checkLogin, groupController.createPost);
router.post('/groups/:id/like/:gpid', userController.checkLogin, groupController.like);
router.post('/groups/:id/unlike/:gpid', userController.checkLogin, groupController.unlike);

// friends
router.post('/friend/request/:username', userController.checkLogin, friendController.request);
router.post('/friend/accept/:username', userController.checkLogin, friendController.accept);
router.post('/friend/decline/:username', userController.checkLogin, friendController.decline);
router.get('/profile/:username/friends', userController.checkLogin, friendController.friendsList);

// settings
router.get('/settings', userController.checkLogin, userController.settingsPage);
router.post('/settings/password', userController.checkLogin, userController.changePassword);

module.exports = router;