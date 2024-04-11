const fs = require('fs');

// Usage:
// #write 'Some content', in: stream
// #write! 'Some content', to: './filepath.txt' // sync
// #write 'Some content', to: './filepath.txt', success: do
//   console.log('Success!')
// end, error: do
//   console.log('Error... :(')
// end
//
// options:
// - success: success callback
// - error: error callback

async function write(content, options) {
  if (options.to) {
    fs.writeFile(options.to, content, 'utf8', (err) => handleError(err, options));
  } else {
    throw new Error("Write to stream not implemented yet. TODO: Handle all signatures.")
    // fs.write(options.in, content, 'utf8', (err) => handleError(err, options));
  }
}

function writeSync(content, options) {
  if (options.to) {
    fs.writeFileSync(options.to, content, 'utf8', (err) => handleError(err, options));
  } else {
    throw new Error("Write to stream not implemented yet. TODO: Handle all signatures.")
    // fs.writeSync(options.in, content, 'utf8', (err) => handleError(err, options));
  }
}

function handleError(err, options) {
  if (err && options.error) {
    options.error(err) // Error callback
  } else if (!err && options.success) {
    options.success() // Success callback
  }
}

module.exports = {write, writeSync}


/*

Ça devient beaucoup trop compliqué et je ne veux pas m'embarquer là dedans.

Simply do: Adding an exclamation mark after then name does the synchronous version.

#write! './someFile.txt', 'Some text'




If I do

#write './someFile.txt', 'Some text'

I want #write to be written in a synchronous manner. But I don't want it to block.

One thing we can do is to use the await keyword.

Instead of:

fs.writeFileSync(...)

use:

await fs.writeFile(...)

But this means that containing method that uses the #write must be async.

And this means that the every method calling this method must use await and must themselves be async.

And forever after.

It's OK.

#write './filepath.txt', 'Before'
#write './filepath.txt', 'After'

compiles to:

await write('./filepath.txt', 'Before')
await write('./filepath.txt', 'After')

What if I want to do:

write('./filepath.txt', 'At the same time')
write('./filepath.txt', 'At the same time')

#writeAsync './filepath.txt', ''
#writeAsync './filepath.txt', ''



Any way to do some magic and add the async keyword for every dependant function?

*/