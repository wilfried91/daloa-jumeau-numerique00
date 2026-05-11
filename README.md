# Jumeau numerique de Daloa

Application web 3D basee sur ArcGIS Maps SDK for JavaScript.

## Structure

- `index.html` : point d'entree de l'application et panneau d'interface.
- `css/styles.css` : styles de l'interface, du panneau, des statistiques et du mode mobile.
- `src/config.js` : configuration ArcGIS Online, ID de WebScene, URLs de couches et noms de champs.
- `src/renderers.js` : symbologie 3D des batiments et des points d'eclairage.
- `src/app.js` : chargement de la WebScene, creation du `SceneView`, widgets, filtres, statistiques, export CSV et mesures.

Les anciens fichiers HTML sont conserves comme prototypes ou archives de travail.

## Configuration principale

Dans `src/config.js`, remplace `portal.webSceneItemId` par l'ID exact de ta scene 3D publiee sur ArcGIS Online.

Si la scene est privee, renseigne aussi `auth.appId` avec l'App ID OAuth cree dans ArcGIS Online.

```js
portal: {
    webSceneItemId: "ID_DE_TA_WEBSCENE",
    url: "https://www.arcgis.com"
},
auth: {
    appId: "ID_OAUTH_SI_SCENE_PRIVEE"
}
```

## Lancer le projet

Depuis ce dossier :

```powershell
python -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000/index.html
```

## Fonctionnement

L'application essaie d'abord de charger la WebScene publiee. Si elle ne peut pas etre chargee, elle utilise un chargement de secours avec les couches configurees dans `src/config.js`, ce qui permet de continuer a travailler pendant que l'ID de la scene ou l'authentification sont ajustes.
