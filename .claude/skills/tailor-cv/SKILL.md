---
name: tailor-cv
description: Génère un CV tailored (DOCX au format exact du Master CV) pour une candidature analysée — gap analysis, réécriture des bullets, génération et validation 1 page. Utiliser après /analyze-offer.
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
2. **Gap analysis** : mapper chaque keyword de l'offre → section/bullet du master. Trois listes : couvert tel quel / couvert mais à reformuler avec le vocabulaire de l'offre / non couvert (ne jamais inventer — signaler).
3. **Réécrire** le contenu (dans la langue de l'offre) :
   - Titre du header adapté au rôle visé
   - Accroche réordonnée selon le positionnement (IA en avant ou en accélérateur)
   - Skills grid : 6 cellules re-titrées avec les mots exacts de l'offre
   - Bullets : métriques quantifiées obligatoires, vocabulaire de l'offre, Liberty Global jamais étendu
4. **Écrire** le JSON dans `data/tailored.local.json` (gitignoré) au schéma de `data/example.cv.json`.
5. **Générer** : `npm run generate -- --data data/tailored.local.json --photo assets/photo.jpg --out "output/<YYYY.MM> Benoit SIGWALD <Company> CV.docx"`
6. **Valider 1 page** : convertir en PDF (`soffice --headless --convert-to pdf --outdir output <docx>`), rendre la première page en image (PyMuPDF) et la vérifier visuellement. Si débordement : couper dans les bullets les moins alignés avec l'offre, jamais dans les métriques. Ne pas se fier à pdfinfo.
7. **Mettre à jour** `cv_applications` : cv_notes (mapping keywords → sections, coupes effectuées), updated_at.

## Sortie

Chemin du DOCX + rendu image de la page + mapping keywords → sections + gaps signalés honnêtement.
