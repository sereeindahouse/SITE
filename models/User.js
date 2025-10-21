const userCollection= require("../db").collection("users");
const validator = require("validator");
const bcrypt = require("bcryptjs");

let User = function (data) {
  this.data = data;
  this.name = "Seree";
  this.errors = [];
};

User.prototype.validate = async function () {
  // normalize inputs
  let username = (this.data.username || "").toString().trim();
  let email = (this.data.email || "").toString().trim().toLowerCase();
  let password = (this.data.password || "").toString();
  let avatar = (this.data.avatar || "").toString().trim();

  this.errors = [];

  // username checks
  if (!username) {
    this.errors.push("Нэвтрэх нэр (username) шаардлагатай");
  } else {
    if (!/^[A-Za-z0-9]+$/.test(username)) {
      this.errors.push("Нэвтрэх нэр нь зөвхөн үсэг ба тоон тэмдэгт агуулна");
    }
    if (username.length < 3) {
      this.errors.push("Нэвтрэх нэр нь дор хаяж 3 тэмдэгт байх ёстой");
    }
  }

  // check username uniqueness (only if format/length ok)
  if (username && this.errors.length === 0) {
    try {
      const dbModule = require("../db");
      const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
      const userCollection = db.collection("users");
      let usernameExists = await userCollection.findOne({ username: username });
      if (usernameExists) {
        this.errors.push("Тухайн нэвтрэх нэр аль хэдийн ашиглагдсан");
      }
    } catch (e) {
      console.error("DB error while checking username:", e);
      // do not add DB internal error to user-facing messages
    }
  }

  // email checks
  if (!email) {
    this.errors.push("Имэйл оруулах шаардлагатай");
  } else {
    let gmailRegex = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;
    if (!gmailRegex.test(email)) {
      this.errors.push("Gmail хаяг зөв оруулна уу (жишээ: you@gmail.com)");
    }
  }

  // password checks: more than 8 characters
  if (!password) {
    this.errors.push("Нууц үг оруулах шаардлагатай");
  } else {
    if (password.length <= 2) {
      this.errors.push("Нууц үг нь 8-аас их тэмдэгт байх ёстой");
    }
  }

  // avatar (optional) must be http/https URL if provided
  if (avatar) {
    try {
      const u = new URL(avatar);
      if (!(u.protocol === 'http:' || u.protocol === 'https:')) {
        this.errors.push('Avatar URL must start with http(s)');
      }
    } catch (_) {
      this.errors.push('Avatar URL is not valid');
    }
  }

  // write normalized values back
  this.data.username = username;
  this.data.email = email;
  this.data.password = password;
  this.data.avatar = avatar;
};

User.prototype.register = async function () {
  return new Promise(async (resolve, reject) => {
    await this.validate();
    if (!this.errors.length) {
      try {
        let salt = bcrypt.genSaltSync(10);
        this.data.password = bcrypt.hashSync(this.data.password, salt);
        const dbModule = require("../db");
        const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
        const userCollection = db.collection("users");
        await userCollection.insertOne({
          username: this.data.username,
          email: this.data.email,
          password: this.data.password,
          avatar: this.data.avatar || null,
        });
        resolve();
      } catch (e) {
        console.error("DB error on register:", e);
        reject(["Серверийн алдаа. Дахин оролдоно уу."]);
      }
    } else {
      reject(this.errors);
    }
  });
};

User.prototype.login = async function () {
  return new Promise(async (resolve, reject) => {
    try {
      const dbModule = require("../db");
      const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
      const userCollection = db.collection("users");
      let loginuser = await userCollection.findOne({ username: this.data.username });
      if (loginuser && bcrypt.compareSync(this.data.password, loginuser.password)) {
        // keep DB record on the instance so controller can store id/username
        this.data = loginuser;
        resolve();
      } else {
        // return user-friendly message (Mongolian)
        reject(["Нэвтрэх нэр эсвэл нууц үг буруу"]);
      }
    } catch (e) {
      console.error("DB error during login:", e);
      reject(["Серверийн алдаа. Дахин оролдоно уу."]);
    }
  });
};

module.exports = User;
// Find a user by username (used by profile routes)
User.findByUsername = async function(username) {
  try {
    if (!username) return null;
    const dbModule = require("../db");
    const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
    const userCollection = db.collection("users");
    const uname = username.toString();
    // case-insensitive exact match
  const user = await userCollection.findOne({ username: { $regex: new RegExp('^' + uname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '$', 'i') } });
    return user || null;
  } catch (e) {
    console.error("findByUsername error:", e);
    return null;
  }
};

// Search users by partial username (case-insensitive)
User.searchByUsername = async function(term, options = {}) {
  try {
    const q = (term || "").toString().trim();
    if (!q) return [];
    const limit = Math.min(parseInt(options.limit || 10, 10) || 10, 50);
    const dbModule = require("../db");
    const db = typeof dbModule.db === "function" ? dbModule.db() : dbModule;
    const userCollection = db.collection("users");
    const results = await userCollection
      .find({ username: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })
      .project({ username: 1, _id: 0 })
      .limit(limit)
      .toArray();
    return results.map(u => u.username);
  } catch (e) {
    console.error("searchByUsername error:", e);
    return [];
  }
};