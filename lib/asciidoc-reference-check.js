/**
 * @author Gaurav Nelson
 * @copyright 2017 Gaurav Nelson
 * @license MIT
 * @module atom:asciidoc-reference-check
 */


'use strict';

//to read the file line by line
var readl = require('readl-async');
//to read files referenced by external refrences
var fs = require("fs");
//to convert ../ and / and ./ to absolute paths
var path = require("path");

var substring = 'xref:';
//to ignore everything if it is commented out
var insideCommentBlock = false;


//Difference function to compare internal refrences stored in arrays
function difference(a1, a2) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
        if (a2.indexOf(a1[i]) === -1) {
            result.push(a1[i]);
        }
    }
    return result;
}


//To check for only uniqe values
function uniq(a) {
    var prims = {
            "boolean": {},
            "number": {},
            "string": {}
        },
        objs = [];

    return a.filter(function (item) {
        var type = typeof item;
        if (type in prims)
            return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
}

module.exports = {
    activate: function () {

        atom.contextMenu.add({
            'atom-text-editor': [{
                label: 'Check References',
                command: 'asciidoc-reference-check:checkReference'
            }]
        });

        atom.commands.add('atom-text-editor', {
            'asciidoc-reference-check:checkReference': function (event) {
                var allGood = true;

                var folderPath;

                //to hold anchors
                var anchorArray = [];

                //to hold internal references
                var internalRef = [];

                //to hold external references
                var externalRef = [];

                //to hold external links
                var externalLinks = [];

                //get active file from atom editor
                var ref;
                if ((ref = atom.workspace.getActiveTextEditor()) != null) {
                    // /ref.getPath();
                    //console.log(ref.getPath());
                    var fileName = ref.getPath();
                    //get directory
                    folderPath = path.parse(fileName).dir;
                    //console.log('Running for: ' + fileName);
                    //console.log('Directory: ', folderPath)

                    //lets read file contents line by line
                    //we are not reading the file from editor, but instead the file from disk
                    var reader = new readl(fileName, {
                        encoding: 'utf8',
                        emptyLines: 'true'
                    });

                    //Emit this function when one line is read: 
                    reader.on('line', function (line, index, start, end) {
                        //read file line by line
                        //ignore everything inside comment blocks

                        if (line.startsWith('////')) {
                            if (!insideCommentBlock) {
                                insideCommentBlock = true;
                                //console.log("Inside Comment Block")
                            } else {
                                insideCommentBlock = false
                                //console.log('Exiting comment block')
                            }
                        }

                        //to only check for refrences which are not in commented section
                        if (!insideCommentBlock) {

                            //find if line contains an anchor with format [[anchor]] or [[anchor, something]]
                            if (line.match(/[^\[\[][^]*?\]\]/g) && !line.startsWith('//')) {
                                var extractLink = line.match(/\[\[[^]*?\]\]/g);
                                //console.log("LINE: "+ line);
                                //console.log("EXTRACT LINK: "+ extractLink);
                                for (var i = 0; i < extractLink.length; i++) {
                                    var newAnchor = extractLink[i];
                                    newAnchor = newAnchor.replace("[[", "");
                                    newAnchor = newAnchor.replace("]]", "");

                                    //take care of anchors with comma
                                    if (newAnchor.match(/,/g)) {
                                        var tempTxt = newAnchor.split(",")
                                        newAnchor = tempTxt[0];
                                    }

                                    anchorArray.push(newAnchor);
                                    //console.log("NEW ANCHOR with [[...]]: " + newAnchor);

                                }
                                //anchorArray.push(line);
                            }

                            //find if line contains anchor with format [#anchorname] (Inline anchors)
                            if (line.match(/(\[#)[^]*?\]/g)) {
                                var extractLink = line.match(/(\[#)[^]*?\]/g)
                                for (var i = 0; i < extractLink.length; i++) {
                                    var newAnchor = extractLink[i];
                                    newAnchor = newAnchor.slice(2);
                                    newAnchor = newAnchor.slice(0, -1);

                                    //take care of anchors with comma (not required but still)
                                    if (newAnchor.match(/,/g)) {
                                        var tempTxt = newAnchor.split(",")
                                        newAnchor = tempTxt[0];
                                    }

                                    anchorArray.push(newAnchor);

                                }

                            }

                            //find if line contains anchor with format anchor:anchorname[]
                            if (line.match(/(anchor:)[^]*?\]/g) && !line.startsWith('//')) {
                                var extractLink = line.match(/(:)[^]*?\[/g);
                                for (var i = 0; i < extractLink.length; i++) {
                                    var newAnchor = extractLink[i];
                                    newAnchor = newAnchor.slice(1);
                                    newAnchor = newAnchor.slice(0, -1);

                                    anchorArray.push(newAnchor);

                                }
                            }

                            //find internal and external references
                            if (line.match(/<<[^\>]+>>/g) && !line.startsWith('//')) {

                                //console.log("LINE-----",line)
                                var extractLink = line.match(/<<[^\>]+>>/g); //there may be more than one matching items
                                for (var i = 0; i < extractLink.length; i++) {
                                    var newReference = extractLink[i];
                                    newReference = newReference.slice(2);
                                    newReference = newReference.slice(0, -2);

                                    if (newReference.match(/,/g)) {
                                        var tempTxt = newReference.split(",")
                                        newReference = tempTxt[0];
                                    }

                                    //seperate internal and external refrences
                                    if (newReference.includes('.adoc') || newReference.includes('#')) {

                                        newReference = newReference.replace(/(\.adoc)?#?$/, ".adoc");

                                        //external refrence
                                        try {
                                            var levels = newReference.match(/(\.\.\/)/g).length;
                                            var tempDir = folderPath;

                                            for (var l = 0; l < levels; l++) {
                                                //console.log("BEFORE: "+newReference);
                                                newReference = newReference.slice(3)
                                                tempDir = path.resolve(tempDir, '../');

                                                if ((l + 1) === levels) {
                                                    newReference = tempDir + "/" + newReference;
                                                    //console.log("FINAL LINK TO CHECK: : : : : : :", newReference)
                                                }
                                            }
                                        } catch (error) {
                                            //console.log("ERROR: " + error);
                                            if (newReference.match(/\.\//g)) {
                                                newReference = newReference.slice(2)
                                                newReference = folderPath + "/" + newReference;
                                            } else if (newReference.startsWith("/")) {
                                                newReference = newReference.slice(1)
                                                newReference = folderPath + "/" + newReference;
                                            }
                                        }
                                        //console.log("EXTERNAL REF: " + newReference);
                                        externalLinks.push(newReference);
                                    } else {
                                        //internal refrence
                                        internalRef.push(newReference);

                                        //console.log("INTERNAL LINK: " + newReference);

                                    }

                                }
                            }

                            //find internal and external refrences
                            if (line.match(substring) && !line.startsWith('//')) {
                                //console.log("LINE: " + line);
                                var tempLinksArr = line.match(/(xref:)[^]*?\[/g);
                                //console.log("templinksarr: " + tempLinksArr)
                                for (var i = 0; i < tempLinksArr.length; i++) {
                                    var link = tempLinksArr[i];
                                    link = link.slice(5);
                                    link = link.slice(0, -1);

                                    //seperate internal and external refrences
                                    if (link.includes('.adoc')) {
                                        //external refrence
                                        try {
                                            var levels = link.match(/(\.\.\/)/g).length;
                                            var tempDir = folderPath;

                                            for (var l = 0; l < levels; l++) {
                                                //console.log("BEFORE: "+link);
                                                link = link.slice(3)
                                                tempDir = path.resolve(tempDir, '../');


                                                if ((l + 1) === levels) {
                                                    link = tempDir + "/" + link;
                                                    //console.log("FINAL LINK TO CHECK: : : : : : :", link)
                                                }
                                            }
                                        } catch (error) {
                                            console.log("ERROR: " + error);
                                            if (link.match(/\.\//g)) {
                                                link = link.slice(2)
                                                link = folderPath + link;
                                            }
                                        }
                                        //console.log("EXTERNAL REF: " + link);
                                        externalLinks.push(link);
                                    } else {
                                        //internal refrence
                                        internalRef.push(link);

                                        //console.log("INTERNAL LINK: " + link);

                                    }

                                }
                            }
                        }

                    });

                    //Emit this function when the file is full read 
                    reader.on('end', function () {

                        if (internalRef[0] != null) {

                            //console.log(internalRefObj);
                            internalRef = uniq(internalRef);
                            //check internal refrences
                            var isSuperset = internalRef.every(function (val) {
                                return anchorArray.indexOf(val) >= 0;
                            });
                            //console.log("FOUND ALL? " + isSuperset);
                            if (!isSuperset) {
                                var cannotFindInternal = (difference(internalRef, anchorArray));
                                cannotFindInternal.forEach(function (it) {
                                    //console.log("Cannot find the anchor: " + it + " in current file.");
                                    atom.notifications.addError('Cannot find anchor: `' + it + "` in current file.", {
                                        "dismissable": true
                                    });
                                })
                            } else {
                                atom.notifications.addSuccess('All internal refrences are `OK`.');
                            }
                        } else {
                            atom.notifications.addSuccess('This file does not have any internal refrences.');
                        }

                        if (externalLinks[0] != null) {

                            //check external refrences
                            //get uniques so that we only check them once
                            externalLinks = uniq(externalLinks);
                            //console.log(externalLinks);

                            function forEachPromise(externalLinks, fn) {
                                return externalLinks.reduce(function (promise, item) {
                                    return promise.then(function () {
                                        return fn(item);
                                    });
                                }, Promise.resolve());
                            }

                            function logItem(item) {
                                return new Promise((resolve, reject) => {
                                    process.nextTick(() => {
                                        if (item.includes("#")) {
                                            var currentLink = item.split("#");
                                            var fullFilePath = currentLink[0];
                                            try {
                                                var data = fs.readFileSync(fullFilePath, 'utf8')
                                                if (currentLink[1] != undefined) {
                                                    if (data.indexOf('[[' + currentLink[1] + ']]') >= 0) {
                                                        //all good
                                                        //do nothing
                                                        //console.log("LINK FINE: " + currentLink[1]);
                                                    } else {
                                                        //console.log("----------------------ERROR-----------------------")
                                                        //console.log("Cannot find anchor!" + currentLink[1] + " in file " + item);
                                                        allGood = false;
                                                        atom.notifications.addError('Cannot find the anchor: `' + currentLink[1] + "` in **" + fullFilePath + "**.", {
                                                            "dismissable": true
                                                        });
                                                    }
                                                }
                                            } catch (err) {
                                                //console.log("ERROR READING FILE", err);
                                                allGood = false;
                                                atom.notifications.addError('Cannot find the file: `' + fullFilePath + '`.', {
                                                    "dismissable": true
                                                });
                                            }
                                            resolve();
                                        } else {
                                            //console.log(item);
                                            var fullFilePath = item;
                                            try {
                                                var data = fs.readFileSync(fullFilePath, 'utf8')

                                                if (data) {
                                                    //all good
                                                    //do nothing
                                                    //console.log("LINK FINE: " + currentLink[1]);
                                                } else {
                                                    //console.log("----------------------ERROR-----------------------")
                                                    //console.log("Cannot find anchor!" + currentLink[1] + " in file " + item);
                                                    allGood = false;
                                                    atom.notifications.addError('Cannot find the anchor: `' + currentLink[1] + "` in **" + fullFilePath + "**.", {
                                                        "dismissable": true
                                                    });
                                                }

                                            } catch (err) {
                                                //console.log("ERROR READING FILE", err);
                                                allGood = false;
                                                atom.notifications.addError('Cannot find the file: `' + fullFilePath + '`.', {
                                                    "dismissable": true
                                                });
                                            }
                                            resolve();
                                        }
                                    })
                                });
                            }


                            forEachPromise(externalLinks, logItem).then(() => {
                                if (allGood) {
                                    atom.notifications.addSuccess('All external refrences are `OK`.');
                                }
                            });

                        } else {
                            if (allGood) {
                                atom.notifications.addSuccess('No external references found.');
                            }
                        }

                    });

                    //Emit this function when an error occurs 
                    reader.on('error', function (error) {
                        //Do some stuff with the error 
                        // .... 
                    });

                    //Start reading the file 
                    reader.read();

                } else {
                    atom.notifications.addError('Cannot get reference to Atom Editor')
                }
            }
        });
    }
};
