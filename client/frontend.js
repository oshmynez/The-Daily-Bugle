/*
import axios from '../node_modules/axios'
*/
const App = Vue.createApp({

    data() {
        return {
            attachment: {name: null, file: null},
            userName: '',
            countPages: 0,
            currentPageFlag: 2, //1 - createArticlePage,2 - top10page,3 -allArticles, 4 - aboutMe
            sortFlag: false,
            loading: false,
            readMoreArticle: false,
            aboutAuthor: false,
            canSort: true,
            getAccessToCreateArticle: false,
            dislike: '/dislike_black.png',
            like: '/like_black.png',
            selectedTopicSort: '',
            leftArrow: '/leftArrow.png',
            rightArrow: '/rightArrow.png',
            openCloseComments: 'Просмотреть комментарии',
            image: null,
            form: {
                title: '',
                description: '',
                date: '',
                likes: 0,
                dislikes: 0,
                views: 0,
                comments: [],
                file: '',
                author: '',
                topic: ''
            },
            comment: '',
            likePress: 0,
            disLikePress: 0,
            searchText: '',
            likeDisabled: false,
            statusOfCreatedArticle: 2,
            currentPage: 1,
            dislikeDisabled: false,
            filteredArticlesExist: false,
            saveCommentDisabled: false,
            btnGetTenPrevArticlesDisabled: false,
            btnGetTenNextArticlesDisabled: false,
            resultSearching: '',
            primaryArticles: [],
            author: [],
            articles: [],
            articleFullInfo: [],
            comments: [],
            articlesSort: [],
        }
    },
    methods: {
//        this.statusOfCreatedArticle = 2
        async searchArticle() {
            this.articleFullInfo = await request(`/api/searchArticle/${this.searchText}`, 'GET')
            console.log(this.articleFullInfo)
            if (this.articleFullInfo.length === 0) {
                this.resultSearching = 'Нет такой статьи'
            } else {
                this.resultSearching = ''
            }
            this.readMoreArticle = !this.readMoreArticle
            this.currentPageFlag = 3
            this.searchText = ''
        },
        async createArticle() {
            const {...article} = this.form
            article.date = formatData()
            let data = new FormData();
            data.append('photo', this.image);
            fetch('http://localhost:3000/api/loadImage',
                {
                    method:'POST',
                    body: data
                }).then((res) => {
                console.log(res)
            })
            article.likes = article.dislikes = article.views = 0
            article.file = "./public/uploads/" + this.image.name
            console.log(article)
            const newArticle = await request('/api/articles', 'POST', article)
            this.statusOfCreatedArticle = newArticle.message === 'error of adding article to database' ? 0 : 1
            console.log(newArticle)
        },
        async checkAccessToCreateArticle() {
            this.currentPageFlag = 1
            const result = await request('/api/checkAccess', 'GET')
            this.getAccessToCreateArticle = result.message !== 'you are not authorized';
            this.aboutAuthor = false
        },
        async handleFileUpload(event) {
            this.image = null
            this.image = event.target.files[0]
        },
        async getTenPrevNextArticles(flag) {
            if (flag === 1) {
                this.currentPage -= 1
                let flag = this.currentPage
                this.articles = []
                this.btnGetTenPrevArticlesDisabled = true
                this.btnGetTenNextArticlesDisabled = false
                this.articles = await request(`/api/getTenArticles/${flag}`)
            } else {
                this.currentPage += 1
                let flag = this.currentPage
                this.articles = []
                this.btnGetTenPrevArticlesDisabled = false
                this.btnGetTenNextArticlesDisabled = true
                this.articles = await request(`/api/getTenArticles/${flag}`)
            }
        },
        async getFirstTenArticles() {
            this.currentPageFlag = 2
            this.searchText = ''
            this.canSort = true
            this.filteredArticlesExist = this.aboutAuthor = false
        },
        async getFullInfoAboutArticle(){
          this.currentPageFlag = 3
          this.aboutAuthor = false
        },
        async openArticle(id) {
            this.filteredArticlesExist = false
            let newId = 13
            this.readMoreArticle = !this.readMoreArticle
            this.articleFullInfo = await request(`/api/articles/${id}`, 'GET')
            const userTraces = await request(`/api/userTraces/${id}/${newId}`, 'PUT')
            console.log(userTraces)
            if (userTraces.message === 'user not authorized') {
                this.likeDisabled = this.dislikeDisabled = this.saveCommentDisabled = true
            } else {
                if (userTraces.message.appraisal === 0) {
                    this.likeDisabled = this.dislikeDisabled = this.saveCommentDisabled = false
                    this.like = '/like_black.png'
                    this.dislike = '/dislike_black.png'
                } else if (userTraces.message.appraisal === 1) {
                    console.log("green")
                    this.likeDisabled = this.dislikeDisabled = true
                    this.saveCommentDisabled = false
                    this.like = '/like_green.png'
                    this.dislike = '/dislike_black.png'
                } else if (userTraces.message.appraisal === 2) {
                    console.log("red")
                    this.likeDisabled = this.dislikeDisabled = true
                    this.saveCommentDisabled = false
                    this.like = '/like_black.png'
                    this.dislike = '/dislike_red.png'
                }
            }
            this.currentPageFlag = 3
        },
        async dislikeLikeChange(id, flagMark, author) { //true - like, false = dislike
            if (flagMark === 1) {
                this.like = '/like_green.png'
                this.dislike = '/dislike_black.png'
                this.articleFullInfo[0].likes += 1
            } else {
                this.dislike = '/dislike_red.png'
                this.like = '/like_black.png'
                this.articleFullInfo[0].dislikes += 1
            }
            const result = await request(`/api/addMark/${id}/${flagMark}/${author}`, 'PUT')
            console.log(result)
            this.likeDisabled = this.dislikeDisabled = true
        },
        async sortArticles() {
            this.filteredArticlesExist = false
            this.primaryArticles = this.articles
            this.articles = []
            let filter = this.selectedTopicSort
            this.loading = true
            if (filter === "Все") {
                let flag = this.currentPage = 1
                this.articles = await request(`/api/getTenArticles/${flag}`)
                this.countPages = await request(`/api/getCountPages`, 'GET')
                this.btnGetTenNextArticlesDisabled = this.countPages <= 1
            } else {
                const result = await request(`/api/getFilteredArticles/${filter}`, 'GET')
                console.log(result)
                if (result !== null) {
                    this.articles = result
                    if ((result.length % 10) !== 0) {
                        this.countPages = Math.floor(result.length / 10) + 1
                    } else this.countPages = result.length / 10
                    this.btnGetTenNextArticlesDisabled = this.countPages <= 1
                }else{
                    this.articles = []
                    this.countPages = 0
                    this.btnGetTenNextArticlesDisabled = true
                    this.filteredArticlesExist = true
                }
            }
            this.loading = false;
            this.btnGetTenPrevArticlesDisabled = true
        },
        async openInfoAboutAuthor(author){
            let result = await request(`/api/getAuthorArticle/${author}`, 'GET')
            this.author = result.author
            this.currentPageFlag = 4
            this.aboutAuthor = true
        },
        async openComments(id) {
            let article = await request(`/api/articles/${id}`, 'GET')
            this.openCloseComments = this.openCloseComments === 'Просмотреть комментарии' ? 'Скрыть комментарии' : 'Просмотреть комментарии'
            this.articleFullInfo.comments = article.comments
            this.comments = article.comments
            console.log(article)
        },
        async saveComment() {
            let idArticle = this.articleFullInfo[0]._id
            console.log(idArticle)
            let comment = this.comment
            let date = new Date()
            let author = ''
            let currentDateTime = formatData() + "-" + date.getHours() + ':' + date.getMinutes()
            const {...newComment} = {comment, author, currentDateTime}
            await request(`/api/saveComment/${idArticle}`, 'PUT', newComment)
        },
        mouseOver(i) {
            if (i === 1) {
                this.leftArrow = this.btnGetTenPrevArticlesDisabled === true ? '/leftArrow.png' : '/leftArrowRed.png'
            } else this.rightArrow = this.btnGetTenNextArticlesDisabled === true ? '/rightArrow.png' : '/rightArrowRed.png'
        },
        sortPanel() {
            this.sortFlag = !this.sortFlag
            this.canSort = true
        },
        commentChangeHandler(event) {
            this.comment = event.target.value
        },
        onChangeTopicSort(event) {
            this.selectedTopicSort = event.target.value
            this.canSort = false
        }
    },
    async mounted() {
        this.loading = true;
        let flag = this.currentPage = 1
        this.articles = await request(`/api/getTenArticles/${flag}`)
        this.loading = false;
        this.countPages = await request(`/api/getCountPages`, 'GET')
        this.btnGetTenPrevArticlesDisabled = true
        this.btnGetTenNextArticlesDisabled = this.countPages <= 1

    }
})

export function formatData() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dateObj = new Date()
    const month = dateObj.getMonth()
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    return year + '.' + month + '.' + day
}

function byField(field) {
    return (a, b) => a[field] < b[field] ? 1 : -1;
}

async function request(url, method = 'GET', data = null) {
    try {
        const headers = {}
        let body

        if (data) {
            headers['Content-Type'] = 'application/json'
            body = JSON.stringify(data)
        }

        const response = await fetch(url, {
            method,
            headers,
            body
        })
        return await response.json()
    } catch (e) {
        console.warn('Error:', e.message)
    }
}
App.component('loader', {
    template: `
    <div style="display: flex; justify-content: center;align-items: center; margin: 20px">
      <div class="spinner-border" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  `
})

App.mount('#app')

