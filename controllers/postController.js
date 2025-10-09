const Post = require("../models/Post");

exports.viewCreatePost = function(req, res) {
    // pass the logged-in user so header and view can use it
    res.render("create-post", { user: req.session.user });
};

exports.createPost = function(req, res) {
    if (!req.session || !req.session.user) {
      req.flash("errors", "Та нэвтэрсэн байх шаардлагатай.");
      req.session.save(() => res.redirect("/"));
      return;
    }

    // pass username as author to the model
    let post = new Post(req.body, req.session.user.username);
    post.create().then(function(newId) {
        req.flash("success", "Амжилттай шинэ пост үүсгэлээ.");
        // simplified redirect (flash stored in session by connect-flash)
        return res.redirect("/");
    }).catch(function(errors) {
        req.flash("errors", errors);
        return res.redirect("/create-post");
    });
};

exports.viewSingle = async function(req, res) {
  try {
    let post = await Post.findSingleById(req.params.id);
    if (!post) {
      req.flash("errors", "Тухайн пост олдсонгүй.");
      return req.session.save(() => res.redirect("/"));
    }
    const username = req.session.user ? req.session.user.username : null;
    const isOwner = username && post.author === username;
    res.render("single-post", { post: post, user: req.session.user || null, isOwner, postId: post._id.toString() });
  } catch (e) {
    console.error("viewSingle error:", e);
    req.flash("errors", "Системийн алдаа. Дахин оролдоно уу.");
    return req.session.save(() => res.redirect("/"));
  }
};

// searchinn heseg
exports.search = async function(req, res) {
  try {
    const term = (req.query.term || req.body.term || "").toString().trim();
    if (!term) {
      req.flash("errors", "Хайх нэр оруулна уу.");
      return req.session.save(() => res.redirect("back"));
    }
    const posts = await Post.findByAuthor(term);
    res.render("search-results", { posts, searchTerm: term, user: req.session.user || null });
  } catch (e) {
    console.error("Search error:", e);
    req.flash("errors", "Системийн алдаа. Дахин оролдоно уу.");
    return req.session.save(() => res.redirect("/"));
  }
};

exports.viewEditScreen = async function(req, res) {
  try {
    const post = await Post.findSingleById(req.params.id);
    if (!post) {
      req.flash("errors", "Пост олдсонгүй.");
      return req.session.save(() => res.redirect("/"));
    }
    const username = req.session.user ? req.session.user.username : null;
    if (!username || post.author !== username) {
      req.flash("errors", "Зөвхөн өөрийнхөө постыг засварлах боломжтой.");
      return req.session.save(() => res.redirect(`/post/${post._id}`));
    }
    res.render("edit-post", { post, user: req.session.user, postId: post._id.toString() });
  } catch (e) {
    console.error("viewEditScreen error:", e);
    req.flash("errors", "Системийн алдаа. Дахин оролдоно уу.");
    return req.session.save(() => res.redirect("/"));
  }
};

exports.edit = async function(req, res) {
  try {
    const username = req.session.user ? req.session.user.username : null;
    const result = await Post.update(req.params.id, req.body, username);
    if (result.ok) {
      req.flash("success", "Пост амжилттай шинэчлэгдлээ.");
      return req.session.save(() => res.redirect(`/post/${req.params.id}`));
    }
    let message = "Засвар амжилтгүй.";
    if (result.reason === "forbidden") message = "Энэ постыг засварлах эрхгүй.";
    if (result.reason === "validation") message = result.errors && result.errors[0] ? result.errors[0] : message;
    if (result.reason === "not-found") message = "Пост олдсонгүй.";
    req.flash("errors", message);
    return req.session.save(() => res.redirect("back"));
  } catch (e) {
    console.error("edit error:", e);
    req.flash("errors", "Системийн алдаа.");
    return req.session.save(() => res.redirect("back"));
  }
};

exports.delete = async function(req, res) {
  try {
    const username = req.session.user ? req.session.user.username : null;
    const result = await Post.delete(req.params.id, username);
    if (result.ok) {
      req.flash("success", "Пост устгагдлаа.");
      return req.session.save(() => res.redirect("/"));
    }
    let message = "Устгал амжилтгүй.";
    if (result.reason === "forbidden") message = "Энэ постыг устгах эрхгүй.";
    if (result.reason === "not-found") message = "Пост олдсонгүй.";
    req.flash("errors", message);
    return req.session.save(() => res.redirect("back"));
  } catch (e) {
    console.error("delete error:", e);
    req.flash("errors", "Системийн алдаа.");
    return req.session.save(() => res.redirect("back"));
  }
};

// share (repost)
exports.share = async function(req, res) {
  try {
    const username = req.session.user ? req.session.user.username : null;
    if (!username) {
      req.flash("errors", "Нэвтэрч орно уу.");
      return req.session.save(() => res.redirect("/"));
    }
    const result = await Post.share(req.params.id, username);
    if (result.ok) {
      if (result.reason === "already") {
        req.flash("success", "Та аль хэдийн энэ постыг хуваалцсан.");
      } else {
        req.flash("success", "Пост амжилттай хуваалцлаа.");
      }
      return req.session.save(() => res.redirect("/profile/" + username + "/posts"));
    }
    let message = "Хуваалцах боломжгүй.";
    if (result.reason === "own-post") message = "Өөрийн постыг хуваалцах шаардлагагүй.";
    if (result.reason === "not-found") message = "Пост олдсонгүй.";
    req.flash("errors", message);
    return req.session.save(() => res.redirect("back"));
  } catch (e) {
    console.error("share error:", e);
    req.flash("errors", "Системийн алдаа.");
    return req.session.save(() => res.redirect("back"));
  }
};

// Share a post directly to a friend's profile
exports.shareToFriendProfile = async function(req, res) {
  try {
    const me = req.session.user && req.session.user.username;
    if (!me) {
      req.flash("errors", "Нэвтэрч орно уу.");
      return req.session.save(() => res.redirect("/"));
    }
    const friend = (req.body.friend || "").toString().trim();
    if (!friend) {
      req.flash("errors", "Найзын нэр оруулна уу.");
      return req.session.save(() => res.redirect("back"));
    }
    if (friend.toLowerCase() === me.toLowerCase()) {
      req.flash("errors", "Өөр дээрээ ингэж хуваалцах шаардлагагүй.");
      return req.session.save(() => res.redirect("back"));
    }
    const User = require("../models/User");
    const userDoc = await User.findByUsername(friend);
    if (!userDoc) {
      req.flash("errors", "Ийм хэрэглэгч олдсонгүй.");
      return req.session.save(() => res.redirect("back"));
    }
    const result = await Post.shareToFriendProfile(req.params.id, me, friend);
    if (result.ok) {
      if (result.reason === "already") {
        req.flash("success", "Өмнө нь энэ постыг түүний профайлд хуваалцсан байна.");
      } else {
        req.flash("success", "Постыг найзын профайл руу амжилттай илгээлээ.");
      }
      return req.session.save(() => res.redirect(`/profile/${friend}/posts`));
    }
    let message = "Хуваалцах боломжгүй.";
    if (result.reason === "friend-is-author") message = " өөрөө уг постын эх зохиогч.";
    if (result.reason === "not-found") message = "Пост олдсонгүй.";
    req.flash("errors", message);
    return req.session.save(() => res.redirect("back"));
  } catch (e) {
    console.error("shareToFriendProfile error:", e);
    req.flash("errors", "Системийн алдаа.");
    return req.session.save(() => res.redirect("back"));
  }
};

