# asciidoc-reference-check
Check if all the references in the current document are valid.

**NOTE: This extension does not check hyperlinks!** 

![](https://github.com/gaurav-nelson/asciidoc-reference-check/raw/master/img/atom-ocp-linkcheck.gif)

An atom package for checking internal and external refrences for the current file in Atom editor.
See [Inline Anchor](http://asciidoctor.org/docs/asciidoc-syntax-quick-reference/#links) section in Asciidoc syntax quick reference.

## How to use
1. Open any `.adoc` file in Atom.
2. Either right click in the editor window and select `Check Refrences` option, or click `Ctrl+Alt+l`.
3. If there are any errors, they are shown as notifications.

## Features
1. Checks for duplicate anchors.
2. For internal refrences, it checks if anchors exist in current document.
3. For external refrences:
  i. checks if the file exist
  ii. checks if relevant anchor exist in that file.
4. Checks and verifies biblography anchors.

### Contributors
[Gaurav Nelson](https://github.com/gaurav-nelson) and 
[Julien Pfefferkorn](https://github.com/fritz-hh)


