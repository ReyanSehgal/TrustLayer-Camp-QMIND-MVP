# Working together

1. Clone the shared repository after Reyan shares its GitHub link. Open the folder and follow README setup.
2. Before starting work, pull the latest main branch, then create your branch:

```bash
git switch main
git pull
git switch -c yourname/task
```

3. Work on your agreed task. Coordinate before editing the same files.
4. Review your changes and commit specific files (replace the example filename with your own):

```bash
git status
git add your_file.py
git commit -m "Describe what changed"
git push -u origin yourname/task
```

5. Open a pull request on GitHub. Explain what works, how you checked it, and anything incomplete. Reyan and Jinpeng coordinate review and integration.

Do not commit virtual environments, credentials or private messages. Retain model and dataset attribution. Generated demo WAVs are ignored; original sample WAVs remain tracked. Final small result CSVs can be committed deliberately.

If Git is unfamiliar, pair with someone for the first commit. Keep the build moving on one working laptop if necessary.
