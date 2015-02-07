var fs = require('fs');
var htmlparser = require('htmlparser2');

var inputDirectory = 'input';
var outputDirectory = 'output';

var states = {
    initial: 0,
    inTitle: 1,
    body: 2,
    inQuote: 3,
    inSource: 4,
    pastBody: 5,
    inSubsectionTitle: 6,

    // TODO: References
};

var processFile = function (fileName, cb) {
    fs.readFile(inputDirectory + '/' + fileName, { encoding: 'utf8' }, function (err, body) {
        if (err) {
            return cb(err);
        }

        var tagStack = [];
        var state = states.initial;
        var buffer = '';

        var parser = new htmlparser.Parser({
            onopentag: function (name, attributes) {
                switch (state) {
                    case states.initial:
                        if (tagStack.length >= 4
                                && tagStack[tagStack.length - 2].name === 'h1'
                                && tagStack[tagStack.length - 1].name === 'p'
                                && name == 'a') {
                            state = states.inTitle;
                            buffer = '';
                        }
                        break;
                    
                    case states.body:
                        if (name === 'span' && attributes.class === 'epigraph') {
                            state = states.inQuote;
                            buffer = '';
                        } else if (name === 'hr') {
                            state = states.pastBody;
                        } else if (name === 'h4') {
                            state = states.inSubsectionTitle;
                        } else if (name === 'em') {
                            buffer += '<term>';
                        }
                        break;

                    case states.inQuote:
                        if (name === 'a') {
                            console.log('*** Quote body: ' + buffer.trim());
                            buffer = '';
                            state = states.inSource;
                        }
                        break;
                }

                tagStack.push({
                    name: name,
                    attributes: attributes,
                });
            },

            /*onopentagname: function (name) {
            },

            onattribute: function (name, value) {
            },*/

            ontext: function (text) {
                buffer += text.replace(/``/g, '"').replace(/''/g, '"').replace(/[\n\r\f]/g, ' ');
            },

            onclosetag: function (name) {
                switch (state) {
                    case states.inTitle:
                        console.log('*** Title: ' + buffer.trim());
                        buffer = '';
                        state = states.body;
                        break;

                    case states.inQuote:
                    case states.inSource:
                        if (name === 'span') {
                            console.log('*** Quote source: ' + buffer.trim());
                            state = states.body;
                            buffer = '';
                        }
                        break;

                    case states.body:
                        if (name === 'p' && buffer.trim().length > 0) {
                            console.log('Paragraph: ' + buffer.trim());
                            console.log('');
                            buffer = '';
                        } else if (name === 'em') {
                            buffer += '</term>';
                        }
                        break;

                    case states.inSubsectionTitle:
                        if (name === 'h4') {
                            console.log('*** Subsection: ' + buffer.trim());
                            buffer = '';
                            state = states.body;
                        }
                        break;
                }

                tagStack.pop();
            },

            onend: function () {
                console.log('End');
            },
        });

        parser.write(body);
        parser.end();

        cb();
    });
};

processFile('book-Z-H-9.html', function (err) {
    if (err) {
        return console.log('Error: ' + err);
    }

    console.log('Done');
});

