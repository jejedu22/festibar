exports.login = (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: 'secure-token' }); // ⚠️ à remplacer par JWT ou session
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
};
