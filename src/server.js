const express = require("express");
module.exports = ({ port = 3000 }) => {
  (() => {
    let __chain = express();
    __chain.use("/cuisine", express.static("../docs"));
    __chain.get("/", (req, res) => res.redirect("/cuisine"));
    return __chain.listen(port, function () {
      console.log(`Server listening on port ${port}`);
    });
  })();
};
