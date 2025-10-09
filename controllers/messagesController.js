const Message = require("../models/Message");
const User = require("../models/User");

exports.inboxRedirect = function(req, res) {
  // Default chat target is 'sar' as requested
  return res.redirect("/messages/sar");
};

exports.home = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  if (!me) {
    req.flash("errors", "Нэвтрэх шаардлагатай.");
    return req.session.save(() => res.redirect("/"));
  }
  const q = (req.query.q || "").toString().trim();
  let results = [];
  if (q) {
    results = await User.searchByUsername(q, { limit: 20 });
    // exclude myself from results
    results = results.filter(u => u.toLowerCase() !== me.toLowerCase());
  }
  res.render("messages-home", { q, results, me, user: req.session.user });
};

exports.viewConversation = async function(req, res) {
  try {
    const me = req.session.user && req.session.user.username;
    const partner = req.params.username;
    if (!me) {
      req.flash("errors", "Нэвтэрч орно уу.");
      return req.session.save(() => res.redirect("/"));
    }
    const conversation = await Message.getConversation(me, partner);
    res.render("messages", { conversation, me, partner, user: req.session.user });
  } catch (e) {
    console.error("viewConversation error:", e);
    req.flash("errors", "Системийн алдаа.");
    return req.session.save(() => res.redirect("/"));
  }
};

exports.send = async function(req, res) {
  try {
    const me = req.session.user && req.session.user.username;
    const partner = req.params.username;
    const body = req.body.body;
    if (!me) {
      req.flash("errors", "Нэвтэрч орно уу.");
      return req.session.save(() => res.redirect("/"));
    }
    await Message.send(me, partner, body);
    return res.redirect(`/messages/${partner}`);
  } catch (e) {
    console.error("send message error:", e);
    req.flash("errors", "Илгээхэд алдаа гарлаа.");
    return req.session.save(() => res.redirect("/"));
  }
};
