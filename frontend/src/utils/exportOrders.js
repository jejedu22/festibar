// frontend/src/utils/exportOrders.js
// Téléchargement authentifié de l'export Excel (le jeton ne peut pas passer par un simple lien)
export async function downloadOrdersExport(org, slug) {
  const res = await org.orgApi('/summary/daily/export', { raw: true, timeout: 60000 })
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: `commandes-${slug}.xlsx` })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
