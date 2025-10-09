const { ObjectId } = require("mongodb");
const postCollection = require("../db").collection("posts");

let Post = function(data, author) {
  this.data = data || {};
  this.author = author || null;
  this.errors = [];
};

Post.prototype.validate = function() {
  this.data = {
    title: typeof this.data.title === "string" ? this.data.title.trim() : "",
    body: typeof this.data.body === "string" ? this.data.body.trim() : "",
    createdDate: new Date(),
    author: this.author ? this.author : null
  };

  if (this.data.title === "") { this.errors.push("Гарчиг оруулна уу."); }
  if (this.data.body === "") { this.errors.push("Агуулга оруулна уу."); }
  if (!this.data.author) { this.errors.push("Зохиогч тодорхойгүй байна."); }
};

Post.prototype.create = function() {
  return new Promise((resolve, reject) => {
    this.validate();
    if (!this.errors.length) {
      postCollection.insertOne(this.data).then((info) => {
        resolve(info.insertedId);
      }).catch((e) => {
        this.errors.push("Алдаа гарлаа. Дахин оролдоно уу.");
        reject(this.errors);
      });
    } else {
      reject(this.errors);
    }
  });
};

Post.findSingleById = async function(id) {
  try {
    if (!id) return null;
    const _id = typeof id === "string" ? new ObjectId(id) : id;
    const post = await postCollection.findOne({ _id });
    return post || null;
  } catch (e) {
    return null;
  }
};

Post.findAll = async function() {
  try {
    return await postCollection.find().sort({ createdDate: -1 }).toArray();
  } catch (e) {
    return [];
  }
};

// Feed: get recent posts, optionally excluding one username
Post.feed = async function(options = {}) {
  try {
    const excludeUser = options.excludeUser || null;
    const limit = Math.min(parseInt(options.limit || 20, 10) || 20, 100);
    const query = excludeUser ? { author: { $ne: excludeUser } } : {};
    return await postCollection
      .find(query)
      .sort({ createdDate: -1 })
      .limit(limit)
      .toArray();
  } catch (e) {
    console.error("Post.feed error:", e);
    return [];
  }
};

// NEW: find posts by author (username)
Post.findByAuthor = async function(username) {
  try {
    if (!username) return [];
    return await postCollection.find({ author: username }).sort({ createdDate: -1 }).toArray();
  } catch (e) {
    console.error("findByAuthor error:", e);
    return [];
  }
};

module.exports = Post;

Post.countPostsByAuthor = async function(authorId) {
  try {
    if (!authorId) return 0;
    return await postCollection.countDocuments({ authorId: authorId });
  } catch (e) {
    return 0;
  }
};


Post.findByAuthorId = async function(authorId) {
  try {
    if (!authorId) return [];
    return await postCollection.find({ authorId: authorId }).sort({ createdDate: -1 }).toArray();
  } catch (e) {
    return [];
  }
};


Post.update = async function(id, data, username) {
  try {
    if (!id || !username) return { ok: false, reason: "invalid" };
    const _id = typeof id === "string" ? new ObjectId(id) : id;
    const post = await postCollection.findOne({ _id });
    if (!post) return { ok: false, reason: "not-found" };
    if (post.author !== username) return { ok: false, reason: "forbidden" };

    const title = typeof data.title === "string" ? data.title.trim() : "";
    const body = typeof data.body === "string" ? data.body.trim() : "";
    if (!title || !body) return { ok: false, reason: "validation", errors: ["Гарчиг болон агуулгыг бөглөнө үү."] };

    const result = await postCollection.updateOne(
      { _id },
      { $set: { title, body } }
    );
    return { ok: result.modifiedCount === 1 };
  } catch (e) {
    console.error("Post.update error:", e);
    return { ok: false, reason: "error" };
  }
};

Post.delete = async function(id, username) {
  try {
    if (!id || !username) return { ok: false, reason: "invalid" };

    const _id = typeof id === "string" ? new ObjectId(id) : id;

    const post = await postCollection.findOne({ _id });
    
    if (!post) return { ok: false, reason: "not-found" };
    if (post.author !== username) return { ok: false, reason: "forbidden" };

    const result = await postCollection.deleteOne({ _id });
    return { ok: result.deletedCount === 1 };
  } catch (e) {
    console.error("Post.delete error:", e);
    return { ok: false, reason: "error" };
  }
};

// Share (repost) another user's post to current user's profile/feed
Post.share = async function(originalId, sharingUser) {
  try {
    if (!originalId || !sharingUser) return { ok: false, reason: "invalid" };
    const _id = typeof originalId === "string" ? new ObjectId(originalId) : originalId;
    const original = await postCollection.findOne({ _id });
    if (!original) return { ok: false, reason: "not-found" };
    if (original.author === sharingUser) return { ok: false, reason: "own-post" };

    // prevent duplicate share (same user sharing same original)
    const existing = await postCollection.findOne({ "shared.originalId": _id, author: sharingUser });
    if (existing) return { ok: true, reason: "already" }; // treat as success (idempotent)

    const doc = {
      title: original.title,
      body: original.body,
      createdDate: new Date(),
      author: sharingUser,
      shared: {
        originalId: _id,
        originalAuthor: original.author,
        originalCreatedDate: original.createdDate,
        sharedDate: new Date()
      }
    };
    const info = await postCollection.insertOne(doc);
    return { ok: true, insertedId: info.insertedId };
  } catch (e) {
    console.error("Post.share error:", e);
    return { ok: false, reason: "error" };
  }
};

// Share a post directly to a friend's profile (stores 'to' field)
Post.shareToFriendProfile = async function(originalId, sharingUser, friendUsername) {
  try {
    if (!originalId || !sharingUser || !friendUsername) return { ok: false, reason: "invalid" };
    const _id = typeof originalId === "string" ? new ObjectId(originalId) : originalId;
    const original = await postCollection.findOne({ _id });
    if (!original) return { ok: false, reason: "not-found" };
    if (original.author === friendUsername) return { ok: false, reason: "friend-is-author" };
    if (friendUsername === sharingUser) return { ok: false, reason: "self" };

    // prevent duplicate targeted share
    const existing = await postCollection.findOne({ "shared.originalId": _id, author: sharingUser, "shared.to": friendUsername });
    if (existing) return { ok: true, reason: "already" };

    const doc = {
      title: original.title,
      body: original.body,
      createdDate: new Date(),
      author: sharingUser,
      shared: {
        originalId: _id,
        originalAuthor: original.author,
        originalCreatedDate: original.createdDate,
        sharedDate: new Date(),
        to: friendUsername
      }
    };
    const info = await postCollection.insertOne(doc);
    return { ok: true, insertedId: info.insertedId };
  } catch (e) {
    console.error("Post.shareToFriendProfile error:", e);
    return { ok: false, reason: "error" };
  }
};

// Find shares that were targeted to a given username (friend profile shares)
Post.findSharesToUser = async function(username) {
  try {
    if (!username) return [];
    return await postCollection
      .find({ "shared.to": username })
      .sort({ createdDate: -1 })
      .toArray();
  } catch (e) {
    console.error("Post.findSharesToUser error:", e);
    return [];
  }
};

