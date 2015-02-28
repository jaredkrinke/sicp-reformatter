var fs = require('fs');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;
var jsLisp = require('../jsLisp/jsLisp.js');

var getCode = function (node) {
    return node.textContent.replace(/[\n\r]/g, ' ').trim();
};

var areEqual = function(expected, actual) {
    // If they're numbers, check to make sure they're roughly the same
    var expectedNumber = parseFloat(expected);
    var actualNumber = parseFloat(actual);
    if (!isNaN(expectedNumber) && !isNaN(actualNumber)) {
        var delta = Math.abs((actualNumber - expectedNumber) / expectedNumber);
        return delta < 0.00000001;
    } else {
        return actual === expected;
    }
};

// Read in the XML content
if (process.argv.length === 3) {
    fs.readFile(process.argv[2], { encoding: 'utf8' }, function (err, body) {
        if (err) {
            return console.log(err);
        }

        var doc = (new DOMParser()).parseFromString(body);

        var nodes = xpath.select('//test', doc);
        for (var i = 0, count = nodes.length; i < count; i++) {
            var node = nodes[i];
            var interpreter = new jsLisp.Interpreter();
            var input = getCode(node.childNodes[0]);

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
                var resultNode = node.childNodes[1];
                var expectedResult = resultNode.textContent.trim();

                if (expectedResult === '') {
                    console.log('*** No expected result supplied: ' + input + ' -> ' + actualResult);
                } else if (!areEqual(expectedResult, actualResult)) {
                    console.log('*** Unexpected result: ' + input + ' -> ' + actualResult + '; expected: ' + expectedResult);
                }
            } else {
                // Code didn't compile
                console.log('*** Failed to compile: ' + input + ' -> ' + actualResult);
            }
        }
    });
} else {
    console.log('USAGE: ' + process.argv[0] + ' ' + process.argv[1] + ' <Input file>');
}

