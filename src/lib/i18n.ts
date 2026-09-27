export const translations = {
  en: {
    common: {
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      back: 'Back',
      yes: 'Yes',
      no: 'No',
    },
    home: {
      greeting: 'Good morning! 👋',
      subtitle: 'How are your furry friends doing today?',
      whoAreCaring: 'WHO ARE WE CARING FOR?',
      recentActivity: 'RECENT ACTIVITY',
      quickActions: 'QUICK ACTIONS',
      healthScore: 'Health Score',
      vaccinations: 'Vaccinations',
      medications: 'Medications',
      lastCheckUp: 'LAST CHECK-UP',
      healthy: 'Healthy',
      lastCheckUpDate: 'Mar 15, 2025',
    },
    pets: {
      yourCompanions: 'Your Companions',
      myPets: 'My Pets',
      noPets: 'No pets added yet',
      noPetsDesc: 'Start by adding your first furry friend to get personalized health insights',
      addYourFirstPet: '+ Add Your First Pet',
      addAnotherPet: 'Add Another Pet',
      otherPets: 'OTHER PETS',
      yearsOld: 'years old',
      weight: 'weight',
      species: 'species',
      petCareTips: 'Pet Care Tips',
      petCareTipsDesc: 'Keep health records up to date and track medications regularly',
    },
    chat: {
      askGRRR: 'Ask GRRR',
      chattingAbout: 'Chatting about',
      careTips: 'Care Tips',
      petVoice: 'Pet Voice',
      cuteMode: 'Cute Mode',
      startConversation: 'Start the conversation',
      askAnything: "Ask anything about {{pet}}'s health, behavior, or diet",
      tryAsking: 'Try asking:',
      vaccines: 'What vaccines does {{pet}} need?',
      food: 'How much should {{pet}} eat daily?',
      concerns: 'Are there any health concerns for {{breed}}?',
      askAbout: 'Ask about health, diet, behavior...',
      medicalSources: 'Medical Sources',
    },
    health: {
      healthRecords: 'Health Records',
      addRecord: 'Add Record',
      noRecords: 'No health records yet',
      vaccinations: 'Vaccinations',
      medications: 'Medications',
      appointments: 'Appointments',
      date: 'Date',
      type: 'Type',
      details: 'Details',
    },
    findVet: {
      findVet: 'Find Vet',
      nearbyVets: 'Nearby Veterinarians',
      clinics: 'Clinics & Hospitals',
      distance: 'Distance',
      phone: 'Phone',
      address: 'Address',
      online: 'Online Services',
      noVets: 'No vets found',
    },
    settings: {
      settings: 'Settings',
      appearance: 'Appearance',
      language: 'Language',
      theme: 'Theme',
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      about: 'About',
      version: 'Version',
      contact: 'Contact Support',
    },
  },
  fr: {
    common: {
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      add: 'Ajouter',
      back: 'Retour',
      yes: 'Oui',
      no: 'Non',
    },
    home: {
      greeting: 'Bonjour! 👋',
      subtitle: 'Comment vont vos petits compagnons?',
      whoAreCaring: 'QUI SOIGNONS-NOUS?',
      recentActivity: 'ACTIVITÉ RÉCENTE',
      quickActions: 'ACTIONS RAPIDES',
      healthScore: 'Score de santé',
      vaccinations: 'Vaccinations',
      medications: 'Médicaments',
      lastCheckUp: 'DERNIÈRE VISITE',
      healthy: 'En bonne santé',
      lastCheckUpDate: '15 mars 2025',
    },
    pets: {
      yourCompanions: 'Vos Compagnons',
      myPets: 'Mes Animaux',
      noPets: 'Aucun animal ajouté',
      noPetsDesc: 'Commencez par ajouter votre premier compagnon pour des conseils de santé personnalisés',
      addYourFirstPet: '+ Ajouter votre premier animal',
      addAnotherPet: 'Ajouter un autre animal',
      otherPets: 'AUTRES ANIMAUX',
      yearsOld: 'ans',
      weight: 'poids',
      species: 'espèce',
      petCareTips: 'Conseils de soin',
      petCareTipsDesc: 'Tenez à jour les dossiers médicaux et suivez régulièrement les médicaments',
    },
    chat: {
      askGRRR: 'Demander à GRRR',
      chattingAbout: 'Conversation sur',
      careTips: 'Conseils santé',
      petVoice: 'Voix du pet',
      cuteMode: 'Mode mignon',
      startConversation: 'Commencer la conversation',
      askAnything: 'Posez une question sur la santé, le comportement ou l\'alimentation de {{pet}}',
      tryAsking: 'Essayez de demander:',
      vaccines: 'Quels vaccins {{pet}} a-t-il besoin?',
      food: 'Combien {{pet}} devrait-il manger par jour?',
      concerns: 'Y a-t-il des problèmes de santé pour {{breed}}?',
      askAbout: 'Posez une question sur la santé, l\'alimentation, le comportement...',
      medicalSources: 'Sources Médicales',
    },
    health: {
      healthRecords: 'Dossiers Médicaux',
      addRecord: 'Ajouter un dossier',
      noRecords: 'Pas de dossiers médicaux',
      vaccinations: 'Vaccinations',
      medications: 'Médicaments',
      appointments: 'Rendez-vous',
      date: 'Date',
      type: 'Type',
      details: 'Détails',
    },
    findVet: {
      findVet: 'Trouver un vét',
      nearbyVets: 'Vétérinaires à proximité',
      clinics: 'Cliniques & Hôpitaux',
      distance: 'Distance',
      phone: 'Téléphone',
      address: 'Adresse',
      online: 'Services en ligne',
      noVets: 'Aucun vétérinaire trouvé',
    },
    settings: {
      settings: 'Paramètres',
      appearance: 'Apparence',
      language: 'Langue',
      theme: 'Thème',
      lightMode: 'Mode clair',
      darkMode: 'Mode sombre',
      about: 'À propos',
      version: 'Version',
      contact: 'Contacter le support',
    },
  },
} as const;

export type Language = 'en' | 'fr';

export function t(key: string, lang: Language, params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  if (!value) return key;

  if (params) {
    return Object.entries(params).reduce(
      (acc, [key, val]) => acc.replace(`{{${key}}}`, val),
      value
    );
  }

  return value;
}
