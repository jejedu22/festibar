<!-- frontend/src/views/AdminOrganizations.vue -->
<template>
  <div class="min-h-screen bg-ground text-ink">
    <!-- Barre supérieure -->
    <header class="bg-ink text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-8 min-h-[64px] flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-8 h-8 rounded-lg bg-blue-600 inline-flex items-center justify-center shrink-0"><Icon name="mug" :size="18" /></span>
          <span class="font-display font-bold text-xl">Festibar</span>
          <span class="hidden sm:inline text-sm text-slate-300 pl-3 border-l border-slate-700">Administration</span>
        </div>
        <button type="button" class="btn border border-slate-600 text-slate-200 hover:bg-slate-800" @click="logout">
          <Icon name="logout" :size="18" /><span class="hidden sm:inline">Déconnexion</span><span class="sr-only sm:hidden">Déconnexion</span>
        </button>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-28 sm:pb-12 space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display font-bold text-[28px] sm:text-[34px] tracking-tight">Structures</h1>
          <p class="text-slate-600 mt-1 text-sm sm:text-base">Chaque structure a sa propre adresse, ses mots de passe et son application installable.</p>
        </div>
        <button type="button" class="btn-primary min-h-[48px] px-5 text-base hidden sm:inline-flex" @click="openCreate">
          <Icon name="plus" :stroke="2.2" />Nouvelle structure
        </button>
      </div>

      <!-- Compteurs -->
      <dl class="grid grid-cols-3 gap-3 sm:gap-4">
        <div class="card px-4 py-3 sm:px-5 sm:py-4">
          <dt class="text-[13px] text-slate-600">Structures</dt>
          <dd class="font-display font-bold text-2xl sm:text-[32px] mt-1">{{ organizations.length }}</dd>
        </div>
        <div class="card px-4 py-3 sm:px-5 sm:py-4">
          <dt class="text-[13px] text-slate-600">Avec accès serveurs</dt>
          <dd class="font-display font-bold text-2xl sm:text-[32px] mt-1">{{ staffCount }}</dd>
        </div>
        <div class="card px-4 py-3 sm:px-5 sm:py-4">
          <dt class="text-[13px] text-slate-600">Gestionnaire seul</dt>
          <dd class="font-display font-bold text-2xl sm:text-[32px] mt-1">{{ organizations.length - staffCount }}</dd>
        </div>
      </dl>

      <!-- Liste -->
      <section class="card overflow-hidden" aria-label="Liste des structures">
        <div class="p-4 sm:px-5 border-b border-slate-200">
          <label class="flex items-center gap-2.5 min-h-[48px] px-3.5 border border-slate-300 rounded-xl bg-slate-50 max-w-md focus-within:ring-2 focus-within:ring-blue-600">
            <Icon name="search" class="text-slate-600" />
            <span class="sr-only">Rechercher une structure</span>
            <input v-model="query" type="search" placeholder="Rechercher par nom ou adresse…" class="flex-1 min-w-0 bg-transparent outline-none text-base" />
          </label>
        </div>

        <p v-if="loading" class="p-5 text-slate-600">Chargement…</p>
        <p v-else-if="!organizations.length" class="p-8 text-center text-slate-600">
          Aucune structure pour le moment.
          <button type="button" class="underline text-blue-700" @click="openCreate">Créer la première</button>
        </p>
        <p v-else-if="!filtered.length" class="p-8 text-center text-slate-600">Aucune structure ne correspond à « {{ query }} ».</p>

        <ul v-else>
          <li
            v-for="o in filtered"
            :key="o.id"
            class="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 sm:px-5 py-4 border-t border-slate-100 first:border-t-0"
            :class="{ 'bg-blue-50': panelOpen && form.id === o.id }"
          >
            <span class="w-11 h-11 rounded-xl bg-blue-100 text-blue-900 inline-flex items-center justify-center font-display font-bold shrink-0" aria-hidden="true">{{ initials(o.name) }}</span>
            <div class="flex-1 basis-48 min-w-0">
              <p class="font-semibold text-base truncate">{{ o.name }}</p>
              <p class="font-mono text-[13px] text-slate-600 truncate">{{ host }}/{{ o.slug }}</p>
            </div>
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium"
              :class="o.has_staff_password ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700'"
            >
              <span class="w-[7px] h-[7px] rounded-full" :class="o.has_staff_password ? 'bg-green-600' : 'bg-slate-400'" aria-hidden="true"></span>
              {{ o.has_staff_password ? 'Accès serveurs' : 'Gestionnaire seul' }}
            </span>
            <div class="flex gap-1.5">
              <button type="button" class="icon-btn" :aria-label="`Copier le lien de ${o.name}`" @click="copyLink(o)"><Icon name="copy" :size="19" /></button>
              <button type="button" class="icon-btn" :aria-label="`Modifier ${o.name}`" @click="openEdit(o)"><Icon name="edit" :size="19" /></button>
              <button type="button" class="icon-btn border-red-200 text-red-700 hover:bg-red-50" :aria-label="`Supprimer ${o.name}`" @click="del(o)"><Icon name="trash" :size="19" /></button>
              <router-link :to="`/${o.slug}/login`" class="btn bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 text-sm" :aria-label="`Ouvrir ${o.name}`">
                Ouvrir<Icon name="arrow" :size="16" :stroke="2.2" />
              </router-link>
            </div>
          </li>
        </ul>
      </section>

      <p class="text-[13px] text-slate-600">La suppression reste bloquée tant que la structure a des produits ou des commandes.</p>
    </main>

    <!-- Bouton principal sur téléphone -->
    <div class="sm:hidden fixed inset-x-0 bottom-0 p-4 bg-gradient-to-t from-ground via-ground/90 to-transparent">
      <button type="button" class="btn-primary w-full min-h-[56px] text-[17px] rounded-[14px] shadow-lg" @click="openCreate">
        <Icon name="plus" :size="22" :stroke="2.2" />Nouvelle structure
      </button>
    </div>

    <!-- Panneau création / modification -->
    <SidePanel
      :open="panelOpen"
      :title="form.id ? editedName : 'Nouvelle structure'"
      :kicker="form.id ? 'Modifier la structure' : ''"
      @close="closePanel"
    >
      <form id="org-form" class="p-5 space-y-5" @submit.prevent="save">
        <label class="block">
          <span class="label">Nom</span>
          <input v-model="form.name" maxlength="100" class="field" required />
        </label>

        <div>
          <label class="block">
            <span class="label">Adresse (slug)</span>
            <span class="flex items-stretch border border-slate-400 rounded-[10px] overflow-hidden focus-within:ring-2 focus-within:ring-blue-600">
              <span class="hidden sm:inline-flex items-center px-3 bg-slate-100 text-slate-600 font-mono text-sm border-r border-slate-300">{{ host }}/</span>
              <input
                v-model="form.slug"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxlength="60"
                class="flex-1 min-w-0 min-h-[48px] px-3 font-mono text-[15px] outline-none"
                required
                @input="slugManuallyEdited = true"
              />
            </span>
          </label>
          <p v-if="!form.id" class="mt-1.5 text-[13px] text-slate-600">Généré à partir du nom · minuscules, chiffres et tirets.</p>
          <p v-if="slugChanged" class="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-[10px] text-[13px] leading-snug text-orange-900" role="status">
            Changer l’adresse change aussi l’application installée : les téléphones devront la réinstaller.
          </p>
        </div>

        <div>
          <label class="block">
            <span class="flex items-baseline justify-between mb-1.5">
              <span class="text-sm font-semibold">Mot de passe gestionnaire</span>
              <span class="text-xs text-slate-600">Produits, ventes, exports</span>
            </span>
            <span class="flex gap-2">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                class="field flex-1 min-w-0"
                :placeholder="form.id ? 'Inchangé si vide' : '8 caractères minimum'"
                :required="!form.id"
              />
              <button type="button" class="icon-btn w-12 h-12 border-slate-400" :aria-label="showPassword ? 'Masquer les mots de passe' : 'Afficher les mots de passe'" :aria-pressed="showPassword" @click="showPassword = !showPassword">
                <Icon :name="showPassword ? 'eyeOff' : 'eye'" />
              </button>
              <button type="button" class="btn-secondary min-h-[48px] px-3.5 text-sm" @click="generate('password')">Générer</button>
            </span>
          </label>
        </div>

        <div>
          <label class="block">
            <span class="flex items-baseline justify-between mb-1.5">
              <span class="text-sm font-semibold">Mot de passe serveurs <span class="font-normal text-slate-600">(optionnel)</span></span>
              <span class="text-xs text-slate-600">Prise de commande</span>
            </span>
            <span class="flex gap-2">
              <input
                v-model="form.staff_password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                class="field flex-1 min-w-0"
                :placeholder="form.id && form.has_staff_password ? 'Inchangé si vide' : 'À partager avec les bénévoles'"
              />
              <button type="button" class="btn-secondary min-h-[48px] px-3.5 text-sm" @click="generate('staff_password')">Générer</button>
            </span>
          </label>
          <label v-if="form.id && form.has_staff_password && !form.staff_password" class="flex items-center gap-2.5 min-h-[44px] mt-1 text-sm">
            <input v-model="form.remove_staff_password" type="checkbox" class="w-5 h-5 accent-blue-600" />
            Supprimer le mot de passe serveurs
          </label>
        </div>

        <!-- Lien et QR code (structure existante) -->
        <div v-if="form.id" class="flex flex-wrap items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code de l’adresse de la structure" class="w-[88px] h-[88px] bg-white border border-slate-300 rounded-lg p-1" />
          <div class="flex-1 basis-48 min-w-0">
            <p class="text-sm font-semibold">Lien de la structure</p>
            <p class="font-mono text-[13px] text-slate-600 my-1 break-all">{{ linkFor(editedSlug) }}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              <button type="button" class="btn-secondary text-sm" @click="copyLink({ slug: editedSlug, name: editedName })"><Icon name="copy" :size="17" />Copier le lien</button>
              <button type="button" class="btn-secondary text-sm" :disabled="!qrDataUrl" @click="printQr"><Icon name="printer" :size="17" />Imprimer le QR code</button>
            </div>
          </div>
        </div>

        <!-- Zone dangereuse -->
        <div v-if="form.id" class="p-4 border border-red-200 bg-red-50 rounded-xl">
          <p class="text-sm font-semibold text-red-900">Supprimer la structure</p>
          <p class="text-[13px] leading-snug text-red-900 mt-1 mb-3">
            Impossible tant que la structure a des produits ou des commandes. Il faudra recopier <span class="font-mono">{{ editedSlug }}</span> pour confirmer.
          </p>
          <button type="button" class="btn-danger text-sm" @click="del({ id: form.id, name: editedName, slug: editedSlug })">Supprimer…</button>
        </div>
      </form>

      <template #footer>
        <div class="flex gap-2.5">
          <button type="button" class="btn-secondary min-h-[52px] px-5 text-base" @click="closePanel">Annuler</button>
          <button type="submit" form="org-form" class="btn-primary flex-1 min-h-[52px] text-base" :disabled="saving">
            {{ saving ? 'Enregistrement…' : form.id ? 'Enregistrer' : 'Créer la structure' }}
          </button>
        </div>
      </template>
    </SidePanel>

    <!-- Affiche imprimable : nom, QR code et lien -->
    <section v-if="form.id && qrDataUrl" class="print-area hidden print:flex flex-col items-center justify-center text-center gap-6 p-10" aria-hidden="true">
      <h2 class="font-display font-bold text-4xl">{{ editedName }}</h2>
      <img :src="qrDataUrl" alt="" class="w-[320px] h-[320px]" />
      <p class="font-mono text-xl">{{ linkFor(editedSlug) }}</p>
      <p class="text-lg">Scannez pour ouvrir la prise de commande</p>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'
