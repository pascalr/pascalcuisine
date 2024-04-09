# Jome-lib

This is a work in progress. This is the easy way right now. I call functions in a custom lib.

I would like to optimize and avoid using these functions. For example, instead of using write.js, I would like
the compiler to use fs.write directly.

But it's overkill for now, so let's do it this way.

Contains all the code snippets to be used by Jome utilities.

This library will probably grow to be quite big.

At one point, it will probably be a good idea to split this library into smaller ones, so if you don't use
some utils you don't need to install the whole library.

TODO: Find the good balance between being lightweight and having a lot of functionality.
Ideally, split this lib into many.

mdToHtml with it's mardown-it and highlight.js and my custom jome highlight dependencies should be in another librairy.

But let's wait until splitting, it will make more sense where to split later on.