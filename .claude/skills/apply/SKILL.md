---
name: apply
description: Pipeline complet de candidature — enchaîne analyze-offer → tailor-cv → cover-letter → ats-score à partir d'une offre collée ou d'une URL. Utiliser quand l'utilisateur fournit une offre et veut le dossier complet (CV + lettre + score) en une commande.
---

# Apply — pipeline complet

Enchaîner les 4 skills dans l'ordre, sans s'arrêter entre les étapes sauf blocage réel :

1. **`/analyze-offer`** — analyse de l'offre, recherche entreprise, **benchmark salarial** (lieu × industrie × maturité de la boîte × profil), ligne `cv_applications` créée, job spec archivée en `<YYYY.MM> <Entreprise> <Poste> job-spec.md` dans le dossier entreprise.
   - ⚠️ Si un **hard gate bloquant** est détecté (certification exigée absente, habilitation…), le signaler immédiatement et demander si on continue — c'est le seul point d'arrêt volontaire du pipeline.
2. **`/tailor-cv`** — **screening recruteur** (pourquoi ce CV serait ignoré, en 6 secondes), gap analysis, réécriture orientée résultats mesurables et langage exécutif, génération et validation 1 page **en local**. Les livrables vont dans le **dossier entreprise** (réutilisé s'il existe, créé sinon — jamais de doublon) et portent le **titre du poste** dans leur nom.
3. **`/cover-letter`** — lettre dans la langue de l'offre, enregistrée dans `cv_applications` et déposée dans le dossier entreprise.
4. **`/ats-score`** — score avant/après, mapping keywords, **re-screening recruteur** du CV final, **audit stratégique de la candidature** (positionnement concurrentiel, proposition de valeur, défendabilité), scores enregistrés.

## Sortie finale (une seule synthèse)

- Chemin du dossier entreprise avec CV DOCX + PDF + lettre + job spec
- Lettre de motivation (texte intégral)
- Score ATS avant → après avec le delta
- Verdict du screening recruteur + zones faibles de l'audit stratégique
- Fourchette salariale estimée
- Hard gates et gaps signalés honnêtement
- Recommandations restantes (3 max)

## Règles

- Lire `cv_constraints` une seule fois au début, les appliquer sur tout le pipeline.
- Chaque étape utilise les données déjà enregistrées par la précédente (pas de re-analyse).
- L'itération fine (corriger une section, refaire l'accroche) se fait ensuite avec les skills individuels, pas en relançant tout le pipeline.
