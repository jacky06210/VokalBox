// ============================================
// VOCALBOX - Configuration Email
// /home/vocalbox/api/config/email.js
// ============================================

const nodemailer = require('nodemailer');

// Configuration SMTP
// À CONFIGURER avec les paramètres de votre hébergeur email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com', // Serveur SMTP Hostinger
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true pour port 465, false pour autres ports
    auth: {
        user: process.env.SMTP_USER || 'contact@vokalbox.fr',
        pass: process.env.SMTP_PASS || '' // À configurer dans .env
    }
});

// Vérifier la connexion SMTP au démarrage
transporter.verify((error, success) => {
    if (error) {
        console.log('⚠️  Erreur configuration SMTP:', error.message);
        console.log('ℹ️  Configurez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS dans .env');
    } else {
        console.log('✅ Serveur SMTP prêt à envoyer des emails');
    }
});

/**
 * Envoyer un email de bienvenue à un nouveau restaurant
 */
async function sendWelcomeEmail(restaurantData, userData) {
    const { nom_restaurant, email } = restaurantData;
    const { login, password_temp } = userData;

    const mailOptions = {
        from: '"VokalBox" <contact@vokalbox.fr>',
        to: email,
        subject: '🎉 Bienvenue sur VokalBox - Votre compte est créé !',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            margin: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
            margin: -40px -40px 30px -40px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .credentials {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .credentials p {
            margin: 10px 0;
            font-size: 16px;
        }
        .credentials strong {
            color: #667eea;
            font-size: 18px;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border: 2px solid #ffc107;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .warning strong {
            color: #856404;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎙️ Bienvenue sur VokalBox</h1>
        </div>
        
        <p>Bonjour,</p>
        
        <p>Félicitations ! Votre compte <strong>${nom_restaurant}</strong> a été créé avec succès sur VokalBox.</p>
        
        <p>Vous pouvez dès maintenant accéder à votre espace pour numériser vos menus et profiter de notre système de réponse vocale IA.</p>
        
        <div class="credentials">
            <p><strong>🔑 Vos identifiants de connexion :</strong></p>
            <p>👤 Login : <strong>${login}</strong></p>
            <p>🔒 Mot de passe temporaire : <strong>${password_temp}</strong></p>
        </div>
        
        <div style="text-align: center;">
            <a href="https://app.vokalbox.fr/maitre/" class="btn">
                📸 Accéder à VokalBox Maître
            </a>
        </div>
        
        <div class="warning">
            <p><strong>⚠️ IMPORTANT - Sécurité de votre compte</strong></p>
            <p>Pour des raisons de sécurité, vous devez <strong>obligatoirement changer votre login et votre mot de passe</strong> dans les <strong>8 jours</strong> suivant la création de votre compte.</p>
            <p>📧 Vous recevrez un rappel dans 5 jours.</p>
            <p>❌ Passé ce délai, votre accès sera temporairement suspendu jusqu'au changement de vos identifiants.</p>
        </div>
        
        <h3>🚀 Prochaines étapes :</h3>
        <ol>
            <li>Connectez-vous sur <a href="https://app.vokalbox.fr/maitre/">VokalBox Maître</a></li>
            <li>Changez votre login et mot de passe</li>
            <li>Scannez et numérisez vos menus</li>
            <li>Profitez de votre répondeur vocal IA !</li>
        </ol>
        
        <div class="footer">
            <p><strong>Besoin d'aide ?</strong></p>
            <p>Contactez-nous : <a href="mailto:contact@vokalbox.fr">contact@vokalbox.fr</a></p>
            <p>© 2025 VokalBox - E Formateck</p>
        </div>
    </div>
</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email de bienvenue envoyé à:', email);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Envoyer un rappel de changement de mot de passe (J+5)
 */
async function sendPasswordReminderEmail(restaurantData, userData) {
    const { nom_restaurant, email } = restaurantData;
    const { login, password_change_deadline } = userData;

    const mailOptions = {
        from: '"VokalBox" <contact@vokalbox.fr>',
        to: email,
        subject: '⚠️ Rappel : Changez vos identifiants VokalBox',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            margin: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: #ffc107;
            color: #333;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
            margin: -40px -40px 30px -40px;
        }
        .warning-box {
            background: #fff3cd;
            border: 3px solid #ffc107;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .btn {
            display: inline-block;
            background: #dc3545;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Rappel Important</h1>
        </div>
        
        <p>Bonjour <strong>${nom_restaurant}</strong>,</p>
        
        <div class="warning-box">
            <h2 style="margin-top:0;">Il vous reste 3 jours !</h2>
            <p style="font-size: 18px;">Vous devez changer vos identifiants avant le <strong>${password_change_deadline}</strong></p>
        </div>
        
        <p>Lors de votre inscription sur VokalBox, des identifiants temporaires vous ont été attribués :</p>
        <p>Login actuel : <strong>${login}</strong></p>
        
        <p><strong>Pour des raisons de sécurité</strong>, vous devez absolument personnaliser vos identifiants avant l'échéance.</p>
        
        <div style="text-align: center;">
            <a href="https://app.vokalbox.fr/maitre/" class="btn">
                🔒 Changer mes identifiants maintenant
            </a>
        </div>
        
        <p><strong>⚠️ Que se passe-t-il si je ne change pas mes identifiants ?</strong></p>
        <p>Votre accès à VokalBox sera temporairement suspendu jusqu'à ce que vous changiez vos identifiants.</p>
        
        <p>Cordialement,<br>L'équipe VokalBox</p>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p>Contact : <a href="mailto:contact@vokalbox.fr">contact@vokalbox.fr</a></p>
        </div>
    </div>
</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email de rappel envoyé à:', email);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi email rappel:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    transporter,
    sendWelcomeEmail,
    sendPasswordReminderEmail
};