import { getAdminToken, clearAdminToken } from '@/utils/adminAuth'
import { useUiStore } from '@/stores/ui'
import { initials } from '@/utils/format'
import { generatePassword, copyText } from '@/utils/password'
import Icon from '@/components/Icon.vue'
import SidePanel from '@/components/SidePanel.vue'

const router = useRouter()
const ui = useUiStore()
const origin = window.location.origin
const host = window.location.host

const organizations = ref([])
const loading = ref(true)
const saving = ref(false)
const query = ref('')
const panelOpen = ref(false)
const showPassword = ref(false)
const slugManuallyEdited = ref(false)
const qrDataUrl = ref('')

const empty = () => ({ id: null, name: '', slug: '', password: '', staff_password: '', has_staff_password: false, remove_staff_password: false })
const form = reactive(empty())
// Nom et adresse enregistrés de la structure en cours de modification
const editedName = ref('')
const editedSlug = ref('')

const adminApi = (url, options = {}) => api(url, { ...options, token: getAdminToken() })
const linkFor = slug => `${origin}/${slug}`

const staffCount = computed(() => organizations.value.filter(o => o.has_staff_password).length)
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return organizations.value
  return organizations.value.filter(o => o.name.toLowerCase().includes(q) || o.slug.includes(q))
})
const slugChanged = computed(() => !!form.id && form.slug !== editedSlug.value)

