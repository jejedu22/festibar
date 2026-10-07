// frontend/src/utils/password.js
// Mot de passe aléatoire lisible (sans caractères ambigus : 0/O, 1/l/I), facile à dicter aux bénévoles
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePassword(length = 12) {
  const values = crypto.getRandomValues(new Uint32Array(length))
  let out = ''
  for (const v of values) out += ALPHABET[v % ALPHABET.length]
  // Groupes de 4 séparés par des tirets : plus simple à recopier
  return out.match(/.{1,4}/g).join('-')
}

// Copie dans le presse-papiers, avec repli pour les contextes non sécurisés (HTTP en réseau local)
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text })
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
