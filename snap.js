
class Article {
    constructor(author, date, content, reaction) {
        this.author = author
        this.date = date
        this.content = content
        this.reaction = reaction
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
        var text = node.textContent
        var url = node.href
        return new this(text, url)
    }
}

function abbrToDate(abbr) {
    var timeText = abbr.title
    var wellTimeText = timeText.replace(/[^0-9:]/g, ' ')
    return new Date(wellTimeText)
}

function extractPost(parent) {
    var authorNode = parent.querySelector('h5 a')
    var author = Anchor.fromNode(authorNode)

    var dateNode = parent.querySelector('.timestampContent').parentNode
    var date = abbrToDate(dateNode)

    var content = findPostContent(parent)
    var reaction = extractPostReaction(parent)

    return new Article(author, date, content, reaction)
}

function findPostContent(parent) {
    var contentNode =
        parent.querySelector('.userContent div > span:first-child')
    return contentNode.textContent
}

function reduceNode(node) {
    function allChildren(node) {
        return Array.from(node.childNodes)
    }
    function isTextNode(node) {
        return node.nodeType == 3 && node.nodeValue
    }
    function clone(node) {
        let deep
        return node.cloneNode(deep = false)
    }
    function isEmptyTextNode(node) {
        return isTextNode(node) && !node.nodeValue.trim()
    }
    function recur(node) {
        if (isTextNode(node)) return clone(node)
        else {
            let children = allChildren(node)
            children = children.filter((node) => !isEmptyTextNode(node))
            
            if (children.length == 0) return clone(node)
            if (children.length == 1) return recur(children[0])
            else {
                let newNode = clone(node)
                children.reduce((parent, child) => {
                    parent.appendChild(recur(child))
                    return parent
                }, newNode)
                return newNode
            }
        }
    }
    function trimNormalize(node) {
        let deep
        let newNode = node.cloneNode(deep = true)
        newNode.normalize()
        return newNode
    }
    return recur(trimNormalize(node))
}

function sleep(minisecond) {
    return new Promise((wake) => setTimeout(wake, minisecond))
}

function expandComment(node) {
    return new Promise(function tryExpand(finishExpand) {
        let expandNode = Array.from(
            node.querySelectorAll('a.UFIPagerLink, a.UFICommentLink')
        )

        if (expandNode.length == 0) finishExpand(node)
        else {
            expandNode.forEach((anchor) => anchor.click())
            sleep(1000).then(() => tryExpand(finishExpand))
        }
    })
}

function seeMore(node) {
    return new Promise(function tryExpand(finishExpand) {
        let expandNode = node.querySelector('a.see_more_link')
        if (!expandNode) finishExpand(node)
        else {
            expandNode.click()
            sleep(1000).then(() => tryExpand(finishExpand))
        }
    })
}

function extractCommentReaction(parent) {
    let reaction
}

function extractPostReaction(parent) {
    let reactionNode = parent.querySelector('UFILikeSentence a')
    return reactionNode
        .map((a) => a.querySelector('span:last-child'))
        .map((span) => span.textContent)
        .map(Number)
}

function backupPost(node) {
    return Promise.all([
        seeMore(node),
        expandComment(node)
    ]).then(() => extractPost(node))
}

// GM_registerMenuCommand('backup post', getPostByClick, 'b')
function getPostByClick() {
    function findPost(node) {
        if (node.classList.contains('fbUserStory')) return node
        else {
            let parent = node.parentNode
            if (parent) return findPost(parent)
            else return null
        }
    }
    document.addEventListener('click', function (clickEvent) {
        clickEvent.preventDefault()
        let postNode = findPost(clickEvent.target)
        backupPost(postNode).then((article) => {
            window.article = article
            // GM_setClipboard(JSON.stringify(article))
            alert(JSON.stringify(article))
        })
    }, {
        once: true
    })
}
