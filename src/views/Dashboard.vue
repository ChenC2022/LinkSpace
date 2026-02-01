<template>
  <div class="dashboard-container">
    <!-- Header -->
    <header class="header glass-panel flex-item-center justify-between">
      <div class="flex-item-center gap-2">
        <h2 class="logo-text">LinkSpace</h2>
      </div>
      <div class="flex-item-center gap-4">
        <span class="text-sm text-muted">Admin Mode</span>
        <button @click="logout" class="btn btn-glass text-sm">Logout</button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="content">
      <!-- Controls -->
      <div class="controls flex-item-center justify-between">
        <div class="stats glass-panel">
          <span class="label">Total Links</span>
          <span class="value">{{ links.length }}</span>
        </div>
        
        <div class="actions flex-item-center gap-2">
          <button @click="triggerImport" class="btn btn-glass">
            <span class="icon">📂</span> Import
          </button>
          <button @click="exportLinks" class="btn btn-glass">
            <span class="icon">💾</span> Export
          </button>
          <div class="divider"></div>
          <button @click="fetchLinks" class="btn btn-glass" :disabled="loading">
            <span class="icon">↻</span> Refresh
          </button>
          <button @click="openModal()" class="btn btn-primary">
            <span class="icon">+</span> New Link
          </button>
        </div>
      </div>
      
      <input type="file" ref="fileInput" @change="handleImport" style="display: none" accept=".json">

      <!-- Table -->
      <div class="glass-panel table-container fade-in">
        <div v-if="loading && links.length === 0" class="loading-state">
          Loading links...
        </div>
        
        <div v-else-if="links.length === 0" class="empty-state">
          <p>No links found. Create your first one!</p>
        </div>
        
        <table v-else>
          <thead>
            <tr>
              <th width="15%" class="sortable" @click="sortBy('shortCode')">
                Short Link <span class="sort-icon">{{ getSortIcon('shortCode') }}</span>
              </th>
              <th width="35%" class="sortable" @click="sortBy('originalUrl')">
                Original Destination <span class="sort-icon">{{ getSortIcon('originalUrl') }}</span>
              </th>
              <th width="10%" class="sortable" @click="sortBy('visitCount')">
                Visits <span class="sort-icon">{{ getSortIcon('visitCount') }}</span>
              </th>
              <th width="15%" class="sortable" @click="sortBy('createdAt')">
                Created <span class="sort-icon">{{ getSortIcon('createdAt') }}</span>
              </th>
              <th width="10%" class="sortable" @click="sortBy('note')">
                Note <span class="sort-icon">{{ getSortIcon('note') }}</span>
              </th>
              <th width="15%" style="text-align: right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="link in sortedLinks" :key="link.shortCode">
              <td>
                <a :href="getShortUrl(link.shortCode)" target="_blank" class="short-link-text">
                  {{ link.shortCode }}
                </a>
              </td>
              <td class="truncate" :title="link.originalUrl">{{ link.originalUrl }}</td>
              <td>
                <span class="badge">{{ link.visitCount || 0 }}</span>
              </td>
              <td>{{ formatDate(link.createdAt) }}</td>
              <td class="truncate">{{ link.note || '-' }}</td>
              <td>
                <div class="row-actions flex-item-center justify-between">
                  <button @click="copyToClipboard(getShortUrl(link.shortCode))" class="action-btn" title="Copy Link">📋</button>
                  <button @click="showQRCode(link)" class="action-btn" title="QR Code">🏁</button>
                  <button @click="openModal(link)" class="action-btn" title="Edit">✏️</button>
                  <button @click="deleteLink(link)" class="action-btn danger" title="Delete">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Create/Edit Modal -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="glass-panel modal-card fade-in">
        <h3>{{ isEditing ? 'Edit Link' : 'Create New Link' }}</h3>
        
        <form @submit.prevent="submitLink" class="modal-form">
          <div class="form-group">
            <label>Destination URL</label>
            <input v-model="form.url" type="url" class="glass-input" placeholder="https://example.com" required>
          </div>
          
          <div class="form-group">
            <label>Short Code (Optional)</label>
            <input v-model="form.shortCode" type="text" class="glass-input" placeholder="Random if empty" :disabled="isEditing">
            <small class="hint" v-if="isEditing">Cannot change code once created</small>
          </div>
          
          <div class="form-group">
            <label>Note</label>
            <input v-model="form.note" type="text" class="glass-input" placeholder="e.g. Resume link">
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn btn-glass">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Saving...' : 'Save Link' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- QR Modal -->
    <div v-if="qrModalOpen" class="modal-backdrop" @click.self="qrModalOpen = false">
      <div class="glass-panel modal-card center-content fade-in">
        <h3>Scan Code</h3>
        <div class="qr-canvas">
          <img :src="qrDataUrl" v-if="qrDataUrl" alt="QR Code" />
        </div>
        <p class="qr-url">{{ currentQrLink }}</p>
        <button @click="qrModalOpen = false" class="btn btn-glass mt-4">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'

