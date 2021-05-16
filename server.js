const express = require('express')
const mongoose = require("mongoose")
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {secret} = require('./config')
const jwt_decode = require('jwt-decode')
const multer = require('multer')
const cookieParser = require('cookie-parser')
const Schema = mongoose.Schema;

const articleScheme = new Schema({
    title: String,
    description: String,
    date: String,
    likes: Number,
    dislikes: Number,
    views: Number,
    file: String,
    author: String,
    comments: Array,
    topic: String
}, {versionKey: false})

const userSchema = new Schema({
    email: {type: String, unique: true, required: true},
    pass: {type: String, unique: true, required: true},
    viewedArticles: Array,
    likes: Number,
    dislikes: Number,
    numberArticlesWritten: Number,
    dateOfRegistration: String
}, {versionKey: false})

const articles = mongoose.model("Article", articleScheme)
const users = mongoose.model("User", userSchema)

const path = require('path')
const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'images')))
app.use(express.static(path.resolve(__dirname, 'client')))
app.use(express.static(path.resolve(__dirname, 'uploads')))

app.use(express.json())
app.use(cookieParser())

app.use(express.static(__dirname));

var storage = multer.diskStorage({
    destination: './public/uploads',
    filename: function (req, file, cb) {
        switch (file.mimetype) {
            case 'image/jpeg':
                ext = '.jpeg';
        }
        cb(null, file.originalname);
    }
});

var upload = multer({storage: storage});

app.use(upload.single('photo'));


app.post('/api/loadImage',  (req, res) => {
    console.log(JSON.stringify(req.photo))
    let fil = {...req.file}
    console.log(fil)
})

const generateAccessToken = (id, name) => {
    const payload = {
        id,
        name
    }
    return jwt.sign(payload, secret, {expiresIn: "24h"})
}

app.get('/api/getTenArticles/:flag', (req, res) => {
    try {
        let flag = Number(req.params.flag) * 10
        if (flag === 10) {
            articles.find(function (err, articles) {
                res.status(200).json(articles)
            }).limit(10)
        } else {
            flag -= 10
            articles.find(function (err, articles) {
                res.status(200).json(articles)
            }).skip(flag).limit(10)
        }
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'Error retrieving data from the database'})
    }
})
app.get('/api/getCountPages', (req, res) => {
    try {
        articles.find({}, function (e, doc) {
            if ((doc % 10) !== 0) {
                let countPages = Math.floor(doc / 10) + 1
                res.status(200).json(countPages)
            } else {
                let countPages = doc / 10
                res.status(200).json(countPages)
            }
        }).count()
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'Error retrieving data from the database'})
    }
})
app.get('/api/getFilteredArticles/:filter', (req, res) => {
    try {
        articles.find({topic: req.params.filter}, function (e, articles) {
            if (articles.length !== 0) {
                res.status(200).json(articles)
            } else res.status(200).json(null)
        })
    } catch (e) {
        res.status(400).json({message: 'Error filtering articles'})
    }
})
app.get(`/api/articles/:id`, (req, res) => {
    try {
        articles.find({_id: req.params.id}, function (err, article) {
            res.status(200).json(article)
        });
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'Error retrieving data from the database'})
    }
})
app.get(`/api/searchArticle/:article`, (req, res) => {
    try {
        articles.find({title: req.params.article}, function (err, article) {
            res.status(200).json(article)
        });
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'Error retrieving data from the database'})
    }
})
app.get(`/api/getAuthorArticle/:author`, (req, res) => {
    try {
        users.find({email: req.params.author}, function (err, author) {
            res.status(200).json({author})
        });
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'Error retrieving data from the database'})
    }
})
app.get('/api/checkAccess', (req, res) => {
    try {
        let cookie = req.cookies['token']
        if (typeof cookie !== 'undefined') {
            let checkingTokenResult = jwt.verify(cookie, secret)
            res.status(201).json({message: checkingTokenResult})
        } else {
            res.status(403).json({message: "you are not authorized"})
        }
    } catch (e) {
        console.log(e)
        res.status(403).json({message: "you are not authorized"})
    }
})
app.post('/api/articles', (req, res) => {
    let author = jwt_decode(req.cookies['token']).name
    try {
        let article = {...req.body}
        console.log(article)
        addArticleToBD(article, author)
        users.updateOne({email: author}, {$inc: {numberArticlesWritten: 1}}, function (e) {
            if (e) return console.log(e)
        })
        res.status(201).json(article)
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'error of adding article to database'})
    }
})

