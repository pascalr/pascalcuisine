const { XMLParser } = require("fast-xml-parser");
const fs = require("fs");
const path = require("path");
function toArray(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

function getRecipes() {
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
  return toArray(parser.parse(data).recipe);
}

module.exports = getRecipes;
