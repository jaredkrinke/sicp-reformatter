var fs = require('fs');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;
var jsLisp = require('../jsLisp/jsLisp.js');

// Read in the XML content
if (process.argv.length === 3) {
    fs.readFile(process.argv[2], { encoding: 'utf8' }, function (err, body) {
        if (err) {
            return console.log(err);
        }

        // Make sure that code blocks produce the expected results
        var doc = (new DOMParser()).parseFromString(body);
        var inlineCodeFilter = '//p//code[count(parent::footnote) = 0] | //figure/caption/code | //ul//code';
        var nodes = xpath.select('//code[count(.|' + inlineCodeFilter + ') > count(' + inlineCodeFilter + ')]|//result', doc);
        for (var i = 0, count = nodes.length; i < count; i++) {
            var node = nodes[i];
            if (node.localName === 'code' && i + 1 < count && node.getAttribute('valid') !== 'false') {
                var interpreter = new jsLisp.Interpreter();
                var input = node.textContent.replace(/[\n\r]/g, ' ').trim();

                // Evaluate the code
                var compiled = false;
                var actualResult = undefined;
                try {
                    actualResult = interpreter.evaluate(input);
                    if (actualResult !== undefined) {
                        actualResult = interpreter.format(actualResult);
                    }
                    compiled = true;
                } catch (e) {
                    actualResult = e.toString();
                }

                if (compiled) {
                    // If a result element follows, assume this code should generate the result
                    var nextNode = nodes[i + 1];
                    if (nextNode.localName === 'result') {
                        var expectedResult = nextNode.textContent.trim();

                        // Log result
                        if (actualResult === expectedResult) {
                            // Got the expected result
                            //console.log(input + ' -> ' + expectedResult);
                        } else {
                            // Got a different result
                            console.log('*** Unexpected result: ' + input + ' -> ' + actualResult + '; expected: ' + expectedResult);
                        }
                    } else {
                        // Just log the code if there's no following result
                        //console.log(input + ' (not evaluated)');
                    }
                } else {
                    // Code didn't compile
                    console.log('*** Failed to compile: ' + input + ' -> ' + actualResult);
                }
            }
        }
    });
} else {
    console.log('USAGE: ' + process.argv[0] + ' ' + process.argv[1] + ' <Input file>');
}

