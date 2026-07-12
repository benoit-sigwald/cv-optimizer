---
name: analyze-offer
description: Analyse une offre d'emploi (texte collé ou URL) — mots-clés ATS, hard gates, langue, recherche entreprise, positionnement recommandé — et l'enregistre dans cv_applications. Utiliser dès qu'une offre/fiche de poste/JD est fournie.
---

# Analyze Offer

## Entrée

L'offre en texte collé, en fichier, ou en URL (dans ce cas, récupérer la page d'abord).

## Étapes

1. **Lire les contraintes actives** : `select rule, scope from cv_constraints where active = true` (Supabase, projet `eabuptcfoenqrvjlkmfk`). Les respecter toutes.
2. **Détecter la langue de l'offre** — elle détermine la langue du CV et de la lettre.
3. **Extraire les mots-clés ATS**, classés :
   - *Hard skills* (technos, méthodes, frameworks — ex. RAG, LLMOps, TOM, schéma directeur, build-vs-buy)
   - *Soft/leadership* (conduite du changement, C-level, multi-pays…)
   - *Vocabulaire maison* de l'entreprise (reprendre leurs termes exacts)
4. **Identifier les hard gates** : certifications exigées, habilitations (SC clearance…), années d'expérience, langues, mobilité. Les signaler explicitement — jamais les passer sous silence.
5. **Rechercher l'entreprise** (web search) : culture (boutique technique vs cabinet généraliste), actualité, frameworks internes, panel d'entretien probable.
6. **Recommander le positionnement** : IA en avant (rôle technique) ou IA en accélérateur (conseil généraliste), avec justification en une phrase.
7. **Enregistrer** dans `cv_applications` : company, role, location, lang, job_spec (texte intégral), keywords (jsonb classé), hard_gates (jsonb), positioning, company_analysis.

## Sortie

Synthèse à l'utilisateur : langue, top keywords par catégorie, hard gates (en rouge si gap connu), positionnement recommandé, et l'id de la ligne `cv_applications` créée.
