const Friendship = require('../models/Friendship');
const User = require('../models/User');

exports.request = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const to = req.params.username;
  if (!me) return res.redirect('/');
  if (me.toLowerCase() === to.toLowerCase()) return res.redirect('back');
  await Friendship.request(me, to);
  req.flash('success', 'Friend request sent.');
  return req.session.save(() => res.redirect('/profile/' + to));
};

exports.accept = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const from = req.params.username;
  if (!me) return res.redirect('/');
  await Friendship.accept(me, from);
  req.flash('success', 'Friend request accepted.');
  return req.session.save(() => res.redirect('/profile/' + me + '/friends'));
};

exports.decline = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const from = req.params.username;
  if (!me) return res.redirect('/');
  await Friendship.decline(me, from);
  req.flash('success', 'Friend request declined.');
  return req.session.save(() => res.redirect('/profile/' + me + '/friends'));
};

exports.friendsList = async function(req, res) {
  const profileUser = req.params.username;
  const me = req.session.user && req.session.user.username;
  const friends = await Friendship.friendsOf(profileUser);
  let incoming = [];
  if (me && me.toLowerCase() === profileUser.toLowerCase()) {
    incoming = await Friendship.pendingIncoming(me);
  }
  res.render('friends', { profileUser, friends, incoming, me, user: req.session.user });
};
