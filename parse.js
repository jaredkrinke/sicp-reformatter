var fs = require('fs');

var inputDirectory = 'input';
var outputDirectory = 'output';

var normalizeText = function (text) {
    return text
        .replace(/``/g, '"')
        .replace(/''/g, '"')
        .replace(/[\n\r\f]/g, ' ')
        .replace(/<(em|strong)>/g, '<term>')
        .replace(/<\/(em|strong)>/g, '</term>')
        .replace(/<tt>/g, '<code>')
        .replace(/<\/tt>/g, '</code>')
        .replace(/<a name[^>]*?>[\s\S]*?<\/a>/gi, '');
};

var removeTags = function (text) {
    return text.replace(/<\/?[a-z0-9 "=]*?>/gi, '');
};

var titlePattern = /(<h1 class=chapter>[\s\S]*?<div class=chapterheading[\s\S]*?<\/div>[\s\S]*?<a[^>]*?>|<h2[\s\S]*?&nbsp;)([^&]*?)<\/a>[\s\S]*?<\/h[12]>/mi;
var bodyEndPattern = /(<hr.?>)|(<\/body>)/mi;
var inSubsection = false;

var bodyPatterns = [
    {
        name: 'quote',
        pattern: /<span class=epigraph>[\s\S]*?<p>([\s\S]*?)<p>[\s\S]*?<\/a>([\s\S]*?)<p>[\s\S]*?<\/span>/mi,
        handler: function (match) {
            console.log('<quote source="' + removeTags(normalizeText(match[2])) + '">');
            console.log(normalizeText(match[1]));
            console.log('</quote>');
        }
    },
    {
        name: 'paragraph',
        pattern: /^(<a [^>]*?><\/a>)*([\w][\s\S]*?)<p>$/mi,
        handler: function (match) {
            console.log('<p>' + normalizeText(match[2]) + '</p>');
        }
    },
    {
        name: 'subsection',
        pattern: /<h4><a[^>]*?>([\s\S]*?)<\/a><\/h4>/mi,
        handler: function (match) {
            if (inSubsection) {
                console.log('</subsection>');
            }
            console.log('<subsection title="' + removeTags(normalizeText(match[1])) + '">');
            inSubsection = true;
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
            console.log('<section title="' + title + '">');

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

            if (inSubsection) {
                console.log('</subsection>');
            }

            console.log('</section>');
        }

        cb();
    });
};

console.log('<content title="(learn scheme)">');
console.log('<body>');

processFile('book-Z-H-9.html', function (err) {
//processFile('book-Z-H-10.html', function (err) {
    if (err) {
        return console.log('Error: ' + err);
    }

    console.log('</body>');
    console.log('</content>');
});

