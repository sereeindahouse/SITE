const { ObjectId } = require('mongodb');
const groupPosts = require('../db').collection('group_posts');
const posts = require('../db').collection('posts');
const Group = require('./Group');

const GroupPost = {};

GroupPost.share = async function(groupId, postId, sharingUser) {
  try {
    const gId = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
    const pId = typeof postId === 'string' ? new ObjectId(postId) : postId;
    const group = await Group.findById(gId);
    if (!group) return { ok: false, reason: 'group-not-found' };
    const original = await posts.findOne({ _id: pId });
    if (!original) return { ok: false, reason: 'post-not-found' };
  const existing = await groupPosts.findOne({ groupId: gId, originalPostId: pId, author: sharingUser });
    if (existing) return { ok: true, reason: 'already' };
    const doc = {
      groupId: gId,
      originalPostId: pId,
      title: original.title,
      body: original.body,
      author: sharingUser,
      createdDate: new Date(),
      likes: []
    };
    const info = await groupPosts.insertOne(doc);
    return { ok: true, id: info.insertedId };
  } catch (e) {
    return { ok: false, reason: 'error' };
  }
};

GroupPost.listByGroup = async function(groupId, limit = 50) {
  try {
    const gId = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
    return await groupPosts.find({ groupId: gId }).sort({ createdDate: -1 }).limit(Math.min(limit, 100)).toArray();
  } catch (e) {
    return [];
  }
};

GroupPost.like = async function(groupPostId, username) {
  try {
    const _id = typeof groupPostId === 'string' ? new ObjectId(groupPostId) : groupPostId;
    await groupPosts.updateOne({ _id }, { $addToSet: { likes: username } });
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
};

GroupPost.unlike = async function(groupPostId, username) {
  try {
    const _id = typeof groupPostId === 'string' ? new ObjectId(groupPostId) : groupPostId;
    await groupPosts.updateOne({ _id }, { $pull: { likes: username } });
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
};

module.exports = GroupPost;

// Create a brand new post inside group
GroupPost.create = async function(groupId, title, body, author) {
  try {
    const gId = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
    const group = await Group.findById(gId);
    if (!group) return { ok: false };
    if (!Group.isMember(group, author)) return { ok: false, reason: 'not-member' };
    const doc = {
      groupId: gId,
      title: (title||'').toString().trim(),
      body: (body||'').toString().trim(),
      author,
      createdDate: new Date(),
      likes: []
    };
    if (!doc.title || !doc.body) return { ok: false, reason: 'validation' };
    const info = await groupPosts.insertOne(doc);
    return { ok: true, id: info.insertedId };
  } catch (e) {
    return { ok: false };
  }
};
