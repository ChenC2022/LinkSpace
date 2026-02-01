import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'

// Simple auth guard simulation
// In real app, we might check an endpoint, but for responsiveness we check a flag or just let API fail.
// Let's rely on API 401s to redirect, but also a local storage flag for UX.

const routes = [
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/', redirect: '/dashboard' }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    // If we had a local token store, we would check it here.
    // Since we use HttpOnly cookies, we can't check them in JS.
    // We'll optimistically go to dashboard, and if API fails, Dashboard redirects to Login.
    // Or we can simple check a "isLoggedIn" flag in localStorage set on login.
    const isLoggedIn = localStorage.getItem('isLoggedIn')

    if (to.meta.requiresAuth && !isLoggedIn) {
        next('/login')
    } else {
        next()
    }
})

export default router
