// frontend/src/utils/pwa.js
// Chaque structure a sa propre application installable : le manifeste (nom, page de démarrage,
// périmètre) est celui de l'organisation affichée. Il n'existe pas sur la page d'accueil ni
// dans l'administration globale, qui ne sont donc pas installables.

function setLink(rel, href) {
  let link = document.head.querySelector(`link[rel="${rel}"][data-festibar]`)
  if (!href) return link?.remove()
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    link.dataset.festibar = ''
    document.head.appendChild(link)
  }
  link.href = href
}

function setMeta(name, content) {
  let meta = document.head.querySelector(`meta[name="${name}"][data-festibar]`)
  if (!content) return meta?.remove()
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    meta.dataset.festibar = ''
    document.head.appendChild(meta)
  }
  meta.content = content
}

export function setOrgManifest(slug, name) {
  setLink('manifest', `/api/organizations/${encodeURIComponent(slug)}/manifest.webmanifest`)
  setMeta('apple-mobile-web-app-title', name || 'Festibar')
}

export function clearOrgManifest() {
  setLink('manifest', null)
  setMeta('apple-mobile-web-app-title', null)
}
