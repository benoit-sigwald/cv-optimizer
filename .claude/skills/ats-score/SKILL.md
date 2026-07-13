---
name: ats-score
description: Score ATS d'un CV contre une offre analysée, avant/après tailoring, avec mapping mot-clé → section, re-screening recruteur, audit stratégique de la candidature et recommandations priorisées. Utiliser pour évaluer un CV (master ou tailored) contre une ligne cv_applications.
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
5. **Re-screening recruteur** : relire le CV final comme un recruteur senior qui trie 300 CV par jour — le CV passe-t-il maintenant les 6 secondes pour CE poste ? Si non, dire pourquoi et corriger avant de conclure.
6. **Audit stratégique de la candidature** (à froid, comme un cabinet de conseil top-tier) :
   - **Positionnement concurrentiel** : face aux autres candidats probables sur ce poste, où ce dossier gagne-t-il, où perd-il ?
   - **Clarté de la proposition de valeur** : un décideur pressé peut-il redire en une phrase pourquoi lui ?
   - **Défendabilité** : quelles faiblesses un candidat concurrent ou un recruteur sceptique exploiterait-il en premier (gaps techniques, âge, salaire, sur-calibrage…) — et le dossier les désamorce-t-il ?
   - **Scalabilité du récit** : le positionnement tient-il en entretien face au panel probable (company_analysis) ?
   - Conclure sur les 2-3 zones stratégiques les plus faibles et comment les renforcer.
7. **Enregistrer** `ats_score_before` / `ats_score_after` dans `cv_applications`, et l'audit dans cv_notes.

## Honnêteté

Le score ne se négocie pas : un gap est un gap. Ne jamais gonfler le score après tailoring sans amélioration réelle de la couverture.
