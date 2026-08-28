# One-time publish script. Run from inside C:\Users\viyan\GeomatryDASH.
# Safe to delete after you've run it once.

git init
git add .
git commit -m "Geometry Dash clone: 10 levels, skins, level editor, cheat codes"
git branch -M main
git remote add origin https://github.com/ViyanPrathiban31/Geometry-Dash-Clone.git
git push -u origin main
