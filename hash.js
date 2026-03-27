// hash.js
const bcrypt = require("bcryptjs");

const password = "SPVHTMF";

bcrypt.hash(password, 10).then(hash => {
  console.log("Hashed password:", hash);
});
