# GRRR Care Knowledge Base - Seed Data

## 📁 Structure des fichiers

Place les fichiers du package **GRRR Care Knowledge Base V1** ici:

```
GRRR_Care_Mobile/supabase/
├── migrations/
│   ├── 001_pets.sql
│   ├── 002_health_records.sql (si tu l'as)
│   └── 002_knowledge_base.sql ✅ (CRÉÉE)
└── seed_data/
    ├── species.json          ← À télécharger
    ├── sources.json          ← À télécharger
    ├── documents.json        ← À télécharger
    ├── chunks.json           ← À télécharger
    ├── emergency_guides.json ← À télécharger
    ├── manifest.json         ← À télécharger
    └── README.md (ce fichier)
```

## 📦 Contenu du package Knowledge Base V1

**18 espèces/catégories avec emoji:**
🐶 chien, 🐱 chat, 🐰 lapin, 🐹 hamster, 🐭 souris, 🐀 rat, 🦦 furet, 🐦 oiseaux, 🦜 perroquets, 🐔 poules, 🦎 reptiles, 🐍 serpents, 🐢 tortues, 🐸 amphibiens, 🐠 poissons, 🐴 cheval, 🐾 autre

**20 sources vétérinaires:**
Merck Veterinary Manual, RSPCA, FDA, et 17 autres sources de référence

**24 fiches de connaissances:**
- Nutrition
- Prévention
- Symptômes
- Urgences
- Médicaments
- Habitat
- Comportement

**Guides d'urgence séparés:**
- Difficulté respiratoire
- Empoisonnement
- Saignement sévère

**Niveaux de risque:** low, moderate, high, emergency

**Sécurité médicaments intégrée:**
- Stockage correct
- Erreurs de dosage
- Exposition accidentelle
- Conformité FDA (pas de prescription IA)

## 🚀 Comment charger les données

### Étape 1: Télécharge le package
Télécharge **GRRR Care Knowledge Base V1** et extrais les fichiers JSON dans ce dossier.

### Étape 2: Applique le migration
```bash
cd GRRR_Care_Mobile
supabase db push
```
Cela crée les tables `knowledge_sources`, `knowledge_documents`, `knowledge_chunks`, et `emergency_guides`.

### Étape 3: Charge les données

**Option A: Via script Node.js (Recommandé)**

```javascript
// supabase/seed_data/seed.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  try {
    // 1. Load sources
    const sources = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'sources.json'), 'utf-8')
    );
    const { error: sourcesError } = await supabase
      .from('knowledge_sources')
      .insert(sources);
    if (sourcesError) throw sourcesError;
    console.log('✅ Sources loaded');

    // 2. Load documents
    const documents = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'documents.json'), 'utf-8')
    );
    const { error: docsError } = await supabase
      .from('knowledge_documents')
      .insert(documents);
    if (docsError) throw docsError;
    console.log('✅ Documents loaded');

    // 3. Load chunks (will have embeddings)
    const chunks = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'chunks.json'), 'utf-8')
    );
    const { error: chunksError } = await supabase
      .from('knowledge_chunks')
      .insert(chunks);
    if (chunksError) throw chunksError;
    console.log('✅ Chunks loaded');

    // 4. Load emergency guides
    const emergencyGuides = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'emergency_guides.json'), 'utf-8')
    );
    const { error: emergencyError } = await supabase
      .from('emergency_guides')
      .insert(emergencyGuides);
    if (emergencyError) throw emergencyError;
    console.log('✅ Emergency guides loaded');

    console.log('🎉 Knowledge base seeded successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
```

Puis lance:
```bash
node supabase/seed_data/seed.js
```

**Option B: Via Supabase CLI**
```bash
supabase seed run
```

## 🔍 Tester les données

### Test 1: Vérifier que les tables sont remplies
```sql
select count(*) from knowledge_sources;
select count(*) from knowledge_documents;
select count(*) from knowledge_chunks;
select count(*) from emergency_guides;
```

### Test 2: Chercher par espèce
```sql
select title, category from knowledge_documents 
where 'dog' = any(species) 
limit 5;
```

### Test 3: Chercher les guides d'urgence
```sql
select title, emergency_type from emergency_guides
where is_published = true
limit 5;
```

## 🔗 Prochaines étapes

1. ✅ Migration schema créée: `002_knowledge_base.sql`
2. ⏳ Télécharge le package `GRRR Care Knowledge Base V1`
3. ⏳ Place les 6 fichiers JSON dans ce dossier
4. ⏳ Lance `supabase db push` 
5. ⏳ Lance le script de seed
6. ⏳ Teste les queries
7. ⏳ **Phase 3**: Intègre avec Claude AI Agent Orchestrator

## 📊 Schéma des tables

### knowledge_sources
```json
{
  "id": "uuid",
  "name": "Merck Veterinary Manual",
  "description": "Comprehensive veterinary reference",
  "url": "https://www.merckvetmanual.com",
  "authority_level": "primary",
  "organization": "Merck",
  "verified_date": "2025-01-01",
  "is_active": true
}
```

### knowledge_documents
```json
{
  "id": "uuid",
  "title": "Puppy Nutrition Guide",
  "category": "nutrition",
  "species": ["dog"],
  "tags": ["food", "puppies", "diet"],
  "risk_level": "moderate",
  "source_id": "uuid",
  "content": "Full content...",
  "is_published": true
}
```

### knowledge_chunks (pour RAG)
```json
{
  "id": "uuid",
  "document_id": "uuid",
  "chunk_text": "Puppies need high-protein diets...",
  "chunk_index": 0,
  "embedding": [0.123, 0.456, ...],
  "metadata": {
    "species": ["dog"],
    "risk_level": "moderate",
    "category": "nutrition"
  }
}
```

### emergency_guides
```json
{
  "id": "uuid",
  "title": "Choking - What to Do",
  "emergency_type": "choking",
  "species": ["dog", "cat"],
  "symptoms": ["difficulty breathing", "excessive drooling"],
  "immediate_actions": ["Remove object if visible", "Call vet immediately"],
  "when_to_call_vet": "Immediately",
  "risk_level": "emergency"
}
```

## 🔐 Sécurité

✅ **RLS Policy**: Lecture publique (la santé animale est une info publique)  
✅ **Admin-only writes**: Seuls les admins peuvent modifier  
✅ **No AI Prescription**: Les guides disent "appeler un vétérinaire"  
✅ **FDA Compliance**: Directives sur stockage et exposition aux médicaments  
✅ **Verified Sources**: Toutes les sources sont citées (Merck, RSPCA, FDA, etc.)

---

**Questions?** Consulte le README du projet ou contacte l'équipe GRRR Care.
