const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Using DB directly to avoid changing User model API
const dbModule = require('../db');
const db = typeof dbModule.db === 'function' ? dbModule.db() : dbModule;
const users = db.collection('users');
const resets = db.collection('password_resets');

exports.forgotPasswordForm = function(req, res){
  res.render('forgot-password', { user: req.session.user || null });
};

exports.forgotPasswordStart = async function(req, res){
  try {
    const username = (req.body.username || '').toString().trim();
    if (!username) {
      req.flash('errors', 'Enter username.');
      return req.session.save(() => res.redirect('/forgot-password'));
    }
    const user = await users.findOne({ username });
    if (!user) {
      // Do not reveal existence; show success message
      req.flash('success', 'If the username exists, a reset link is ready.');
      return req.session.save(() => res.redirect('/forgot-password'));
    }
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    await resets.deleteMany({ username });
    await resets.insertOne({ username, token, expiresAt, createdDate: new Date() });
    // In a real app, email the link. For now, redirect to the reset form directly with token.
    return res.redirect('/reset-password?token=' + encodeURIComponent(token));
  } catch (e) {
    console.error('forgotPasswordStart error:', e);
    req.flash('errors', 'System error.');
    return req.session.save(() => res.redirect('/forgot-password'));
  }
};

exports.resetPasswordForm = async function(req, res){
  try {
    const token = (req.query.token || '').toString();
    if (!token) {
      req.flash('errors', 'Missing token.');
      return req.session.save(() => res.redirect('/forgot-password'));
    }
    const rec = await resets.findOne({ token });
    if (!rec || !rec.expiresAt || rec.expiresAt < new Date()) {
      req.flash('errors', 'Reset token invalid/expired.');
      return req.session.save(() => res.redirect('/forgot-password'));
    }
    return res.render('reset-password', { token, user: null });
  } catch (e) {
    console.error('resetPasswordForm error:', e);
    req.flash('errors', 'System error.');
    return req.session.save(() => res.redirect('/forgot-password'));
  }
};

exports.resetPasswordFinish = async function(req, res){
  try {
    const token = (req.body.token || '').toString();
    const password = (req.body.password || '').toString();
    if (!token || !password) {
      req.flash('errors', 'Missing token or password.');
      return req.session.save(() => res.redirect('/forgot-password'));
    }
    const rec = await resets.findOne({ token });
    if (!rec || !rec.expiresAt || rec.expiresAt < new Date()) {
      req.flash('errors', 'Reset token invalid/expired.');
      return req.session.save(() => res.redirect('/forgot-password'));
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    await users.updateOne({ username: rec.username }, { $set: { password: hash } });
    await resets.deleteOne({ _id: rec._id });
    req.flash('success', 'Password updated. You can sign in now.');
    return req.session.save(() => res.redirect('/'));
  } catch (e) {
    console.error('resetPasswordFinish error:', e);
    req.flash('errors', 'System error.');
    return req.session.save(() => res.redirect('/forgot-password'));
  }
};
