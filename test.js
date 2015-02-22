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
        var nodes = xpath.select('//code|//result', doc);
        for (var i = 0, count = nodes.length; i < count; i++) {
            var node = nodes[i];
            if (node.localName === 'code' && i + 1 < count) {
                // If a result follows, assume this code should generate the result
                var nextNode = nodes[i + 1];
                if (nextNode.localName === 'result') {
                    var interpreter = new jsLisp.Interpreter();
                    var expectedResult = nextNode.textContent.trim();
                    var input = node.textContent.trim();
                    var actualResult;
                    try {
                        actualResult = interpreter.format(interpreter.evaluate(input));
                    } catch (e) {
                        // Use undefined result to indicate errors
                    }

                    // Log result
                    if (actualResult === undefined) {
                        // Code didn't compile
                        console.log('*** Failed to compile: ' + input);
                    } else if (actualResult === expectedResult) {
                        // Got the expected result
                        console.log(input + ' -> ' + expectedResult);
                    } else {
                        // Got a different result
                        console.log('*** Unexpected result: ' + input + ' -> ' + actualResult + '; expected: ' + expectedResult);
                    }
                }
            }
        }
    });
} else {
    console.log('USAGE: ' + process.argv[0] + ' ' + process.argv[1] + ' <Input file>');
}

