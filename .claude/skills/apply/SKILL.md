---
name: apply
description: Pipeline complet de candidature — enchaîne analyze-offer → tailor-cv → cover-letter → ats-score à partir d'une offre collée ou d'une URL. Utiliser quand l'utilisateur fournit une offre et veut le dossier complet (CV + lettre + score) en une commande.
---

# Apply — pipeline complet

Enchaîner les 4 skills dans l'ordre, sans s'arrêter entre les étapes sauf blocage réel :

1. **`/analyze-offer`** — analyse de l'offre, recherche entreprise, ligne `cv_applications` créée.
   - ⚠️ Si un **hard gate bloquant** est détecté (certification exigée absente, habilitation…), le signaler immédiatement et demander si on continue — c'est le seul point d'arrêt volontaire du pipeline.
2. **`/tailor-cv`** — gap analysis, réécriture, génération DOCX, validation 1 page. Les livrables vont dans le **dossier entreprise** (réutilisé s'il existe, créé sinon — jamais de doublon).
3. **`/cover-letter`** — lettre dans la langue de l'offre, enregistrée dans `cv_applications` et déposée dans le dossier entreprise.
4. **`/ats-score`** — score avant/après, mapping keywords, scores enregistrés.

## Sortie finale (une seule synthèse)

- Chemin du dossier entreprise avec CV DOCX + PDF + lettre
- Lettre de motivation (texte intégral)
- Score ATS avant → après avec le delta
- Hard gates et gaps signalés honnêtement
- Recommandations restantes (3 max)

## Règles

- Lire `cv_constraints` une seule fois au début, les appliquer sur tout le pipeline.
- Chaque étape utilise les données déjà enregistrées par la précédente (pas de re-analyse).
- L'itération fine (corriger une section, refaire l'accroche) se fait ensuite avec les skills individuels, pas en relançant tout le pipeline.
