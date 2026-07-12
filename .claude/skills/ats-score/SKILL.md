---
name: ats-score
description: Score ATS d'un CV contre une offre analysée, avant/après tailoring, avec mapping mot-clé → section et recommandations priorisées. Utiliser pour évaluer un CV (master ou tailored) contre une ligne cv_applications.
---

# ATS Score

## Étapes

1. **Charger** la ligne `cv_applications` (keywords, hard_gates) et le CV à évaluer (master depuis `cv_master`, ou tailored depuis `data/tailored.local.json`).
2. **Scorer sur 100** :
   - Couverture keywords hard skills (40 pts) — présence exacte ou synonyme, pondérée par l'importance dans l'offre
   - Couverture soft/leadership (20 pts)
   - Hard gates (20 pts) — un gate non couvert et non adressé = pénalité forte, signalé en rouge
   - Lisibilité ATS et métriques quantifiées (20 pts)
3. **Produire le tableau** : keyword → présent/absent → section du CV → action recommandée.
4. **Avant/après** : si le tailored existe, scorer les deux et montrer le delta.
5. **Recommandations priorisées** : 3-5 actions max, les plus rentables d'abord.
6. **Enregistrer** `ats_score_before` / `ats_score_after` dans `cv_applications`.

## Honnêteté

Le score ne se négocie pas : un gap est un gap. Ne jamais gonfler le score après tailoring sans amélioration réelle de la couverture.
