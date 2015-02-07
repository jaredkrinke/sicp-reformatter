var fs = require('fs');

var inputDirectory = 'input';
var outputDirectory = 'output';

var normalizeText = function (text) {
    return text
        .replace(/``/g, '"')
        .replace(/''/g, '"')
        .replace(/[\n\r\f]/g, ' ')
        .replace('<em>', '<term>')
        .replace('</em>', '</term>')
        .replace(/<a name[^>]*?>[\s\S]*?<\/a>/gi, '');
};

var titlePattern = /<h1 class=chapter>[\s\S]*?(<div class=chapterheading[\s\S]*?<\/div>[\s\S]*?)?<a[^>]*?>([\s\S]*)<\/a>[\s\S]*?<\/h1>/mi;
var bodyEndPattern = /(<hr.?>)|(<\/body>)/mi;

var bodyPatterns = [
    {
        name: 'quote',
        pattern: /<span class=epigraph>[\s\S]*?<p>([\s\S]*?)<p>[\s\S]*?<\/a>([\s\S]*?)<p>[\s\S]*?<\/span>/mi,
        handler: function (match) {
            console.log('Quote: ' + normalizeText(match[1]));
            console.log('Quote source: ' + normalizeText(match[2]));
        }
    },
    {
        name: 'paragraph',
        pattern: /^([\w][\s\S]*?)<p>$/mi,
        handler: function (match) {
            console.log('Paragraph: ' + normalizeText(match[1]));
        }
    },
];
var bodyPatternCount = bodyPatterns.length;

var processFile = function (fileName, cb) {
    fs.readFile(inputDirectory + '/' + fileName, { encoding: 'utf8' }, function (err, body) {
        if (err) {
            return cb(err);
        }

        var titleMatches = titlePattern.exec(body);
        if (titleMatches) {
            var title = titleMatches[2];
            console.log('Title: ' + title);

            // Parse after the title
            var postTitle = body.substr(titleMatches.index + titleMatches[0].length);

            var bodyEndMatches = bodyEndPattern.exec(postTitle);
            if (bodyEndMatches) {
                // Parse body content
                var content = postTitle.substr(0, bodyEndMatches.index);

                while (content.length > 0) {
                    // Find the first match
                    var matches = [];
                    var minIndex = null;
                    var patternIndex = null;
                    for (var i = 0; i < bodyPatternCount; i++) {
                        matches[i] = bodyPatterns[i].pattern.exec(content);
                        if (matches[i]) {
                            if (minIndex == null || matches[i].index < minIndex) {
                                minIndex = matches[i].index;
                                patternIndex = i;
                            }
                        }
                    }

                    // Process the match (if one was found)
                    if (minIndex == null) {
                        // No matches, so we're done
                        break;
                    } else {
                        // Process the first match
                        var match = matches[patternIndex];
                        bodyPatterns[patternIndex].handler(match);
                        content = content.substr(match.index + match[0].length);
                    }
                }
            }
        }

        cb();
    });
};

processFile('book-Z-H-9.html', function (err) {
    if (err) {
        return console.log('Error: ' + err);
    }

    console.log('Done');
});
