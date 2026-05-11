(function () {
    window.DaloaApp = window.DaloaApp || {};

    window.DaloaApp.config = {
        portal: {
            // Remplace cet id par l'id exact de ta WebScene ArcGIS Online si besoin.
            webSceneItemId: "c340b41a048140878a21693eebd8449d",
            url: "https://www.arcgis.com"
        },
        auth: {
            // Si la scene est privee, cree une application OAuth dans ArcGIS Online
            // puis colle son App ID ici.
            appId: ""
        },
        apiKey: "",
        view: {
            defaultBasemap: "topo-vector",
            defaultLanguage: "global",
            camera: {
                position: {
                    longitude: -6.4415869,
                    latitude: 6.875,
                    z: 2500
                },
                tilt: 60
            }
        },
        layers: {
            batiments: {
                title: "Batiments",
                portalTitleCandidates: ["Batiments", "Bâtiments"],
                url: "https://services7.arcgis.com/rAKPeqOliLB1eJQU/arcgis/rest/services/Scene_3D_04052026_WFL1/FeatureServer/9"
            },
            eclairages: {
                title: "Eclairages",
                portalTitleCandidates: ["Eclairages", "Éclairages"],
                url: "https://services7.arcgis.com/rAKPeqOliLB1eJQU/arcgis/rest/services/WebMap_sdk2D_WFL1/FeatureServer/0"
            }
        },
        fields: {
            batiments: {
                id: "Building_ID",
                floors: "Etages",
                type: "TYPE",
                nature: "NATURE",
                state: "ETAT",
                height: "Height_m",
                area: "AREA",
                objectId: "OBJECTID"
            },
            eclairages: {
                objectId: "OBJECTID"
            }
        }
    };
})();
