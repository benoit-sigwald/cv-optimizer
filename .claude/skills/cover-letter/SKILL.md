---
name: cover-letter
description: Rédige la lettre de motivation d'une candidature analysée — accroche provocante, langue de l'offre, jamais de formules convenues. Utiliser après /analyze-offer (idéalement après /tailor-cv).
---

# Cover Letter

## Étapes

1. **Charger** la ligne `cv_applications` (job_spec, keywords, company_analysis, positioning, lang) et `cv_constraints` actives.
2. **Rédiger** dans la langue de l'offre, une page max :
   - **Accroche provocante/challenging** : une tension réelle du secteur ou de l'entreprise (tirée de company_analysis), jamais "passionné par l'IA", jamais de civilités creuses
   - Corps : 2-3 preuves quantifiées tirées du CV tailored, alignées sur les besoins explicites de l'offre
   - Traitement honnête d'un hard gate si gap (ex. certification en cours) — le retourner en force si possible
   - Chute courte orientée action (proposition de conversation, pas de supplique)
3. **Itérer** avec l'utilisateur : il préfère corriger des sections précises plutôt que des réécritures complètes.
4. **Enregistrer** le texte final dans `cv_applications.cover_letter`, et déposer une copie (`.md` ou DOCX) dans le **dossier entreprise** (le même que celui du CV — le réutiliser, jamais en créer un doublon), nommée `<YYYY.MM> Benoit SIGWALD <Entreprise> <Poste> Lettre de motivation.md` — le titre du poste figure dans le nom.
5. Sur demande, produire le DOCX (police Calibri, sobre, même en-tête de coordonnées que le CV).

## Registre

Direct, senior, légèrement provocateur. L'accroche doit pouvoir déranger un recruteur pressé — c'est voulu.
