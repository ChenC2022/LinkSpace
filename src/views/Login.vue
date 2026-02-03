<template>
  <div class="login-container">
    <div class="glass-panel login-card fade-in">
      <img src="/logo.svg" alt="LinkSpace" class="logo-icon-lg" />
      <h1 class="logo-text">LinkSpace</h1>
      <p class="subtitle">Personal URL Manager</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <input 
            type="password" 
            v-model="password" 
            placeholder="Enter Access Key" 
            class="glass-input" 
            required 
            autofocus
          />
        </div>
        
        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          {{ loading ? 'Verifying...' : 'Access Dashboard' }}
        </button>
        
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    })
    
    if (res.ok) {
      localStorage.setItem('isLoggedIn', 'true')
      router.push('/dashboard')
    } else {
      error.value = 'Invalid access key'
    }
  } catch (e) {
    error.value = 'Connection failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-color);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  text-align: center;
}

.logo-text {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 20px;
}

.error-msg {
  color: var(--danger-color);
  font-size: 0.875rem;
  margin-top: 16px;
}


.logo-icon-lg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  /* Neumorphic icon style */
  filter: drop-shadow(5px 5px 10px var(--shadow-dark)) drop-shadow(-5px -5px 10px var(--shadow-light));
}
</style>
