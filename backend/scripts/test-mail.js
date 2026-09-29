// backend/scripts/test-mail.js
// Vérifie la configuration SMTP et envoie un email de test à ADMIN_EMAIL.
// Usage : node scripts/test-mail.js
//   Docker : docker compose exec festibar node scripts/test-mail.js
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { mailConfig, missingSettings, createTransport, sendToAdmin, explain } = require('../utils/mail');

(async () => {
  const cfg = mailConfig();
  console.log('Configuration :');
  console.log(`  serveur     : ${cfg.host || '(vide)'}:${cfg.port} ${cfg.secure ? '(TLS direct)' : '(STARTTLS si proposé)'}`);
  console.log(`  identifiant : ${cfg.user || '(aucun)'}  mot de passe : ${cfg.pass ? '(défini)' : '(vide)'}`);
  console.log(`  expéditeur  : ${cfg.from || '(vide)'}`);
  console.log(`  destinataire: ${cfg.to || '(vide)'}`);

  const missing = missingSettings(cfg);
  if (missing.length) {
    console.error(`\n❌ Configuration incomplète : ${missing.join(', ')}`);
    process.exit(1);
  }

  try {
    await createTransport(cfg).verify();
    console.log('\n✅ Connexion et authentification SMTP réussies');
    const info = await sendToAdmin({
      subject: 'Festibar : email de test',
      text: 'Cet email confirme que l’envoi depuis Festibar fonctionne.',
    });
    console.log(`✅ Email de test envoyé à ${cfg.to} (${info.response})`);
    console.log('   Pensez à vérifier le dossier des indésirables.');
  } catch (err) {
    console.error(`\n❌ Échec : ${explain(err)}`);
    console.error(`   Détail : ${err.message}`);
    process.exit(1);
  }
})();
