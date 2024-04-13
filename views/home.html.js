module.exports = () => {
  // Takes a recipe and prints the HTML to show;

  // a summary of the recipe;

  function printRecipeCard(recipe) {
    return `
    <div class="recipe-card">
      <div class="recipe-card-title">Recipe title</div>
      <div class="recipe-card-image">Recipe card image</div>
      <div class="recipe-card-summary" hidden></div>
    </div>
  `;
  }

  let recipes = [1, 2, 3];

  let cards = recipes.map(printRecipeCard).join("\n");

  return `
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pascal Cuisine</title>
      <link rel="stylesheet" type="text/css" href="${ROOT}/reset.css">
    </head>
    <body>
      <nav style="padding: 0.5em; background-color: #212529; color: #f9f9f9;">
        <div style="display: flex;">
          <div style="font-size: 2em;">PascalCuisine</div>
          <input type="text" id="filter" name="filter" placeholder="J'ai faaaaaaaiim... Je veux..." style="margin-left: 1em;">
        </div>
      </nav>
      <div>
        ${cards}
      </div>
    </body>
  </html>`;
};
