const getRecipes = require("./getRecipes.js");
const showRecipe = require("./showRecipe.js");
const execSh = require("@jome/core/execSh");
const path = require("path");
const { build, writeSync } = require("@jome/core");
module.exports = (f) => {
  let force = f;

  execSh("rm -R ./docs/assets");

  execSh("rm -R ./docs/r/*");

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

  let recipes = getRecipes();

  recipes.forEach(function (recipe) {
    let html = showRecipe(recipe);
    let id = recipe.id || recipe["$id"];
    if (id) {
      execSh(`mkdir ./docs/r/${id}`);
      writeSync(html, { to: `./docs/r/${id}/index.html` });
    }
  });
};
