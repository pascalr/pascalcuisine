const path = require("path");
const { build } = require("@jome/core");
module.exports = (f) => {
  let force = f;

  build(
    path.join(__dirname, "views/home.html.jome"),
    path.join(__dirname, "../docs/index.html"),
    { force: force },
  );
};
