const Group = require('../models/Group');
const GroupPost = require('../models/GroupPost');

exports.list = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const groups = await Group.list(50);
  res.render('groups', { groups, me, user: req.session.user });
};

exports.view = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const group = await Group.findById(req.params.id);
  if (!group) {
    req.flash('errors', 'Group not found');
    return req.session.save(() => res.redirect('/groups'));
  }
  const posts = await GroupPost.listByGroup(group._id);
  const isMember = me ? Group.isMember(group, me) : false;
  const isAdmin = me ? Group.isAdmin(group, me) : false;
  const isPending = me ? ((group.joinRequests || []).some(u => u.toLowerCase() === me.toLowerCase())) : false;
  res.render('group-detail', { group, posts, isMember, isAdmin, isPending, me, user: req.session.user });
};

exports.create = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  if (!me) {
    req.flash('errors', 'Нэвтэрч орно уу.');
    return req.session.save(() => res.redirect('/'));
  }
  const name = req.body.name;
  const description = req.body.description;
  const result = await Group.create(name, description, me);
  if (result.ok) {
    req.flash('success', 'Group created');
    return req.session.save(() => res.redirect('/groups/' + result.id));
  }
  req.flash('errors', 'Could not create group');
  return req.session.save(() => res.redirect('/groups'));
};

exports.join = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  if (!me) return res.redirect('/');
  const result = await Group.join(req.params.id, me);
  if (result && result.pending) {
    req.flash('success', 'Join request sent. Waiting for admin approval.');
  } else if (result && result.ok) {
    req.flash('success', 'You have joined or already a member.');
  } else {
    req.flash('errors', 'Could not request to join.');
  }
  return req.session.save(() => res.redirect('/groups/' + req.params.id));
};

exports.leave = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  if (!me) return res.redirect('/');
  await Group.leave(req.params.id, me);
  return res.redirect('/groups/' + req.params.id);
};

exports.kick = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const target = req.params.username;
  const result = await Group.kick(req.params.id, me, target);
  if (!result.ok) req.flash('errors', 'Cannot kick user.');
  return req.session.save(() => res.redirect('/groups/' + req.params.id));
};

exports.sharePost = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const postId = req.body.postId || req.params.postId;
  const groupId = req.body.groupId || req.params.id;
  const result = await GroupPost.share(groupId, postId, me);
  if (result.ok) {
    if (result.reason === 'already') req.flash('success', 'Already shared.');
    else req.flash('success', 'Shared to group.');
  } else {
    req.flash('errors', 'Could not share to group.');
  }
  return req.session.save(() => res.redirect('/groups/' + groupId));
};

exports.like = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  if (!me) return res.redirect('/');
  await GroupPost.like(req.params.gpid, me);
  return res.redirect('/groups/' + req.params.id);
};

exports.unlike = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  if (!me) return res.redirect('/');
  await GroupPost.unlike(req.params.gpid, me);
  return res.redirect('/groups/' + req.params.id);
};

exports.createPost = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const { title, body } = req.body;
  const id = req.params.id;
  const result = await GroupPost.create(id, title, body, me);
  if (result.ok) req.flash('success', 'Post created');
  else req.flash('errors', 'Could not create post');
  return req.session.save(() => res.redirect('/groups/' + id));
};

exports.approve = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const target = req.params.username;
  await Group.approve(req.params.id, me, target);
  return res.redirect('/groups/' + req.params.id);
};

exports.reject = async function(req, res) {
  const me = req.session.user && req.session.user.username;
  const target = req.params.username;
  await Group.reject(req.params.id, me, target);
  return res.redirect('/groups/' + req.params.id);
};
