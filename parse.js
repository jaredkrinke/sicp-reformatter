var fs = require('fs');

var inputDirectory = 'input';
var outputDirectory = 'output';

var removeEntities = function (text) {
    return text
        .replace(/&nbsp;/g, ' ')
        ;
};

var insertFootnoteReferences = function (text, context) {
    var pattern = /<a [^>]*?><sup><small>([0-9]+?)<\/small><\/sup><\/a>/gi;
    var match;
    var result = '';
    var index = 0;
    var footnotes = context.footnotes;

    while (match = pattern.exec(text)) {
        if (index < match.index) {
            result += text.substring(index, match.index);
        }

        var number = parseInt(match[1]);
        if (footnotes[number]) {
            result += '<footnote number="' + number + '"/>';
        } else {
            throw 'Broken footnote reference: ' + number;
        }

        index = match.index + match[0].length;
    }

    return result + text.substr(index);
};

var normalizeText = function (text) {
    return text
        .replace(/``/g, '"')
        .replace(/''/g, '"')
        .replace(/[\n\r\f]/g, ' ')
        .replace(/<p>/g, '')
        .replace(/<\/?font[^>]*?>/g, '')
        .replace(/<br>/g, '\n')
        .replace(/<\/?blockquote>/g, '')
        .replace(/<(em|strong)>/g, '<term>')
        .replace(/<\/(em|strong)>/g, '</term>')
        .replace(/<tt>\.\.\.<\/tt>/g, '...')
        .replace(/<(tt|i)>/g, '<code>')
        .replace(/<\/(tt|i)>/g, '</code>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&curren;/g, '&#x00A4;')
        .replace(/&times;/g, '&#x00D7;')
        .replace(/&Aacute;/g, '&#x00C1;')
        .replace(/&aacute;/g, '&#x00E1;')
        .replace(/&Agrave;/g, '&#x00C0;')
        .replace(/&agrave;/g, '&#x00E0;')
        .replace(/&eacute;/g, '&#x00E9;')
        .replace(/&ouml;/g, '&#x00F6;')
        .replace(/&uuml;/g, '&#x00FC;')
        .replace(/&middot;/g, '&#x00B7;')
        .replace(/&plusmn;/g, '&#x00B1;')
        .replace(/<a (name|href)[^>]*?>([\s\S]*?)<\/a>/gi, '$2')
        .replace(/<div align="?left"?><img src="(.*?)"[^>]*?><\/div>/gi, '<image path="$1"/>')
        .replace(/(<img[^>]*?)>/gi, '$1 />')
        .replace(/<\/?div[^>]*?>/g, '')
        .replace(/<table border=0>/g, '<table border="0">')
        .replace(/<td valign=top ?>/g, '<td valign="top">')
        ;
};

var removeTags = function (text) {
    return text.replace(/<\/?[a-z0-9 "=]*?>/gi, '');
};

var formatUl = function (text) {
    return text
        .replace(/<li>/g, '</li>\n<li>')
        ;
};

var formatPre = function (text) {
    return text
        .replace(/&nbsp;/gi, ' ')
        .replace(/<\/?(br|em|sub|tt)>/gi, '')
        .replace(/<i>/gi, '</code>\n<result>')
        .replace(/<\/i>/gi, '</result>\n<code>')
        .replace(/<a (name|href)[^>]*?>[\s\S]*?<\/a>/gi, '')
        .replace(/<img[^>]*?>/gi, '')
        .trim()
        .replace(/<code>\n*/gi, '<code>')
        .replace(/<result>\n*/gi, '<result>')
        .replace(/\n*<\/code>/gi, '</code>')
        .replace(/\n*<\/result>/gi, '</result>')
        ;
};

var formatTable = function (text) {
    return removeEntities(text
        .replace(/<table/gi, '<table class="table"')
        .replace(/([a-z]+)=([a-z0-9%]+)/gi, '$1="$2"')
        .replace(/(<img[^>]*?)>/gi, '$1 />')
        .replace(/<tt>/gi, '<code>')
        .replace(/<\/tt>/gi, '</code>')
        .replace(/<p>/gi, '')
        );
};

var removeNestedCode = function (text) {
    var pattern = /<\/?tt>/gm;
    var match;
    var depth = 0;
    var lastIndex = 0;
    var result = ''
    while (match = pattern.exec(text)) {
        var open = (match[0].length == 4);

        // Ignore nested opening and closing tags
        if ((open && depth > 0) || (!open && depth > 1)) {
            // Nested
            result += text.substring(lastIndex, match.index);
            lastIndex = match.index + match[0].length;
        }

        depth += (open ? 1 : -1);
        if (depth < 0) {
            // Ignore orphaned closing tags
            depth = 0;
        }
    }

    result += text.substr(lastIndex);

    return result;
};

var bodyEndPattern = /(<hr.?>)|(<\/body>)/mi;
var depth = 0;
var inSubsection = false;
var inExercise = false;

var closeOpenTags = function () {
    var result = '';

    if (inExercise) {
        result += '</exercise>\n';
        inExercise = false;
    }
    
    if (inSubsection) {
        result += '</subsection>\n';
        inSubsection = false;
    }

    return result;
};

var bodyPatterns = [
    {
        name: 'title',
        pattern: /(<html[\s\S]*?)?(<h1 class=chapter>[\s\S]*?<div class=chapterheading[\s\S]*?<\/div>[\s\S]*?<a[^>]*?>|<h[23][\s\S]*?&nbsp;)([^&]*?)<\/a>[\s\S]*?<\/h[123]>/mi,
        handler: function (match) {
            var sectionDepth = parseInt(match[2].substr(2, 1));
            var result = '';
            if (sectionDepth !== NaN) {
                result += closeOpenTags();
                while (depth-- >= sectionDepth) {
                    result += '</section>\n';
                }

                result += '<section title="' + removeTags(normalizeText(match[3])) + '">\n';
                depth = sectionDepth;
            }

            return result;
        }
    },
    {
        name: 'quote',
        pattern: /(<p>)?[\s]*\n?(<div[^>]*?>)?[\s]*\n?(<table[^>]*?><tr><td>)?[\s]*\n?<span class=epigraph>[\s\S]*?<p>([\s\S]*?)<p>[\s\S]*?<\/a>([\s\S]*?)<p>[\s\S]*?<\/span>/mi,
        handler: function (match) {
            var result = '<quote source="' + removeTags(normalizeText(match[5])) + '">';
            result += normalizeText(match[4]);
            result += '</quote>\n';
            return result;
        }
    },
    {
        name: 'bullets',
        pattern: /(<a [^>]*?><\/a>)*(<p>)?<ul>[\s\S]*?<li>([\s\S]*?)<\/ul>/mi,
        handler: function (match, context) {
            return '<ul>\n<li>' + formatUl(normalizeText(insertFootnoteReferences(match[3], context))) + '</li>\n</ul>\n';
        }
    },
    {
        name: 'image',
        pattern: /(<p>)?<div align="?left"?><img src="(.*?)"[^>]*?><\/div>/mi,
        handler: function (match) {
            return '\n<image path="' + match[2] + '"/>\n';
        }
    },
    {
        name: 'figureWithImageOnly',
        pattern: /^(<a [^>]*?><\/a>)*(<p>)?<div align=left[^>]*?><table[^>]*?><tr><td>(<div[^>]*?>)?\n?<img src="(.*?)"[^>]*?>[\s\S]*?<\/td><\/tr><caption[^>]*?>[\s\S]*?<b>Figure [0-9.]+?:?<\/b>&nbsp;&nbsp;([\s\S]*?)<\/div><\/caption>[\s\S]*?<\/table><\/div>/mi,
        handler: function (match) {
            var result = '\n<figure image="' + match[4] + '">';
            result += '<caption>' + normalizeText(match[5]) + '</caption>';
            result += '</figure>\n';
            return result;
        }
    },
    {
        name: 'figure',
        pattern: /(<a [^>]*?><\/a>)*(<p>)?<div align=left[^>]*?><table[^>]*?><tr><td>([\s\S]*?)<\/td>[\s\S]*?<caption[^>]*?>[\s\S]*?<b>Figure [0-9.]+?:?<\/b>&nbsp;&nbsp;([\s\S]*?)<\/div><\/caption>[\s\S]*?<\/table><\/div>/mi,
        handler: function (match, context) {
            var result = '\n<figure>';
            result += '<content>' + parseBody(match[3], context) + '</content>';
            result += '<caption>' + normalizeText(match[4]) + '</caption>';
            result += '</figure>\n';
            return result;
        }
    },
    {
        name: 'table',
        pattern: /(<a [^>]*?><\/a>)*(<p>)?(<div[^<]*?)?(<table[\s\S]*?<\/table>)(<\/div>)?/mi,
        handler: function (match) {
            return formatTable(match[4]);
        }
    },
    {
        name: 'exercise',
        pattern: /^(<p>)?(<a [^>]*?><\/a>)*\n?<b>Exercise [0-9.]+?\.<\/b>&nbsp;&nbsp;/mi,
        handler: function (match, context) {
            var result = closeOpenTags();
            inExercise = true;
            return result + '\n<exercise>';
        }
    },
    {
        name: 'paragraph',
        pattern: /^(<p>)*(<a [^>]*?><\/a>)*(\n|<br>)?(([\w\(`'&]|<(b|tt)>[^<]*?<\/(tt|b)>)[\s\S]*?)<p>/mi,
        handler: function (match, context) {
            var result = '';
            if (depth > 0) {
                result += '<p>' + normalizeText(insertFootnoteReferences(match[4], context)) + '</p>\n';
            }

            return result;
        }
    },
    {
        name: 'resultOnly',
        pattern: /<tt><i>([\s\S]*?)<\/i><br>\n<\/tt>/mi,
        handler: function (match) {
            return '<result>' + formatPre(match[1]) + '</result>\n';
        }
    },
    {
        name: 'code',
        pattern: /<tt>([\s\S]*?)(<\/tt>(<p>|<br>)|<br>\n(<tt>([^<]*?)<\/tt>)?<\/tt>)/mi,
        handler: function (match) {
            var text = '<code>' + formatPre(match[1]);
            if (match[5]) {
                text += formatPre('<i>' + match[5] + '</i>');
            }

            text += '</code>\n';

            return text;
        }
    },
    {
        name: 'codeInQuote',
        pattern: /<blockquote>\n<p><a [^>]*?><\/a>(<tt>[\s\S]*?)<\/blockquote>/mi,
        handler: function (match, context) {
            var parts = parseBody(match[1], context, true);
            return parts.result + '\n<p>' + normalizeText(parts.extra) + '</p>\n';
        }
    },
    {
        name: 'subsectionHeader',
        pattern: /<h4><a[^>]*?>([\s\S]*?)<\/a><\/h4>/mi,
        handler: function (match) {
            var result = closeOpenTags();
            result += '<subsection title="' + removeTags(normalizeText(match[1])) + '">';
            inSubsection = true;

            return result;
        }
    },
];
var bodyPatternCount = bodyPatterns.length;

var footnotePattern = /<p><a name="footnote[^>]*?><sup><small>([0-9]+?)<\/small><\/sup><\/a> ?/gmi;

var parseBody = function (content, context, returnExtra) {
    var result = '';

    // First, remove nested code blocks
    content = removeNestedCode(content);

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
            result += bodyPatterns[patternIndex].handler(match, context);
            content = content.substr(match.index + match[0].length);
        }
    }

    // Now actually insert footnote content
    var pattern = /<footnote number="([0-9]+?)"\/>/gm;
    var beforeFootnotes = result;
    var match;
    while (match = pattern.exec(beforeFootnotes)) {
        result = result.replace(match[0], '<footnote>' + parseBody(context.footnotes[parseInt(match[1])] + '\n<p>', context) + '</footnote>');
    }

    // Finally clean up empty code/result blocks
    result = result
        .replace(/<code><\/code>\n*/mgi, '')
        .replace(/<\/result>\n*<result>/mgi, '\n')
        ;

    if (returnExtra) {
        return {
            result: result,
            extra: content,
        };
    }

    return result;
};

var processFile = function (fileName, cb) {
    fs.readFile(inputDirectory + '/' + fileName, { encoding: 'utf8' }, function (err, body) {
        if (err) {
            return cb(err);
        }

        var result = '';
        var bodyEndMatches = bodyEndPattern.exec(body);
        if (bodyEndMatches) {
            // Extract all the footnotes first
            var footnotes = [];
            var footnoteSectionPattern = /<div class="?footnote"?[^>]*?>([\s\S]*)<\/div>\n*<p><div class="?navigation/gmi;
            var footnoteSectionMatch = footnoteSectionPattern.exec(body);
            if (footnoteSectionMatch) {
                var footnoteSection = footnoteSectionMatch[1];
                var lastNumber;
                var lastIndex;
                var match;
                while (match = footnotePattern.exec(footnoteSection)) {
                    if (lastIndex !== undefined) {
                        footnotes[lastNumber] = footnoteSection.substring(lastIndex, match.index);
                    }
                    lastIndex = match.index + match[0].length;
                    lastNumber = parseInt(match[1]);
                }

                if (lastIndex !== undefined) {
                    footnotes[lastNumber] = footnoteSection.substring(lastIndex);
                }
            }

            // Parse body content
            var context = {
                footnotes: footnotes,
            };

            result += parseBody(body.substr(0, bodyEndMatches.index), context);
        }

        result += closeOpenTags();

        cb(null, result);
    });
};

console.log('<content title="(learn scheme)">');
console.log('<body>');

var files = [];
for (var i = 9; i <= 35; i++) {
    files.push('book-Z-H-' + i + '.html');
}

var processFiles = function (files, cb) {
    var file = files[0];
    var remainingFiles = files.slice(1);
    processFile(file, function (err, result) {
        if (err) {
            return cb(err);
        }

        console.log(result);

        if (remainingFiles.length > 0) {
            processFiles(remainingFiles, cb);
        } else {
            cb(null);
        }
    });
};

processFiles(files, function (err) {
    if (err) {
        return console.log('Error: ' + err);
    }

    while (depth-- > 0) {
        console.log('</section>');
    }

    console.log('</body>');
    console.log('</content>');
});

