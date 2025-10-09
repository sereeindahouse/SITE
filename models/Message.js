// Simple Message model for user-to-user chat
// Fields: from (username), to (username), body, createdDate

class Message {}

Message.send = async function(fromUsername, toUsername, body) {
  try {
    const text = (body || "").toString().trim();
    if (!fromUsername || !toUsername || !text) return false;
    const dbModule = require("../db");
    const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
    const messages = db.collection("messages");
    await messages.insertOne({
      from: fromUsername,
      to: toUsername,
      body: text,
      createdDate: new Date()
    });
    return true;
  } catch (e) {
    console.error("Message.send error:", e);
    return false;
  }
};

Message.getConversation = async function(userA, userB) {
  try {
    if (!userA || !userB) return [];
    const dbModule = require("../db");
    const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
    const messages = db.collection("messages"); 
    return await messages
      .find({
        $or: [
          { from: userA, to: userB },
          { from: userB, to: userA }
        ]
      })
      .sort({ createdDate: 1 })
      .toArray();
  } catch (e) {
    console.error("Message.getConversation error:", e);
    return [];
  }
};

module.exports = Message;
