module.exports = () => {
  return `

@font-face {
  font-family: 'Satisfy';
  src: URL('${ROOT}/assets/Satisfy-Regular.ttf') format('truetype');
}

.recipe-card {
  margin: 0.5em;
}

.recipe-card-title {
  text-align: center;
  font-size: 1.8em;
  font-family: "Satisfy", cursive;
}

.recipe-card > img {
  transform: translateY(calc(-50% + 85.5px));
}
`;
};