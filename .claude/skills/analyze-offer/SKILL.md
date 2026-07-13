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
8. **Benchmark salarial** (web search) : estimer la fourchette pour CE poste en croisant **lieu** (Paris vs région — décote/surcote locale), **industrie**, **maturité et taille de l'entreprise** (start-up, PME, ETI PE-backed, grand groupe ; CA, effectifs) et **le profil de Benoît** (séniorité 30 ans, positionnement C-level). Sources : APEC, Glassdoor, guides Michael Page/Hays/Robert Half. Enregistrer dans `cv_applications.salary_benchmark` (jsonb : fourchette_marche, fourchette_profil, facteurs, sources, date) et l'inclure dans la synthèse.
9. **Archiver la job spec** dans le dossier entreprise (réutilisé/créé selon la règle de rangement) : `<YYYY.MM> <Entreprise> <Poste> job-spec.md` — markdown brut condensé (format le moins gourmand en tokens) : titre + id `cv_applications` en en-tête, missions/profil en listes resserrées, contexte en un paragraphe. Jamais de PDF/DOCX pour ça.

## Sortie

Synthèse à l'utilisateur : langue, top keywords par catégorie, hard gates (en rouge si gap connu), positionnement recommandé, **fourchette salariale estimée** (marché + positionnement du profil), et l'id de la ligne `cv_applications` créée.
