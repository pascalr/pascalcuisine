const execSh = require("@jome/core/execSh");
const path = require("path");
const { build } = require("@jome/core");
module.exports = (f) => {
  let force = f;

  execSh("rm -R ./docs/assets");

  execSh("cp -R ./public ./docs/assets");

  execSh("cp ./css/reset.css ./docs");

  build(
    path.join(__dirname, "../css/app.css.jome"),
    path.join(__dirname, "../docs/app.css"),
    { force: force },
  );

  build(
    path.join(__dirname, "../views/home.html.jome"),
    path.join(__dirname, "../docs/index.html"),
    { force: force },
  );
};
