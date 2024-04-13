module.exports = () => {
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
      <header>
          <h1>Pascal Cuisine</h1>
      </header>
      <div class="container">
          <!-- Your content goes here -->
          <h2>Welcome to our website!</h2>
          <p>This is a basic HTML template.</p>
      </div>
    </body>
  </html>`;
};
