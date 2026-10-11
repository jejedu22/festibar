// frontend/src/utils/head.js
// Garde le <head> cohérent avec la page affichée pendant la navigation dans l'application.
// À la première visite, le serveur fournit déjà un <head> complet (voir backend/utils/seo.js) ;
// ici on le met à jour quand on change de page sans recharger.
const ROBOTS_INDEX = 'index, follow, max-image-preview:large'
const ROBOTS_PRIVATE = 'noindex, nofollow'

function setMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!content) return el?.remove()
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!href) return el?.remove()
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// meta de la route : { title, documentTitle?, description?, index? }
export function applyHead(meta, path) {
  const indexable = !!meta.index
  document.title = meta.documentTitle || (meta.title ? `${meta.title} · Festibar` : 'Festibar')
  if (meta.description) setMeta('description', meta.description)
  setMeta('robots', indexable ? ROBOTS_INDEX : ROBOTS_PRIVATE)
  setCanonical(indexable ? window.location.origin + (path === '/' ? '/' : path) : null)
}
