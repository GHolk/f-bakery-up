// ==UserScript==
// @name        f-bakery-up
// @namespace   http://github.com/GHolk/
// @include     https://www.facebook.com/*
// @version     1.1
// @grant       GM_setClipboard
// @grant       GM_registerMenuCommand
// ==/UserScript==

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

class Reaction {
    constructor(name, count) {
        this.name = name
        this.count = count
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
        parent.querySelector('.userContent')
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

function extractComment(parent) {
    function parseComment(comment) {
        let authorNode = comment.querySelector('a.UFICommentActorName')
        let author = Anchor.fromNode(authorNode)

        let contentNode = comment.querySelector('.UFICommentBody')
        let content = contentNode.textContent

        let reactionNode = comment.querySelector('.UFICommentActions')
        let reaction = [] // todo

        let dateNode = comment.querySelector('.livetimestamp')
        let date = abbrToDate(dateNode)

        return new Article(author, date, content, reaction)
    }
    let comment = Array.from(parent.querySelectorAll('.UFIComment'))
    return comment.map(parseComment)
}

function extractPostReaction(parent) {
    let reactionNode = parent.querySelectorAll('.UFILikeSentence a')
    return Array.from(reactionNode)
        .map((a) => {
            let count = Number(a.querySelector('span:last-child').textContent)
            let name = String(a.getAttribute('aria-label')).slice(-1)
            return new Reaction(name, count)
        })
}

function backupPost(node) {
    return Promise.all([
        seeMore(node),
        expandComment(node)
    ]).then(() => {
        let post = extractPost(node)
        let comment = extractComment(node)
        comment.forEach((comment) => post.addReply(comment))

        return post
    })
}

try {
    GM_registerMenuCommand('backup post', getPostByClick, 'b')
}
catch (registCommandError) {
    console.error('cannot regist greasy monkey command')
}

function getPostByClick() {
    function sentToClipboard(text) {
        try {
            GM_setClipboard(text)
        }
        catch (copyError) {
            console.error('connot copy to clipboard')
        }
    }
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
            sentToClipboard(JSON.stringify(article))
        }).then(() => alert('finish'))
    }, {
        once: true
    })
}