app.post('/api/userSignIn', (req, res) => {
    let user = {...req.body}
    Authorization(user, req, res)
})
app.post('/api/userSignUp', (req, res) => {
    let user = {...req.body}
    Registration(user, req, res)
})
app.put('/api/exit', (req, res) => {
    try {
        let token = req.cookies['token']
        if (typeof token !== 'undefined') {
            res.clearCookie('token', {httpOnly: true});
            res.status(200).json({message: "OK"})
        } else {
            res.status(403).json({message: "you are not authorized"})
        }
    } catch (e) {
        console.log(e)
        res.status(403).json({message: "you have not successfully logged out"})
    }

})
app.put('/api/addMark/:id/:flagMark/:author', (req, res) => {
    let author = jwt_decode(req.cookies['token']).name
    try {
        let idArticle = req.params.id
        let mark = Number(req.params.flagMark)
        users.findOne({
            email: author,
            'viewedArticles.idArticle': idArticle
        }, {viewedArticles: {$elemMatch: {idArticle: idArticle}}, _id: 0}, function (e, doc) {
            if (mark === 1) {
                users.updateOne({
                    email: author,
                    'viewedArticles.idArticle': idArticle
                }, {"$inc": {'viewedArticles.$.appraisal': 1}}, function (e, doc) {//like
                    if (e) return console.log(e)
                })
                articles.updateOne({_id: req.params.id}, {$inc: {likes: 1}}, function (e) {
                    if (e) return console.log(e);
                })
                users.updateOne({email: req.params.author}, {$inc: {likes: 1}}, function (e) {
                    if (e) return console.log(e);
                })
            } else {
                users.updateOne({
                    email: author,
                    'viewedArticles.idArticle': idArticle
                }, {"$inc": {'viewedArticles.$.appraisal': 2}}, function (e, doc) {//dislike
                    if (e) return console.log(e)
                })
                articles.updateOne({_id: req.params.id}, {$inc: {dislikes: 1}}, function (e) {
                    if (e) return console.log(e);
                })
                users.updateOne({email: req.params.author}, {$inc: {dislikes: 1}}, function (e) {
                    if (e) return console.log(e);
                })
            }
        });
        res.status(200).json({message: "mark set"})
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'Error Like mark set'})
    }
})
app.put('/api/saveComment/:id', (req, res) => {
    let newComment = {...req.body}
    newComment.author = jwt_decode(req.cookies['token']).name

    try {
        articles.update({_id: req.params.id}, {$addToSet: {comments: newComment}}, function (e, doc) {
            if (e) return console.log(e);
        })
        res.status(200).json(newComment)
    } catch (e) {
        console.log(e)
        res.status(400).json({message: 'Error message saving'})
    }
})
app.put('/api/userTraces/:id/:newId', (req, res) => {
    if (req.cookies['token'] !== undefined) {
        let author = jwt_decode(req.cookies['token']).name
        try {
            let idArticle = String(req.params.id)
            users.findOne({
                email: author,
                'viewedArticles.idArticle': idArticle
            }, {viewedArticles: {$elemMatch: {idArticle: idArticle}}, _id: 0}, function (e, doc) {
                if (e) return console.log(e)
                if (doc !== null) {
                    res.status(200).json({message: doc.viewedArticles[0]})
                } else {
                    let appraisal = 0
                    let lookedOver = true
                    let {...article} = {idArticle, appraisal, lookedOver}
                    users.update({email: author}, {$addToSet: {viewedArticles: article}}, function (e, doc) {
                        if (e) return console.log(e)
                    })
                    articles.updateOne({_id: req.params.id}, {$inc: {views: 1}}, function (e) {
                        if (e) return console.log(e)
                    })
                    res.status(200).json({message: article})
                }
            })
        } catch (e) {
            console.log(e)
            res.status(400).json({message: 'Error views increased'})
        }
    } else {
        res.status(200).json({message: 'user not authorized'})
    }

})
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'))
})

async function addArticleToBD(article, author) {
    await articles.create({
            id: article.id,
            title: article.title,
            description: article.description,
            date: article.date,
            likes: article.likes,
            dislikes: article.dislikes,
            views: article.views,
            comments: article.comments,
            file: article.file,
            topic: article.topic,
            author: author
        },
        function (err, doc) {
            if (err) return console.log(err);
            console.log("User is saved", doc);
        })
}

async function Authorization(user, req, res) {
    try {
        const existUser = await users.findOne({
            email: user.email
        });
        if (existUser !== null) {
            const validPassword = await bcrypt.compareSync(user.pass, existUser.pass)
            if (!validPassword) {
                res.status(400).json({message: `passwords mismatch `})
            } else {
                let token = await generateAccessToken(user._id, user.email);
                res.cookie('token', token, {httpOnly: true, MaxAge: 900000})
                res.status(200).json({message: "You are welcome"})
            }
        } else {
            res.status(400).json({
                message: `User ,${user.email}, doesnt exist`
            })
        }
    } catch (e) {
        res.status(400).json({message: `Error authorization`})
    }
}

async function Registration(user, req, res) {
    try {
        const candidate = await users.findOne({
            email: user.email
        });
        if (candidate == null) {
            const hashPassword = bcrypt.hashSync(user.pass, 4)
            await users.create({
                    email: user.email,
                    pass: hashPassword,
                    numberArticlesWritten: user.numberArticlesWritten,
                    likes: user.likes,
                    dislikes: user.dislikes,
                    dateOfRegistration: user.dateOfRegistration
                },
                async function (err, doc) {
                    if (err) return console.log(err);
                    console.log(doc);
                    res.status(200).json({message: "You are registered"})
                });
        } else {
            res.status(400).json({message: user.email + `exist`})
        }
    } catch (e) {
        res.status(400).json({message: `Error registration`})
    }
}

async function start() {
    try {
        await mongoose.connect("mongodb+srv://dima:1088834@cluster0.uwrbc.mongodb.net/dbtest", {
            useUnifiedTopology: true,
            useNewUrlParser: true
        });
        app.listen(3000, () => {
            console.log('Server has been started successfully....')
        })
    } catch (e) {
        console.log(e)
    }
}

start()