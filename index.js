const build = require("./src/build.js");
const server = require("./src/server.js");
module.exports = (cmd, args) => {
  global.ROOT = "/cuisine";

  if (cmd === "test") {
    console.log("No test suite written yet.");
  } else if (cmd === "dev") {
    build({ force: true });
    server({ port: 3000 });
  } else if (cmd === "s" || cmd === "server") {
    build();
    server({ port: 3000 });
  } else {
    console.log(`
    Pascal Cuisine

    Usage:
    jome # get this help message
    jome dev # build and start server
    jome s # start server (or jome server)
    jome test # launch the tests
  `);
  }
};
