// Configuration Stripe (à remplacer par ta vraie clé publique)
const STRIPE_PUBLIC_KEY = 'pk_test_VOTRE_CLE_PUBLIQUE_STRIPE';
const stripe = Stripe(STRIPE_PUBLIC_KEY);

// Variables globales
let currentStep = 1;
let uploadedPhotos = [];
let cardElement;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
    initializeStripe();
    initializeForm();
});

// Navigation entre les étapes
function nextStep(step) {
    // Validation avant de passer à l'étape suivante
    if (!validateStep(currentStep)) {
        return;
    }

    // Masquer l'étape actuelle
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    
    // Afficher la nouvelle étape
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
    
    currentStep = step;
    
    // Scroll vers le formulaire
    document.getElementById('commander').scrollIntoView({ behavior: 'smooth' });
}

function prevStep(step) {
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
    currentStep = step;
}

// Validation des étapes
function validateStep(step) {
    if (step === 1) {
        // Validation étape 1 : Informations restaurant
        const restaurantName = document.getElementById('restaurantName').value;
        const address = document.getElementById('address').value;
        const zipCode = document.getElementById('zipCode').value;
        const city = document.getElementById('city').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;

        if (!restaurantName || !address || !zipCode || !city || !phone || !email) {
            alert('Veuillez remplir tous les champs obligatoires');
            return false;
        }

        // Validation email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Veuillez entrer une adresse email valide');
            return false;
        }

        return true;
    }

    if (step === 2) {
        // Validation étape 2 : Photos menu
        if (uploadedPhotos.length === 0) {
            alert('Veuillez uploader au moins une photo de votre menu');
            return false;
        }
        return true;
    }

    return true;
}

// Gestion de l'upload de photos
function initializeUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('menuPhotos');
    const previewContainer = document.getElementById('previewContainer');

    // Clic sur la zone d'upload
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--primary-color)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-color)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        handleFiles(e.dataTransfer.files);
    });

    // Sélection de fichiers
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function handleFiles(files) {
    const maxFiles = 10;
    
    if (uploadedPhotos.length + files.length > maxFiles) {
        alert(`Vous ne pouvez uploader que ${maxFiles} photos maximum`);
        return;
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            alert('Veuillez uploader uniquement des images');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10 MB max
            alert('Les images ne doivent pas dépasser 10 MB');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const photoData = {
                file: file,
                dataUrl: e.target.result,
                id: Date.now() + Math.random()
            };
            
            uploadedPhotos.push(photoData);
            displayPreview(photoData);
        };
        
        reader.readAsDataURL(file);
    });
}

function displayPreview(photoData) {
    const previewContainer = document.getElementById('previewContainer');
    
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.dataset.id = photoData.id;
    
    previewItem.innerHTML = `
        <img src="${photoData.dataUrl}" alt="Menu photo">
        <button class="preview-remove" onclick="removePhoto(${photoData.id})">×</button>
    `;
    
    previewContainer.appendChild(previewItem);
}

function removePhoto(photoId) {
    // Retirer de la liste
    uploadedPhotos = uploadedPhotos.filter(photo => photo.id !== photoId);
    
    // Retirer de l'affichage
    const previewItem = document.querySelector(`.preview-item[data-id="${photoId}"]`);
    if (previewItem) {
        previewItem.remove();
    }
}

// Initialisation de Stripe
function initializeStripe() {
    const elements = stripe.elements();
    
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': {
                    color: '#9ca3af',
                },
            },
        },
    });
    
    cardElement.mount('#card-element');
    
    // Gestion des erreurs de carte
    cardElement.on('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });
}

// Initialisation du formulaire
function initializeForm() {
    const form = document.getElementById('orderForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePayment();
    });
}

// Gestion du paiement et envoi des données
async function handlePayment() {
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitLoader = document.getElementById('submitLoader');
    
    // Désactiver le bouton
    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitLoader.style.display = 'inline-block';

    try {
        // 1. Créer le Payment Intent côté serveur
        const orderData = collectFormData();
        
        // TODO: Remplacer par ton endpoint API
        const response = await fetch('https://api.vokalbox.fr/api/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        const { clientSecret, orderId } = await response.json();

        // 2. Confirmer le paiement avec Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: orderData.restaurantName,
                    email: orderData.email,
                    phone: orderData.phone,
                    address: {
                        line1: orderData.address,
                        postal_code: orderData.zipCode,
                        city: orderData.city,
                        country: 'FR'
                    }
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        if (paymentIntent.status === 'succeeded') {
            // 3. Envoyer les photos du menu
            await uploadMenuPhotos(orderId);
            
            // 4. Afficher la confirmation
            nextStep(4);
            
            // Réinitialiser le formulaire
            resetForm();
        }

    } catch (error) {
        console.error('Erreur lors du paiement:', error);
        alert('Erreur lors du paiement: ' + error.message);
        
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitLoader.style.display = 'none';
    }
}

// Collecte des données du formulaire
function collectFormData() {
    return {
        restaurantName: document.getElementById('restaurantName').value,
        address: document.getElementById('address').value,
        zipCode: document.getElementById('zipCode').value,
        city: document.getElementById('city').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        hours: document.getElementById('hours').value,
        amount: 4900, // 49€ en centimes
    };
}

// Upload des photos du menu
async function uploadMenuPhotos(orderId) {
    const formData = new FormData();
    formData.append('orderId', orderId);
    
    uploadedPhotos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo.file);
    });

    // TODO: Remplacer par ton endpoint API
    const response = await fetch('https://api.vokalbox.fr/api/upload-menu-photos', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Erreur lors de l\'upload des photos');
    }

    return await response.json();
}

// Réinitialisation du formulaire
function resetForm() {
    document.getElementById('orderForm').reset();
    uploadedPhotos = [];
    document.getElementById('previewContainer').innerHTML = '';
    cardElement.clear();
}

// Smooth scroll pour les liens d'ancrage
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
