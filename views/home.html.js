const getRecipeList = require("../data/recipes.js");
const { XMLParser } = require("fast-xml-parser");
const fs = require("fs");
const path = require("path");
module.exports = () => {
  function toArray(input) {
    if (!input) {
      return [];
    }
    if (Array.isArray(input)) {
      return input;
    }
    return [input];
  }

  // Takes a recipe and prints the HTML to show;

  // a summary of the recipe;

  function printRecipeCard(recipe) {
    let title = (recipe && (recipe.name || recipe["$name"])) || "Recipe title";
    let imgSlug = recipe && (recipe.image_slug || recipe["$image_slug"]);
    if (imgSlug) {
      imgSlug = `${ROOT}/images/${imgSlug}`;
    } else {
      imgSlug = `${ROOT}/assets/default_recipe_01.png`;
    }
    return `
    <div class="recipe-card">
      <img src="${imgSlug}" width="255" height="171">
      <div class="recipe-card-title">${title}</div>
      <div class="recipe-card-summary" hidden></div>
    </div>
  `;
  }

  let recipeListStr = getRecipeList();

  const data = fs.readFileSync(
    path.join(__dirname, "../data/recipes_exported.xml"),
    "utf8",
  );
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "$",
    allowBooleanAttributes: true,
  };

  const parser = new XMLParser(options);
  let recipes = toArray(parser.parse(data).recipe);
  console.log(recipes);

  let cards = recipes.map(printRecipeCard).join("\n");

  return `
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pascal Cuisine</title>
      <link rel="stylesheet" type="text/css" href="${ROOT}/reset.css">
      <link rel="stylesheet" type="text/css" href="${ROOT}/app.css">
    </head>
    <body>
      <nav style="padding: 0.5em; background-color: #212529; color: #f9f9f9;">
        <div style="display: flex;">
          <div style="font-size: 2em;">PascalCuisine</div>
          <input type="text" id="filter" name="filter" placeholder="J'ai faaaaaaaiim... Je veux..." style="margin-left: 1em;">
        </div>
      </nav>
      <div style="display: flex; flex-wrap: wrap;">
        ${cards}
      </div>
    </body>
  </html>`;
};
