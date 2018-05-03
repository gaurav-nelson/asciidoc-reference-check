/**
* @author Gaurav Nelson
* @copyright 2017 Gaurav Nelson
* @license MIT
* @module atom:asciidoc-reference-check
*/

/*jshint esversion: 6 */
/*jshint globalstrict: true*/
/*global atom*/

'use strict';

//to read the file line by line
var readl = require('readl-async');

//to read files referenced by external references
var fs = require('fs');

//to convert ../ and / and ./ to absolute paths
var path = require('path');

//Difference function to compare internal references stored in arrays
function difference(a1, a2) {
  var result = [];
  for (let i = 0; i < a1.length; i++) {
    if (a2.indexOf(a1[i]) === -1) {
      result.push(a1[i]);
    }
  }

  return result;
}

//To check for only unique values
function uniq(a) {
  var prims = {
    boolean: {},
    number: {},
    string: {},
  },
  objs = [];

  return a.filter(function (item) {
    var type = typeof item;
    if (type in prims) {
      return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
    } else {
      return objs.indexOf(item) >= 0 ? false : objs.push(item);
    }
  });
}

// get the path of the item selected in treeView
function getTreeViewPath() {
  if (!atom.packages.isPackageLoaded('tree-view')) {
    atom.notifications.addError('Cannot get reference to tree-view');
    return null;
  }

  var treeView = atom.packages.getLoadedPackage('tree-view');
  treeView = treeView.mainModule.treeView;
  return treeView.selectedPath;
}

// map commands
module.exports = {
  activate: function () {
    atom.commands.add('atom-text-editor', {
      'asciidoc-reference-check:checkReferenceFromEditor': checkReferencesFromEditor,
    });
    atom.commands.add('.tree-view', {
      'asciidoc-reference-check:checkReferenceFromTreeViewFile': checkReferencesFromTreeViewFile,
    });
    atom.commands.add('.tree-view', {
      'asciidoc-reference-check:checkReferenceFromTreeViewFolder': checkReferencesFromTreeViewFolder,
    });
  },
};

// check the current file of the editor
function checkReferencesFromEditor(event) {
  var ref = atom.workspace.getActiveTextEditor();
  if (ref != null) {
    checkReferences(ref.getPath());
  } else {
    atom.notifications.addError('Cannot get reference to Atom Editor');
  }
}

// check the current file selected in the treeView
function checkReferencesFromTreeViewFile(event) {
  checkReferences(getTreeViewPath());
}

// check recursively the current folder selected in the treeView
function checkReferencesFromTreeViewFolder(event) {

  //walk recursively through the folder and returns file list
  function walk(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(file => {
      file = dir + '/' + file;
      var stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        /* Recurse into a subdirectory */
        results = results.concat(walk(file));
      } else {
        /* Is a file */
        var fileType = file.split('.').pop();
        if (fileType === 'adoc') {
          results.push(file);
        }
      }
    });

    return results;
  }

  var pathTreeView = getTreeViewPath();
  var fileList = walk(pathTreeView);
  var numberFiles = fileList.length;

  var fileListShort = '';
  fileList.forEach(file =>  {
    fileListShort += path.relative(pathTreeView, file) + ', ';
  });
  atom.notifications.addInfo(
    'Checking: `' + fileListShort + '`'
  );

  for (let i = 0; i < numberFiles; i++) {
    checkReferences(fileList[i], pathTreeView);
  }
}

