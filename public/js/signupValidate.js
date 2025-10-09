document.addEventListener("DOMContentLoaded", function () {
  const form =
    document.getElementById("registration-form") ||
    document.getElementById("signupForm") ||
    document.querySelector('form[action="/register"]') ||
    Array.from(document.querySelectorAll("form")).find(f => f.querySelector('[name="email"]'));

  if (!form) return;

  form.addEventListener("submit", function (e) {
    const usernameField = form.querySelector("[name=username]");
    const emailField = form.querySelector("[name=email]");
    const passwordField = form.querySelector("[name=password]");

    const username = (usernameField ? usernameField.value : "").toString().trim();
    const email = (emailField ? emailField.value : "").toString().trim().toLowerCase();
    const password = (passwordField ? passwordField.value : "").toString();

    const errors = [];

    if (!username) {
      errors.push("Нэвтрэх нэр (username) шаардлагатай");
    } else {
      if (!/^[A-Za-z0-9]+$/.test(username)) {
        errors.push("Нэвтрэх нэр нь зөвхөн үсэг ба тоон тэмдэгт агуулна");
      }
      if (username.length < 3) {
        errors.push("Нэвтрэх нэр нь дор хаяж 3 тэмдэгт байх ёстой");
      }
    }

    const gmailRegex = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;
    if (!email) {
      errors.push("Имэйл оруулах шаардлагатай");
    } else if (!gmailRegex.test(email)) {
      errors.push("Gmail хаяг зөв оруулна уу (жишээ: you@gmail.com)");
    }

    if (!password) {
      errors.push("Нууц үг оруулах шаардлагатай");
    } else if (password.length <= 2) {
      errors.push("Нууц үг нь 8-аас их тэмдэгт байх ёстой");
    }

    if (errors.length) {
      e.preventDefault();
      alert(errors.join("\n"));
      if (!username || !/^[A-Za-z0-9]+$/.test(username) || username.length < 3) {
        usernameField && usernameField.focus();
      } else if (!email || !gmailRegex.test(email)) {
        emailField && emailField.focus();
      } else {
        passwordField && passwordField.focus();
      }
      return;
    }

    // client-side validation passed — check username existence on server first
    e.preventDefault(); // wait for server response
    fetch("/doesUsernameExist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username })
    })
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          alert("Тухайн нэвтрэх нэр аль хэдийн ашиглагдсан");
          usernameField && usernameField.focus();
          return;
        }
        // username free -> show success and submit
        alert("Бүртгэл амжилттай байна!");
        form.submit();
      })
      .catch(err => {
        console.error("Username check error:", err);
        // fallback: allow submit (or you can block)
        alert("Сервертэй холбогдох үед алдаа гарлаа. Дахин оролдоно уу.");
      });
  });
});