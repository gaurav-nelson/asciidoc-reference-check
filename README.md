# asciidoc-reference-check
Check if all the references in asciidoc files are valid.

![](https://github.com/gaurav-nelson/asciidoc-reference-check/raw/master/img/atom-ocp-linkcheck.gif)

An atom package for checking internal and external references:
* in the current file opened in the Atom editor.
* in an asciidoc file of the Atom treeView
* in a folder of the Atom treeView (in this case all `.adoc` files in the folder are checked recursively)

See [Inline Anchor](http://asciidoctor.org/docs/asciidoc-syntax-quick-reference/#links) section in Asciidoc syntax quick reference.

## How to use

* In the Atom editor:
  1. Open any `.adoc` file in Atom.
  2. Either right click in the editor window and select `Check References` option, or click `Ctrl+Alt+l`.
* In the Atom treeView
  1. right click an `.adoc` file or a folder in the Atom treeView and select `Check References` option.

If there are any errors, they are shown as notifications.

## Features

* Checks for duplicate anchors in a file
* For internal references, it checks if anchors exist in current document.
* For external references to local files:
  * checks if the file exist
  * in case the reference point to an anchor, checks if it exists.
* For hyperlinks, check if the target is reachable

## Supported Anchors and References

* Anchors:
  * standard anchors: `[[anchor]]` and `[[anchor, description]]`
  * bibliography anchors: `* [[[anchor]]]` or `* [[[anchor, description]]]`
  * inline anchors: `[#anchorname]` and `anchor:anchorname[description]`
* References:
  * Internal references: `<<anchorname>>` or `<<anchorname, description>>`
  * External references to `.adoc` files:
    * `<<path/to/file.adoc>>`, `<<path/to/file.adoc#section>>`, `<<path/to/file#section>>` or with an additional description (e.g. `<<path/to/file.adoc, description>>`)
    * `xref:path/to/file.adoc[description]`
  * External references to other types of files: `link:path/to/file[description]`
  * Hyperlinks using the `link:` macro (e.g. `link:URI[description]`) or without: `http://www.google.com`

### Contributors
[Gaurav Nelson](https://github.com/gaurav-nelson) and
[Julien Pfefferkorn](https://github.com/fritz-hh)