// --- Slug généré à partir du nom ---
function generateSlug(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
}

watch(() => form.name, name => {
  if (!slugManuallyEdited.value) form.slug = generateSlug(name)
})

function openCreate() {
  Object.assign(form, empty())
  slugManuallyEdited.value = false
  showPassword.value = false
  panelOpen.value = true
}

async function openEdit(o) {
  Object.assign(form, { ...empty(), id: o.id, name: o.name, slug: o.slug, has_staff_password: !!o.has_staff_password })
  editedName.value = o.name
  editedSlug.value = o.slug
  slugManuallyEdited.value = true
  showPassword.value = false
  qrDataUrl.value = ''
  panelOpen.value = true
  try {
    // Chargé à la demande : la bibliothèque n'alourdit pas les autres pages
    const { default: QRCode } = await import('qrcode')
    qrDataUrl.value = await QRCode.toDataURL(linkFor(o.slug), { width: 640, margin: 1 })
  } catch {
    /* QR code indisponible : le lien reste copiable */
  }
}

function closePanel() {
  panelOpen.value = false
}

function generate(field) {
  form[field] = generatePassword()
  if (field === 'staff_password') form.remove_staff_password = false
  showPassword.value = true
}

async function copyLink(o) {
  if (await copyText(linkFor(o.slug))) ui.success(`Lien de « ${o.name} » copié.`)
  else ui.error('Copie impossible : sélectionnez le lien à la main.')
}

function printQr() {
  window.print()
}

async function loadOrganizations() {
  try {
    organizations.value = await adminApi('/api/admin/organizations')
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  const body = { name: form.name, slug: form.slug }
  if (form.password) body.password = form.password
  if (form.staff_password) body.staff_password = form.staff_password
  if (form.remove_staff_password) body.remove_staff_password = true
  try {
    if (form.id) await adminApi(`/api/admin/organizations/${form.id}`, { method: 'PUT', body })
    else await adminApi('/api/admin/organizations', { method: 'POST', body })
    ui.success(form.id ? 'Structure enregistrée.' : 'Structure créée.')
    closePanel()
    await loadOrganizations()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    saving.value = false
  }
}

async function del(o) {
  const ok = await ui.confirm({ title: `Supprimer « ${o.name} » ?`, confirmLabel: 'Supprimer', danger: true, requireText: o.slug })
  if (!ok) return
  try {
    await adminApi(`/api/admin/organizations/${o.id}`, { method: 'DELETE' })
    ui.success('Structure supprimée.')
    if (form.id === o.id) closePanel()
    await loadOrganizations()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

function logout() {
  clearAdminToken()
  router.push('/')
}

onMounted(loadOrganizations)
</script>
