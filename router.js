const express = require('express');
const router = express.Router();

let userController = require("./controllers/userController");
let postController = require("./controllers/postController");
let messagesController = require("./controllers/messagesController");

// home
router.get("/", userController.home);

// auth
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/logout", userController.logout);

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
    const results = await User.reusableUserQuery([
      { $match: { username: { $regex: new RegExp('^' + term, 'i') } } },
      { $limit: 10 },
      { $project: { username: 1 } }
    ]);
    res.json(results.map(u => u.username));
  } catch (e) {
    res.json([]);
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

module.exports = router;