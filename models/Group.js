const { ObjectId } = require('mongodb');
const groupCollection = require('../db').collection('groups');

const Group = {};

Group.create = async function(name, description, creator) {
  const n = (name || '').toString().trim();
  const d = (description || '').toString().trim();
  const u = (creator || '').toString().trim();
  if (!n || !u) return { ok: false, reason: 'validation' };
  const doc = {
    name: n,
    description: d,
    createdBy: u,
    admins: [u],
    members: [u],
    joinRequests: [],
    createdDate: new Date()
  };
  const info = await groupCollection.insertOne(doc);
  return { ok: true, id: info.insertedId };
};

Group.findById = async function(id) {
  try {
    const _id = typeof id === 'string' ? new ObjectId(id) : id;
    return await groupCollection.findOne({ _id });
  } catch (e) {
    return null;
  }
};

Group.list = async function(limit = 20) {
  try {
    return await groupCollection.find().sort({ createdDate: -1 }).limit(Math.min(limit, 100)).toArray();
  } catch (e) {
    return [];
  }
};

Group.listForUser = async function(username) {
  try {
    if (!username) return [];
    const uname = username.toString();
    return await groupCollection
      .find({ members: { $elemMatch: { $regex: new RegExp('^' + uname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'i') } } })
      .project({ name: 1 })
      .toArray();
  } catch (e) {
    return [];
  }
};

Group.isAdmin = function(group, username) {
  if (!group || !Array.isArray(group.admins)) return false;
  return group.admins.some(a => a.toLowerCase() === username.toLowerCase());
};

Group.isMember = function(group, username) {
  if (!group || !Array.isArray(group.members)) return false;
  return group.members.some(m => m.toLowerCase() === username.toLowerCase());
};

Group.join = async function(groupId, username) {
  try {
    const _id = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
    // if already member just ok
    const g = await groupCollection.findOne({ _id });
    if (!g) return { ok: false };
    if ((g.members||[]).includes(username)) return { ok: true };
    // require approval: add to joinRequests
    await groupCollection.updateOne({ _id }, { $addToSet: { joinRequests: username } });
    return { ok: true, pending: true };
  } catch (e) {
    return { ok: false };
  }
};

Group.leave = async function(groupId, username) {
  try {
    const _id = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
    const res = await groupCollection.updateOne(
      { _id },
      { $pull: { members: username } }
    );
    // also remove from admins if present
    await groupCollection.updateOne({ _id }, { $pull: { admins: username } });
    return { ok: res.matchedCount === 1 };
  } catch (e) {
    return { ok: false };
  }
};

Group.approve = async function(groupId, adminUsername, targetUsername) {
  const _id = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
  const g = await groupCollection.findOne({ _id });
  if (!g) return { ok: false };
  if (!Group.isAdmin(g, adminUsername)) return { ok: false, reason: 'forbidden' };
  await groupCollection.updateOne({ _id }, { $pull: { joinRequests: targetUsername } });
  await groupCollection.updateOne({ _id }, { $addToSet: { members: targetUsername } });
  return { ok: true };
};

Group.reject = async function(groupId, adminUsername, targetUsername) {
  const _id = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
  const g = await groupCollection.findOne({ _id });
  if (!g) return { ok: false };
  if (!Group.isAdmin(g, adminUsername)) return { ok: false, reason: 'forbidden' };
  await groupCollection.updateOne({ _id }, { $pull: { joinRequests: targetUsername } });
  return { ok: true };
};

Group.kick = async function(groupId, adminUsername, targetUsername) {
  try {
    const _id = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
    const group = await groupCollection.findOne({ _id });
    if (!group) return { ok: false, reason: 'not-found' };
    if (!Group.isAdmin(group, adminUsername)) return { ok: false, reason: 'forbidden' };
    if (Group.isAdmin(group, targetUsername) && group.createdBy !== adminUsername) {
      return { ok: false, reason: 'cannot-kick-admin' };
    }
    await groupCollection.updateOne({ _id }, { $pull: { members: targetUsername, admins: targetUsername } });
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
};

module.exports = Group;
