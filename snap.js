
class Article {
    constructor(author, date, content) {
        this.author = author
        this.date = date
        this.content = content
        this.reply = []
    }
    addReply(article) {
        this.reply.push(article)
    }
}

class Anchor {
    constructor(text, url) {
        this.text = text
        this.url = url
    }
    static fromNode(node) {
        var text = $(node).text()
        var url = $(node).attr('href')
        return new this(text, url)
    }
}

function abbrToDate(abbr) {
    var timeText = $(abbr).attr('title')
    var wellTimeText = timeText.replace(/[^0-9:]/g, ' ')
    return new Date(wellTimeText)
}

function extractPost(parent) {
    var authorNode = $(parent).find('h5 a')
    var author = Anchor.fromNode(authorNode)

    var dateNode = $(parent).find('abbr:has(.timestampContent)')
    var date = abbrToDate(dateNode)

    var content = findPostContent(parent)

    return new Article(author, date, content)
}

var article = extractPost($('div'))

function findPostContent(parent) {
    var contentNode = $(parent).find('.userContent div > span:first-child')
    return contentNode.text()
}
