const {spawnSync} = require("child_process");

function execSh(cmd) {
  // FIXME: This does not work I cannot pass strings. Why was I not using execSync instead of spawnSync already? I had trouble with IO I think...
  let s = cmd.split(' ')
  let cmdName = s[0]
  let args = s.slice(1)
  spawnSync(cmdName, args, { encoding: 'utf-8', stdio: 'inherit' })
}

module.exports = execSh