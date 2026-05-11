# Deploiement GitHub Pages

Ce projet est une application statique. Elle peut etre publiee avec GitHub Pages sans serveur backend.

## Page actuelle a publier

La version active de travail est :

```text
index_test.html
```

Elle utilise aussi :

```text
index_etales_leaflet.html
models/lampadaire.gltf
```

Les donnees ArcGIS sont appelees depuis les services ArcGIS Online publics.

## Lien partageable attendu

Si le depot GitHub s'appelle `ArcgisMap` et que ton compte GitHub est `mon-compte`, le lien sera de ce type :

```text
https://mon-compte.github.io/ArcgisMap/index_test.html
```

Pour avoir un lien plus propre sans `index_test.html`, il faudra soit renommer `index_test.html` en `index.html`, soit faire de `index.html` la page principale de cette version.

## Commandes de base

Depuis le dossier du projet :

```powershell
git init
git add .
git commit -m "Initial deployment of Daloa digital twin"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/TON-DEPOT.git
git push -u origin main
```

Ensuite dans GitHub :

```text
Settings > Pages > Build and deployment > Source: Deploy from a branch
Branch: main
Folder: /root
Save
```

Apres quelques minutes, GitHub donnera le lien public de l'application.

## Recommandation

Quand la version `index_test.html` sera validee, il est preferable de la promouvoir en `index.html` pour que le lien partageable soit simplement :

```text
https://TON-COMPTE.github.io/TON-DEPOT/
```