const router = useRouter()
const links = ref([])
const loading = ref(true)
const submitting = ref(false)

// Modal State
const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({ url: '', shortCode: '', note: '' })

// QR State
const qrModalOpen = ref(false)
const qrDataUrl = ref('')
const currentQrLink = ref('')
const fileInput = ref(null)

// Sorting State
const sortKey = ref('createdAt')
const sortOrder = ref('desc')

const sortedLinks = computed(() => {
  const result = [...links.value]
  if (!sortKey.value) return result

  return result.sort((a, b) => {
    let valA = a[sortKey.value]
    let valB = b[sortKey.value]

    // Handle nulls/undefined
    if (valA === undefined || valA === null) valA = ''
    if (valB === undefined || valB === null) valB = ''

    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()

    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const getSortIcon = (key) => {
  if (sortKey.value !== key) return '↕️'
  return sortOrder.value === 'asc' ? '🔼' : '🔽'
}

onMounted(() => {
  fetchLinks()
})

const fetchLinks = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/links')
    if (res.status === 401) {
      logout()
      return
    }
    links.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const getShortUrl = (code) => {
  return `${window.location.origin}/${code}`
}

const formatDate = (ts) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleDateString()
}

// Actions
const logout = () => {
  localStorage.removeItem('isLoggedIn')
  // Ideally call API to clear cookie too, but simple client navigation works for now
  router.push('/login')
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  } catch (e) {
    console.error(e)
  }
}

const triggerImport = () => fileInput.value.click()

const handleImport = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (Array.isArray(data)) {
        if (confirm(`Import ${data.length} links? This might take a moment.`)) {
          // Sequential import to avoid rate limits
          for (const item of data) {
             await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: item.originalUrl || item.url,
                  shortCode: item.shortCode,
                  note: item.note
                })
             })
          }
          fetchLinks()
        }
      }
    } catch (err) {
      alert('Invalid JSON file')
    }
  }
  reader.readAsText(file)
}

const exportLinks = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(links.value, null, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr)
  downloadAnchorNode.setAttribute("download", "links_backup.json")
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

const deleteLink = async (link) => {
  if (!confirm(`Delete short link /${link.shortCode}?`)) return
  
  try {
    await fetch(`/api/links/${link.shortCode}`, { method: 'DELETE' })
    links.value = links.value.filter(l => l.shortCode !== link.shortCode)
  } catch (e) {
    alert('Failed to delete')
  }
}

const openModal = (link = null) => {
  if (link) {
    isEditing.value = true
    form.value = { 
      url: link.originalUrl, 
      shortCode: link.shortCode, // Read-only in edit
      note: link.note 
    }
  } else {
    isEditing.value = false
    form.value = { url: '', shortCode: '', note: '' }
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const submitLink = async () => {
  submitting.value = true
  try {
    if (isEditing.value) {
      // Edit logic (PUT)
      await fetch(`/api/links/${form.value.shortCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: form.value.url,
          note: form.value.note
        })
      })
    } else {
      // Create logic (POST)
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.value.url,
          shortCode: form.value.shortCode,
          note: form.value.note
        })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed')
      }
    }
    
    closeModal()
    fetchLinks()
  } catch (e) {
    alert(e.message)
  } finally {
    submitting.value = false
  }
}

const showQRCode = async (link) => {
  currentQrLink.value = getShortUrl(link.shortCode)
  try {
    qrDataUrl.value = await QRCode.toDataURL(currentQrLink.value, { 
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
    qrModalOpen.value = true
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 80px;
}

.header {
  padding: 16px 24px;
  margin-bottom: 32px;
}

.logo-text {
  background: linear-gradient(to right, #818cf8, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.controls {
  margin-bottom: 24px;
}

.stats {
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats .label {
  color: var(--text-muted);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stats .value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--glass-border);
  margin: 0 8px;
}

/* Table overrides */
.sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.sortable:hover {
  color: var(--primary-color);
}

.sort-icon {
  font-size: 0.7em;
  margin-left: 4px;
}

.truncate {
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.short-link-text {
  color: var(--primary-color);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.short-link-text:hover {
  text-decoration: underline;
  color: var(--primary-hover);
}

.badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.row-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s;
  filter: grayscale(100%);
  opacity: 0.7;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  filter: grayscale(0);
  opacity: 1;
}

.action-btn.danger:hover {
  background: rgba(248, 113, 113, 0.2);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  width: 90%;
  max-width: 500px;
  padding: 32px;
  background: #1e1b4b; /* Solid backing for better readability */
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95));
}

.modal-card h3 {
  margin-bottom: 24px;
  font-size: 1.25rem;
}

.modal-form .form-group {
  margin-bottom: 20px;
}

.modal-form label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.hint {
  display: block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.8em;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}

.qr-canvas img {
  border-radius: 8px;
  border: 4px solid white;
}
.center-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qr-url {
  margin-top: 16px;
  font-size: 0.9rem;
  color: var(--primary-color);
  word-break: break-all;
}
</style>
