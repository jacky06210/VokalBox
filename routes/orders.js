const express = require('express');
const router = express.Router();

// Route pour récupérer toutes les commandes
router.get('/', async (req, res) => {
  res.json({ message: 'Route orders - en cours de développement' });
});

// Route pour créer une commande
router.post('/', async (req, res) => {
  res.json({ message: 'Création de commande - en cours de développement' });
});

module.exports = router;

