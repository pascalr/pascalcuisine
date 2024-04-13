module.exports = () => {
  return `
  <recipe
    name="Granola"
    source="https://cookieandkate.com/healthy-granola-recipe/"
    preparation_time="5"
    cooking_time="21"
    total_time="26"
    servings_quantity="8 tasses"
    description="Excellent avec du yogourt et des petits fruits frais!"
    recipe_kind_id=""
    image_slug="24.jpg"
  >
    <ing qty="4 t" name="flocons d'avoine roulés à l'ancienne"/>
    <ing qty="1 t" name="pacanes"/>
    <ing qty="0.5 t" name="graines de citrouille"/>
    <ing qty="0.5 c. à thé" name="cannelle moulue"/>
    <ing qty="0.5 t" name="huile de noix de coco"/>
    <ing qty="0.5 t" name="sirop d'érable"/>
    <ing qty="1 c. à thé" name="extrait de vanille"/>
    <ing qty="0.67 t" name="canneberges séchés"/>

    <step>Add {1} into {2}. Add {1-2}.</step>
  </recipe>`;
};
