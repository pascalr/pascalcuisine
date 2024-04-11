function text(str) {

}

// Remove all indentation on the left
function flat(lines) {
  return lines.map(line => {
    let [firstPart, ...parts] = line
    if (typeof firstPart !== 'string') {return line}
    return [firstPart.trimStart(), ...parts]
  })
}

// Start the indentation à 0. Remove the lowest indentation based on the first line that has content.
function indent(lines) {
  let indentLevel = null
  return lines.map(line => {
    let [firstPart, ...parts] = line
    if (typeof firstPart !== 'string') {return line}
    if (indentLevel) {
      return [firstPart.replace(new RegExp(`^\\s{0,${indentLevel}}`), ''), ...parts]
    } else if (/\S/.test(firstPart)) { // If it has non whitespace characters
      let trimmed = firstPart.replace(new RegExp(`^\\s*`), '')
      indentLevel = firstPart.length - trimmed.length
      return [trimmed, ...parts]
    } else {
      return line
    }
  })
}


// Would that be usefull?
// function rtrim(lines) {
//   return lines.map(line => {
//     let modParts = line[line.length - 1].slice();
//     let lastPart = modParts[modParts.length - 1]
//     if (typeof lastPart !== 'string') {return line}
//     modParts[modParts.length - 1] = lastPart.trimEnd();
//     return modLines;
//   })
// }

function strim(lines) {
  // First filter empty lines
  let firstIdx = 0
  while (firstIdx < lines.length && (!lines[firstIdx].length || /^\s*$/.test(lines[firstIdx]))) {
    firstIdx++;
  }
  // Then filter the first part of the first non empty line
  let modLines = lines.slice(firstIdx)
  let [firstLine, ...otherLines] = modLines
  let [firstPart, ...parts] = firstLine
  if (typeof firstPart !== 'string') {return otherLines}
  return [[firstPart.trimStart(), ...parts], ...otherLines]
}
let trimStart = strim;

function etrim(lines) {
  // First filter empty lines
  let lastIdx = lines.length-1
  while (lastIdx >= 0 && (!lines[lastIdx].length || /^\s*$/.test(lines[lastIdx]))) {
    lastIdx--;
  }
  // Then filter the last part of the last non empty line
  let modLines = lines.slice(0, lastIdx+1);
  let modParts = modLines[modLines.length - 1].slice();
  let lastPart = modParts[modParts.length - 1]
  if (typeof lastPart !== 'string') {return modLines}
  modParts[modParts.length - 1] = lastPart.trimEnd();
  modLines[modLines.length - 1] = modParts;
  return modLines;
}
let trimEnd = etrim;

// function xtrim(lines) {
//   return ltrim(rtrim(lines)) // OPTIMIZE: Combine the code of both here.
// }

function trim(lines) {
  return strim(etrim(lines)) // OPTIMIZE: Combine the code of both here.
}

// function trim(lines) {
//   return xtrim(ytrim(lines)) // OPTIMIZE: Combine the code of both here.
// }

function none(input) { return input }

function stringToPureJs(lines) {
  let code = lines.map(parts => {
    if (parts.length !== 1) {
      throw new Error("sfd9823h978fh2983rh")
    }
    let line = parts[0]
    if (typeof line !== 'string') {
      throw new Error("Can't convert string literal to pure js.")
    }
    return line
  }).join('\n')
  return [[{code}]]
}

module.exports = {
  strim, etrim, flat, trim, none, stringToPureJs, trimEnd, trimStart, indent
}

// function text(str) {

// }

// function ltrim(str) {
//   return str.replace(/\n\s+/g, '\n')
// }

// function rtrim(str) {
//   return str.replace(/\s+(?=\r?\n)/g, '')
// }

// function strim(str) {
//   return str.trimLeft()
// }

// function etrim(str) {
//   return str.trimRight()
// }

// function xtrim(str) {
//   // TODO
//   throw new Error("sfi9snf89234h89f3h4")
//   return str.replace(/\s+(?=\r?\n)/g, '')
// }

// function ytrim(str) {
//   return str.trimRight().trimLeft()
// }

// function trim(str) {
//   throw new Error("sfi9snf89234h89f3hsfd3f0j034")
//   return str.trimRight().trimLeft()
// }

// Les fonctions doivent nécessairement être importer en javascript pour que je puisse faire require dynamiquement et l'utiliser tout de suite?

//let %text = %ltrim%ytrim
//article: %s/\n\s*[^\n]//g

// You can use or define formats to specify how multi strings should be compiled. They start with the symbol `%`.

//   There are many formats builtin:
//   - %text: Trims every line and the beginning and the end of the string.
//   - %article: Joins every line with a space, but keeps empty lines.
//   - %indent: Removes the lowest indentation level everywhere, but keep the nested indentation.
//   - %code: Same as %indent%ytrim
//   - %prepend("  "): Add some string before every lines
//   - %append(";"): Add some string after every lines

  // Je ne peux pas faire %indent avec des regex... J'ai besoin d'une fonction
  // def %indent(str)
  // end

  // Les fonctions de formattage prennent une string en entrée et ressort une autre string.


  // If you define custom formats, it should have at least two characters in the name. Because at some point %a, %b, or any character
  // could be reserved to mean something like %s.

  // You can combine and apply multiple formats one after the other.

  // "str"%trim%clean

  // Possiblité d'avoir des arguments aux formats? Par exemple, %indent(2spaces) or %indent(2tabs)