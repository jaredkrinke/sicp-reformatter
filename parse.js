var fs = require('fs');

var inputDirectory = 'input';
var outputDirectory = 'output';

var normalizeText = function (text) {
    return text
        .replace(/``/g, '"')
        .replace(/''/g, '"')
        .replace(/[\n\r\f]/g, ' ')
        .replace(/<p>/g, '')
        .replace(/<br>/g, '\n')
        .replace(/<a (name|href)[^>]*?>[\s\S]*?<\/a>/gi, '')
        .replace(/<(em|strong)>/g, '<term>')
        .replace(/<\/(em|strong)>/g, '</term>')
        .replace(/<(tt|i)>/g, '<code>')
        .replace(/<\/(tt|i)>/g, '</code>')
        ;
};

var removeTags = function (text) {
    return text.replace(/<\/?[a-z0-9 "=]*?>/gi, '');
};

var formatPre = function (text) {
    return text
        .replace(/&nbsp;/gi, ' ')
        .replace(/<br>/gi, '')
        .replace(/<i>/gi, '</code>\n<result>')
        .replace(/<\/i>/gi, '</result>\n<code>')
        .replace(/<a (name|href)[^>]*?>[\s\S]*?<\/a>/gi, '')
        .trim()
        ;
};

var bodyEndPattern = /(<hr.?>)|(<\/body>)/mi;
var depth = 0;
var inSubsection = false;

var bodyPatterns = [
    {
        name: 'title',
        pattern: /(<h1 class=chapter>[\s\S]*?<div class=chapterheading[\s\S]*?<\/div>[\s\S]*?<a[^>]*?>|<h[23][\s\S]*?&nbsp;)([^&]*?)<\/a>[\s\S]*?<\/h[123]>/mi,
        handler: function (match) {
            var sectionDepth = parseInt(match[1].substr(2, 1));
            if (sectionDepth !== NaN) {
                while (depth-- >= sectionDepth) {
                    console.log('</section>');
                }

                console.log('<section title="' + removeTags(normalizeText(match[2])) + '">');
                depth = sectionDepth;
            }
        }
    },
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
        pattern: /^(<a [^>]*?><\/a>)*(([\w]|<tt>[^<]*?<\/tt>)[\s\S]*?)<p>$/mi,
        handler: function (match) {
            if (depth > 0) {
                console.log('<p>' + normalizeText(match[2]) + '</p>');
            }
        }
    },
    {
        name: 'resultOnly',
        pattern: /<tt><i>([\s\S]*?)<\/i><br>\n<\/tt>/mi,
        handler: function (match) {
            console.log('<result>\n' + formatPre(match[1]) + '\n</result>');
        }
    },
    {
        name: 'code',
        pattern: /<tt>([\s\S]*?)<br>\n<\/tt>/mi,
        handler: function (match) {
            var text = '<code>\n' + formatPre(match[1]) + '\n</code>';
            console.log(text.replace(/<code>\n<\/code>/mgi, ''));
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

        var bodyEndMatches = bodyEndPattern.exec(body);
        if (bodyEndMatches) {
            // Parse body content
            var content = body.substr(0, bodyEndMatches.index);

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

        while (depth-- > 0) {
            console.log('</section>');
        }

        cb();
    });
};

console.log('<content title="(learn scheme)">');
console.log('<body>');

//processFile('book-Z-H-9.html', function (err) {
processFile('book-Z-H-10.html', function (err) {
    if (err) {
        return console.log('Error: ' + err);
    }

    console.log('</body>');
    console.log('</content>');
});

