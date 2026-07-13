---
name: tailor-cv
description: Génère un CV tailored (DOCX au format du Master CV, variante aérée) pour une candidature analysée — screening recruteur, gap analysis, réécriture orientée résultats, génération et validation 1 page. Utiliser après /analyze-offer.
---

# Tailor CV

## Prérequis

Une ligne `cv_applications` existe (sinon lancer d'abord `/analyze-offer`).

## Étapes

1. **Charger** depuis Supabase (`eabuptcfoenqrvjlkmfk`) :
   - `cv_master` (where `is_current = true`) — source de vérité, ne jamais inventer
   - `cv_skills_bank` — preuves et métriques mobilisables
   - `cv_constraints` (active) — les appliquer toutes
   - la ligne `cv_applications` visée (keywords, hard_gates, positioning, lang)
2. **Screening recruteur** : agir comme un recruteur senior qui trie 300 CV par jour et lit celui-ci 6 secondes. Dire sans ménagement **pourquoi ce CV serait ignoré pour CE poste** (titre à côté du rôle, accroche générique, mots-clés absents, réalisations invisibles…), puis lister les **modifications suggérées**, priorisées. Ce verdict pilote la réécriture.
3. **Gap analysis** : mapper chaque keyword de l'offre → section/bullet du master. Trois listes : couvert tel quel / couvert mais à reformuler avec le vocabulaire de l'offre / non couvert (ne jamais inventer — signaler).
4. **Réécrire** le contenu (dans la langue de l'offre) :
   - Titre du header adapté au rôle visé — **une seule ligne** (≤55 caractères)
   - **Accroche = positionnement clair pour CE poste** : qui il est, ses spécialités, et **les résultats qu'il livre** (toujours des résultats chiffrés) — réordonnée selon le positionnement (IA en avant ou en accélérateur)
   - Skills grid : 6 cellules re-titrées avec les mots exacts de l'offre — les compétences clés et réalisations pour le poste doivent **sauter aux yeux dès la première seconde** (structure visuelle : cellules thématiques, métriques dans les cellules, résultats en tête de bullet)
   - Bullets : **convertir chaque responsabilité en réalisation mesurable** — jamais d'énoncé de tâche sans résultat ; métriques, outcomes et impact business réels uniquement (jamais inventés)
   - **Langage exécutif, concis, affirmé** : couper les mots de remplissage, les tournures passives et les généralités — tout reste exact et honnête
   - Liberty Global jamais étendu
5. **Écrire** le JSON dans `data/tailored.local.json` (gitignoré, dans le dossier moteur) au schéma de `data/example.cv.json`, puis **archiver une copie** dans `data/archive/tailored.<YYYY-MM>.<entreprise>.<poste>.json` (itérations futures sans perdre la version).
6. **Dossier entreprise** (dans la racine de sortie configurée par le CLAUDE.md hôte, ex. `G:\My Drive\CV`) :
   - **Lister les dossiers existants** et chercher une correspondance avec l'entreprise, insensible à la casse, aux espaces et aux variantes de nommage (ex. « Capgemini » ↔ « Cap Gemini », nom complet vs sigle)
   - S'il existe → **le réutiliser tel quel, ne JAMAIS en créer un doublon**
   - Sinon seulement → le créer avec le nom usuel de l'entreprise
7. **Générer et valider EN LOCAL** (jamais mesurer un fichier sur un drive synchronisé — cache trompeur) : `node scripts/generate-cv.mjs --data data/tailored.local.json --photo assets/photo.jpg --out <fichier local>`, convertir en PDF (`soffice --headless`), rendre la première page en image (PyMuPDF) et vérifier visuellement : **1 page**, titre header sur une ligne, page remplie (~y 800-825pt) mais aérée. Si débordement : couper dans les bullets les moins alignés avec l'offre, jamais dans les métriques. Ne pas se fier à pdfinfo.
8. **Déposer les livrables validés** (copie du DOCX + PDF locaux) dans le dossier entreprise : `<YYYY.MM> Benoit SIGWALD <Entreprise> <Poste> CV.docx/pdf` — le **titre du poste figure dans le nom de chaque livrable** ; plusieurs candidatures peuvent coexister chez une même entreprise, ne jamais écraser celles d'un autre poste.
9. **Mettre à jour** `cv_applications` : cv_notes (verdict screening, mapping keywords → sections, coupes effectuées, chemin du dossier), updated_at.

## Sortie

Chemin du dossier entreprise + rendu image de la page + verdict du screening recruteur + mapping keywords → sections + gaps signalés honnêtement.
