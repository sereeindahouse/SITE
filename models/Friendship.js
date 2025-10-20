const friendships = require('../db').collection('friendships');

const Friendship = {};

Friendship.statusBetween = async function(a, b) {
  if (!a || !b) return 'none';
  const pair = await friendships.findOne({
    $or: [
      { requester: a, recipient: b },
      { requester: b, recipient: a }
    ]
  });
  if (!pair) return 'none';
  if (pair.status === 'accepted') return 'friends';
  if (pair.status === 'pending') {
    return pair.requester === a ? 'pending-outgoing' : 'pending-incoming';
  }
  return 'none';
};

Friendship.request = async function(from, to) {
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) return { ok: false };
  const existing = await friendships.findOne({
    $or: [
      { requester: from, recipient: to },
      { requester: to, recipient: from }
    ]
  });
  if (existing) {
    if (existing.status === 'pending' && existing.requester === to) {
      // auto-accept if reverse pending exists
      await friendships.updateOne({ _id: existing._id }, { $set: { status: 'accepted' } });
      return { ok: true, accepted: true };
    }
    return { ok: true };
  }
  await friendships.insertOne({ requester: from, recipient: to, status: 'pending', createdDate: new Date() });
  return { ok: true };
};

Friendship.accept = async function(me, from) {
  const res = await friendships.updateOne(
    { requester: from, recipient: me, status: 'pending' },
    { $set: { status: 'accepted' } }
  );
  return { ok: res.matchedCount === 1 };
};

Friendship.decline = async function(me, from) {
  const res = await friendships.deleteOne({ requester: from, recipient: me, status: 'pending' });
  return { ok: res.deletedCount === 1 };
};

Friendship.remove = async function(a, b) {
  const res = await friendships.deleteOne({
    $or: [
      { requester: a, recipient: b, status: 'accepted' },
      { requester: b, recipient: a, status: 'accepted' }
    ]
  });
  return { ok: res.deletedCount === 1 };
};

Friendship.friendsOf = async function(username) {
  const results = await friendships.find({
    status: 'accepted',
    $or: [{ requester: username }, { recipient: username }]
  }).toArray();
  return results.map(r => r.requester === username ? r.recipient : r.requester);
};

Friendship.pendingIncoming = async function(username) {
  const results = await friendships.find({ status: 'pending', recipient: username }).toArray();
  return results.map(r => r.requester);
};

module.exports = Friendship;
