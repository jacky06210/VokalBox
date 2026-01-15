-- ===================================================================
-- VOCALBOX - Table Réservations
-- Date: 16 Décembre 2025
-- ===================================================================

USE vocalbox;

-- ===================================================================
-- TABLE: reservations
-- Gestion des réservations via l'assistant vocal
-- ===================================================================

CREATE TABLE IF NOT EXISTS `reservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `restaurant_id` int NOT NULL,
  `date` date NOT NULL COMMENT 'Date de la réservation',
  `heure` time NOT NULL COMMENT 'Heure de la réservation',
  `nb_personnes` int NOT NULL COMMENT 'Nombre de personnes',
  `nom_client` varchar(255) NOT NULL COMMENT 'Nom du client',
  `telephone` varchar(20) DEFAULT NULL COMMENT 'Téléphone du client',
  `email` varchar(255) DEFAULT NULL COMMENT 'Email du client (optionnel)',
  `commentaire` text DEFAULT NULL COMMENT 'Commentaires ou demandes spéciales',
  `status` enum('en_attente','confirmee','annulee','terminee','no_show') DEFAULT 'confirmee',
  `source` varchar(50) DEFAULT 'vocal' COMMENT 'Source de la réservation: vocal, web, telephone',
  `call_id` varchar(255) DEFAULT NULL COMMENT 'ID de l\'appel Telnyx si réservation vocale',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_restaurant_id` (`restaurant_id`),
  KEY `idx_date` (`date`),
  KEY `idx_date_heure` (`date`, `heure`),
  KEY `idx_status` (`status`),
  KEY `idx_telephone` (`telephone`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_rest_date_status` (`restaurant_id`, `date`, `status`),
  KEY `idx_date_time_status` (`date`, `heure`, `status`),
  CONSTRAINT `fk_reservations_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Table reservations créée avec succès !' AS message;
