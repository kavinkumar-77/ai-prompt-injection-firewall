# Project Status

## Honest Current State

* **What works:** The basic project structure, tests for the old pipeline (which passes with the current placeholder data), dataset schema definition, and download scripts.
* **What is a placeholder:** The synthetic dataset pipeline is currently a placeholder. Several loaders (`deepset`, `jackhhao`, `BIPIA`, `HackAPrompt`, `OASST1`) build rows from hand-written Python lists and itertools combinations but label them with real dataset names. This misrepresents the data and violates the new integrity rules.
* **What is missing:** Real datasets have not been successfully downloaded or verified yet. The shortcut audit failed (or has not been correctly implemented to pass the new checks). PR #21 is not merged and holds the previous iterations of dataset pipeline fixes.
* **What is measured:** Nothing is rigorously measured yet on real data since the pipeline currently relies on placeholders.