// check the references contained in the file
// basePath is a shorter version of the filePath that will be used in log messages
function checkReferences(filePath, basePath) {

  // string identifying the current file in any log message
  // if a basePath is given, the file will be identified
  // relatively to this basePath
  var logMsgFilePath;
  if (basePath !== undefined) {
    logMsgFilePath = path.relative(path.parse(basePath).dir, filePath);
  } else {
    logMsgFilePath = path.parse(filePath).base;
  }

  //get directory of current file
  var folderPath = path.parse(filePath).dir;

  //to ignore everything if it is commented out
  var insideCommentBlock = false;

  //to hold anchors
  var anchorArray = [];

  //to hold internal references
  var internalRefs = [];

  //to hold references to external files
  var externalRefs = [];

  // add an anchor to the anchor array
  // raise an error if the anchor was already defined
  function registerAnchor(newAnchor) {
    if (anchorArray.includes(newAnchor)) {
      atom.notifications.addError(
        '`' + logMsgFilePath + '`: Found duplicate anchors for `' + newAnchor + '`.',
        {
          dismissable: true,
        }
      );
    } else {
      anchorArray.push(newAnchor);
    }
  }

  //lets read file contents line by line
  //we are not reading the file from editor, but instead the file from disk
  var reader = new readl(filePath, {
    encoding: 'utf8',
    emptyLines: 'true',
  });

  //Emit this function when one line is read:
  reader.on('line', function (line, index, start, end) {

    //detect start and end of code blocks
    if (line.startsWith('////')) {
      insideCommentBlock = !insideCommentBlock;
    }

    //ignore everything inside comment blocks
    if (insideCommentBlock) {
      return;
    }

    //ignore single line comments
    if (line.startsWith('//')) {
      return;
    }

    //find if line contains an anchor with format [[anchor]] or [[anchor, description]]
    if (line.match(/\[\[[^\]]+\]\]/g)) {
      let extractLink = line.match(/\[\[[^\]]+\]\]/g);
      //console.log('LINE: '+ line);
      //console.log('EXTRACT LINK: '+ extractLink);
      for (let i = 0; i < extractLink.length; i++) {
        let newAnchor = extractLink[i];
        newAnchor = newAnchor.replace('[[', '');
        newAnchor = newAnchor.replace(']]', '');
        newAnchor = newAnchor.replace(/,.*/g, ''); // take into account ','

        registerAnchor(newAnchor);

        //console.log('NEW ANCHOR with [[...]]: ' + newAnchor);
      }
    }

    //find if line contains an anchor with format [[[anchor]]] or [[[anchor, something]]]
    //this type of format of used for bibliography
    if (line.match(/^[\s]*[\*\-][\s]+\[\[\[[^\]]+\]\]\]/g)) {
      let extractLink = line.match(/\[\[\[[^\]]+\]\]\]/g);
      //console.log('LINE: '+ line);
      //console.log('EXTRACT LINK: '+ extractLink);
      for (let i = 0; i < extractLink.length; i++) {
        let newAnchor = extractLink[i];
        newAnchor = newAnchor.replace('[[[', '');
        newAnchor = newAnchor.replace(']]]', '');
        newAnchor = newAnchor.replace(/,.*/g, ''); // take into account ','

        registerAnchor(newAnchor);

        //console.log('NEW ANCHOR with [[[...]]]: ' + newAnchor);
      }
    }

    //find if line contains anchor with format [#anchorname] (Inline anchors)
    if (line.match(/\[#[^\]]+\]/g)) {
      let extractLink = line.match(/\[#[^\]]+\]/g);
      for (let i = 0; i < extractLink.length; i++) {
        let newAnchor = extractLink[i];
        newAnchor = newAnchor.replace('[#', '');
        newAnchor = newAnchor.replace(']', '');

        registerAnchor(newAnchor);
      }
    }

    //find if line contains anchor with format anchor:anchorname[some text]
    if (line.match(/(anchor:)[^\[]+\[[^\]]*\]/g)) {
      let extractLink = line.match(/:[^\[]+\[/g);
      for (let i = 0; i < extractLink.length; i++) {
        let newAnchor = extractLink[i];
        newAnchor = newAnchor.replace(':', '');
        newAnchor = newAnchor.replace('[', '');

        registerAnchor(newAnchor);
      }
    }

    //find internal and external references
    //with format <<anchorname>> or <<anchorname, some text>>
    //or with format <<file.adoc, some text>> or <<file#anchorname, some text>>
    if (line.match(/<<[^\>]+>>/g)) {
      //console.log('LINE-----',line)
      let extractLink = line.match(/<<[^\>]+>>/g); //there may be more than one matching items
      for (let i = 0; i < extractLink.length; i++) {
        let newReference = extractLink[i];
        newReference = newReference.replace('<<', '');
        newReference = newReference.replace('>>', '');
        newReference = newReference.replace(/,.*/g, ''); // take into account <<anchor, some text>>

        //distinguish internal and external references
        if (newReference.match(/(\.adoc)|(#)/g)) {
          //add ".adoc" if it is missing
          newReference = newReference.replace(/(\.adoc)?#/, '.adoc#');

          externalRefs.push(path.resolve(folderPath, newReference));
        } else {
          internalRefs.push(newReference);
        }
      }
    }

    //find internal and external references with format xref:link[text]
    if (line.match(/xref:[^\[]+\[[^\]]*\]/g)) {
      //console.log('LINE: ' + line);
      let extractLink = line.match(/xref:[^\[]+\[/g);
        //console.log('extractLink: ' + extractLink)
      for (let i = 0; i < extractLink.length; i++) {
        let newReference = extractLink[i];
        newReference = newReference.replace('xref:', '');
        newReference = newReference.replace('[', '');

        //distinguish internal and external references
        if (newReference.match(/(\.adoc)|(#)/g)) {
          //add ".adoc" if it is missing
          newReference = newReference.replace(/(\.adoc)?#/, '.adoc#');

          externalRefs.push(path.resolve(folderPath, newReference));
        } else {
          internalRefs.push(newReference);
        }
      }
    }
  });

  //Emit this function when the file is fully read
  reader.on('end', () => {

    // returns a promise that resolves to true if the
    // external reference exists, and to false otherwise
    function checkExternalRef(item) {
      var itemOk = true;

      //console.log('ITEM: ', item);
      return new Promise((resolve, reject) => {
        process.nextTick(() => {

          var currentLink = item.split('#');
          var targetFilePath = currentLink[0];
          var targetAnchor = currentLink[1];

          // if there is NO ref to an anchor, just check file exists
          if (!targetAnchor || targetAnchor.length === 0) {
            //console.log(item);
            if (!fs.existsSync(targetFilePath)) {
              itemOk = false;
              atom.notifications.addError(
                '`' + logMsgFilePath +
                '`: Cannot find referenced file: `' + targetFilePath + '`',
                {
                  dismissable: true,
                });
            }
          } else {
            // try to find the anchor in the target file
            try {
              var data = fs.readFileSync(targetFilePath, 'utf8');
              if (data.indexOf('[[' + targetAnchor + ']]') >= 0) {
                //all good
                //do nothing
                //console.log('LINK FINE: ' + targetAnchor);
              } else {
                // console.log(
                //   '----------------------ERROR-----------------------'
                // );
                // console.log(
                //   'Cannot find anchor!' +
                //     targetAnchor +
                //     ' in file ' +
                //     item
                // );
                itemOk = false;
                atom.notifications.addError(
                  '`' + logMsgFilePath +
                  '` : Cannot find anchor: `' + targetAnchor +
                  '` in `' + targetFilePath + '`',
                  {
                    dismissable: true,
                  }
                );
              }
            } catch (err) {
              //console.log('ERROR READING FILE', err);
              itemOk = false;
              atom.notifications.addError(
                '`' + logMsgFilePath +
                '`: Cannot find referenced file: `' + targetFilePath + '`',
                {
                  dismissable: true,
                }
              );
            }
          }

          resolve(itemOk);
        });
      });
    }

    //check all internal references
    var notFoundInternal = difference(internalRefs, anchorArray);
    if (internalRefs[0] == null) {
      atom.notifications.addSuccess(
        '`' + logMsgFilePath + '`: No internal reference found.'
      );
    } else if (notFoundInternal[0] == null) {
      atom.notifications.addSuccess(
        '`' + logMsgFilePath + '`: All internal references are `OK`.'
      );
    } else {
      notFoundInternal.forEach(function (it) {
        //console.log('Cannot find the anchor: ' + it + ' in current file.');
        atom.notifications.addError(
          '`' + logMsgFilePath + '`: Cannot find anchor: `' + it + '`.',
          {
            dismissable: true,
          }
        );
      });
    }

    //check al external references
    if (externalRefs[0] == null) {
      atom.notifications.addSuccess(
        '`' + logMsgFilePath + '`: No external reference found.');
    } else {
      //get uniques so that we only check them once
      externalRefs = uniq(externalRefs);
      Promise.all(externalRefs.map(checkExternalRef)).then(returnCodes => {
        if (!returnCodes.includes(false)) {
          atom.notifications.addSuccess(
            '`' + logMsgFilePath + '`: All external references are `OK`.'
          );
        }
      });
    }
  });

  //Emit this function when an error occurs
  reader.on('error', function (error) {
    //Do some stuff with the error
    // ....
  });

  //Start reading the file
  reader.read();
}
