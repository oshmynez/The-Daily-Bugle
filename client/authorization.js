const App = Vue.createApp({
    data() {
        return {
            openSigInAndLogin: false,
            signInOrLogIn: 0,
            successfulAuthorization: false,
            authButtons: true,
            statusAuth: '',
            form: {
                email: '',
                pass: '',
                viewedArticles: [],
                numberArticlesWritten: 0,
                likes: 0,
                dislikes: 0,
                dateOfRegistration: '',
            }
        }
    },
    methods: {
        async userAuthorization() {
            const {...user} = this.form
            this.form.email = this.form.pass = ''
            console.log(user)
            if (this.signInOrLogIn === 1) {
                const result = await request('/api/userSignIn', 'POST', user)
                this.statusAuth = result.message
                console.log(result)
            }
            if (this.signInOrLogIn === 2) {
                user.dateOfRegistration = formatData()
                const result = await request('/api/userSignUp', 'POST', user)
                this.statusAuth = result.message
                console.log(result)
            }
        },
        async exitFromSystem() {
            const result = await request('/api/exit', 'PUT')
            this.statusAuth = result.message
            console.log(result)
        },
        async openPanelAuthorization() {
            this.openSigInAndLogin = !this.openSigInAndLogin
            if (this.openSigInAndLogin) {
                this.form.email = this.form.pass = this.statusAuth = ''
                this.authButtons = true

            }

        },
        emailChange(event) {
            this.authButtons = event.target.value === '';
        }

    }
})

export function formatData() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dateObj = new Date()
    const month = dateObj.getMonth()
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    return year + '-' + month + '-' + day
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

App.mount('#authorization')