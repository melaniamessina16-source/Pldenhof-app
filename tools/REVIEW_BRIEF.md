# Brief: check flagged bullets against the website

An automatic check found bullets in the Oldenhof app whose words do not appear in the website text of every page of the product. Some are harmless paraphrases; some are INVENTED or WRONG (examples found: "regelmatig aanzetten houdt het mes scherp" on a page that says nothing about sharpening; "gestanst (niet gesmeed)" on a page that says "gesmeed"; "beide zijden bruikbaar" on a page that never says so). Meli's rule: nothing may be in the app that is not on the website.

Work in /home/user/pldenhof-app. Your input is a JSON list (path in your task) of items {id, kind, ratio, bullet, files, pages}. For each item:
1. `python3 -I tools/page_text.py <id>` prints the product's bullets and the full website text and specs of EVERY page behind it.
2. Decide whether the flagged `bullet` is TRUE for every page shown, using only that text and the spec table. A bullet is fine when it restates (even in other words, shortened, or combined) something the page says. Meta wording such as "(volgens de tekst)", "(spec)", "staat in de productnaam" is fine if what it points to is true. Names, sizes, series, "inductie" etc. must match every page.
3. Actions: `keep` (supported), `replace` (the claim is partly right: give the corrected text, using only page content, same style: short plain Dutch), `drop` (not supported or wrong, or cannot be fixed with page content).
Be strict: if you cannot find the claim in the text of every page, replace or drop it. Do not add new claims, and do not use outside knowledge.

Output: write a JSON list to the output path in your task: [{"bullet": <exact flagged text>, "action": "keep"|"drop"|"replace", "new": "<only for replace>", "why": "<few words>"}]. One entry per distinct `bullet` text (a bullet shared by several products is decided once: it must be true for all of them, so check all products that carry it; the `files`/ids in the list show some, others can be found by searching data/curation-pans/*.json for the text). Process ALL items; do not stop early. Do not edit curation files, do not commit, do not touch shared files. The parent applies your decisions with tools/apply_review.py.

Final message: counts of keep/replace/drop, and the 5 most serious findings (what was wrong).
