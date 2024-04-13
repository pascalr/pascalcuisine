const execSh = require("@jome/core/execSh");
const path = require("path");
const { build } = require("@jome/core");
module.exports = (f) => {
  let force = f;

  execSh("cp ./css/reset.css ./docs");

  execSh("cp ./css/app.css ./docs");

  build(
    path.join(__dirname, "../views/home.html.jome"),
    path.join(__dirname, "../docs/index.html"),
    { force: force },
  );
};
