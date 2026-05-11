(function () {
    const app = window.DaloaApp;
    const config = app.config;
    const renderers = app.renderers;

    require([
        "esri/WebScene",
        "esri/views/SceneView",
        "esri/Basemap",
        "esri/config",
        "esri/layers/FeatureLayer",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/geometry/geometryEngine",
        "esri/geometry/Polyline",
        "esri/geometry/Polygon",
        "esri/widgets/Search",
        "esri/widgets/Home",
        "esri/widgets/Fullscreen",
        "esri/widgets/ScaleBar",
        "esri/identity/OAuthInfo",
        "esri/identity/IdentityManager"
    ], function (
        WebScene,
        SceneView,
        Basemap,
        esriConfig,
        FeatureLayer,
        GraphicsLayer,
        Graphic,
        geometryEngine,
        Polyline,
        Polygon,
        Search,
        Home,
        Fullscreen,
        ScaleBar,
        OAuthInfo,
        IdentityManager
    ) {
        let scene;
        let view;
        let batimentsLayer;
        let eclairagesLayer;
        let measureLayer;
        let currentBasemapId = config.view.defaultBasemap;
        let currentLang = config.view.defaultLanguage;
        let measureMode = null;
        let measurePoints = [];
        let clickHandler = null;
        let dblClickHandler = null;

        const arcgisStyleMap = {
            "topo-vector": "arcgis/topographic",
            "streets-vector": "arcgis/streets",
            "dark-gray-vector": "arcgis/dark-gray",
            "gray-vector": "arcgis/light-gray",
            "terrain": "arcgis/terrain"
        };
        const noLangBasemaps = ["satellite", "hybrid", "osm"];

        if (config.apiKey) {
            esriConfig.apiKey = config.apiKey;
        }
        if (config.portal.url) {
            esriConfig.portalUrl = config.portal.url;
        }
        if (config.auth.appId) {
            IdentityManager.registerOAuthInfos([
                new OAuthInfo({
                    appId: config.auth.appId,
                    portalUrl: config.portal.url,
                    popup: true
                })
            ]);
        }

        init().catch((error) => {
            console.error("Erreur d'initialisation de l'application", error);
            showQueryMessage("error", "Impossible de charger la scene. Verifie l'id ArcGIS Online dans src/config.js.");
        });

        async function init() {
            scene = await loadPublishedScene();
            measureLayer = new GraphicsLayer({ title: "Mesures" });
            scene.add(measureLayer);

            batimentsLayer = ensureOperationalLayer("batiments", FeatureLayer);
            eclairagesLayer = ensureOperationalLayer("eclairages", FeatureLayer);

            styleOperationalLayers();
            createView();
            bindPanelEvents();

            await view.when();
            setupArcGISWidgets();
            setupPointerCoordinates();
            await zoomToData();
            loadStats();
            applyBasemap(currentBasemapId, currentLang);
            setupMobilePanel();
        }

        async function loadPublishedScene() {
            if (config.portal.webSceneItemId) {
                const webScene = new WebScene({
                    portalItem: { id: config.portal.webSceneItemId }
                });

                try {
                    await webScene.load();
                    return webScene;
                } catch (error) {
                    console.warn("La WebScene publiee n'a pas pu etre chargee, chargement de secours.", error);
                }
            }

            return new WebScene({
                basemap: currentBasemapId,
                layers: []
            });
        }

        function ensureOperationalLayer(layerKey, FeatureLayerCtor) {
            const layerConfig = config.layers[layerKey];
            const candidates = layerConfig.portalTitleCandidates || [layerConfig.title];
            const existingLayer = findLayerByTitleOrUrl(candidates, layerConfig.url);

            if (existingLayer) {
                return existingLayer;
            }

            const layer = new FeatureLayerCtor({
                url: layerConfig.url,
                title: layerConfig.title,
                outFields: ["*"],
                popupEnabled: true
            });
            scene.add(layer);
            return layer;
        }

        function findLayerByTitleOrUrl(titleCandidates, url) {
            const layers = scene.allLayers ? scene.allLayers.toArray() : scene.layers.toArray();
            return layers.find((layer) => {
                const titleMatch = titleCandidates.some((candidate) => normalize(candidate) === normalize(layer.title));
                const urlMatch = layer.url && url && layer.url.toLowerCase() === url.toLowerCase();
                return titleMatch || urlMatch;
            });
        }

        function normalize(value) {
            return (value || "")
                .toString()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();
        }

        function styleOperationalLayers() {
            if (batimentsLayer) {
                batimentsLayer.title = config.layers.batiments.title;
                batimentsLayer.outFields = ["*"];
                batimentsLayer.renderer = renderers.batiments3D;
                batimentsLayer.popupEnabled = true;
                batimentsLayer.popupTemplate = {
                    title: "Batiment",
                    content: [{
                        type: "fields",
                        fieldInfos: [
                            { fieldName: config.fields.batiments.floors, label: "Nombre d'etages" },
                            { fieldName: config.fields.batiments.type, label: "Type" },
                            { fieldName: config.fields.batiments.nature, label: "Nature" },
                            { fieldName: config.fields.batiments.state, label: "Etat" },
                            { fieldName: config.fields.batiments.height, label: "Hauteur (m)" },
                            { fieldName: config.fields.batiments.area, label: "Surface (m2)" },
                            { fieldName: config.fields.batiments.id, label: "ID Batiment" }
                        ]
                    }]
                };
            }

            if (eclairagesLayer) {
                eclairagesLayer.title = config.layers.eclairages.title;
                eclairagesLayer.outFields = ["*"];
                eclairagesLayer.renderer = renderers.eclairages3D;
                eclairagesLayer.popupEnabled = true;
                eclairagesLayer.popupTemplate = {
                    title: "Point d'eclairage",
                    content: [{
                        type: "fields",
                        fieldInfos: [{ fieldName: config.fields.eclairages.objectId, label: "ID" }]
                    }]
                };
            }
        }

        function createView() {
            view = new SceneView({
                container: "viewDiv",
                map: scene,
                camera: config.view.camera,
                environment: {
                    atmosphere: { quality: "high" },
                    lighting: {
                        directShadowsEnabled: true,
                        ambientOcclusionEnabled: true
                    }
                }
            });
        }

        function setupArcGISWidgets() {
            view.ui.move("zoom", "top-left");
            view.ui.add(new Search({ view, placeholder: "Rechercher une adresse..." }), "top-left");
            view.ui.add(new Home({ view }), "top-left");
            view.ui.add(new Fullscreen({ view }), "top-left");
            view.ui.add(new ScaleBar({ view, unit: "metric" }), "bottom-left");
            view.ui.add(document.getElementById("mainPanel"), "top-right");
        }

        function setupPointerCoordinates() {
            view.on("pointer-move", (event) => {
                const point = view.toMap({ x: event.x, y: event.y });
                if (!point) return;
                document.getElementById("coordsBar").textContent =
                    `Lat : ${point.latitude.toFixed(6)} | Lon : ${point.longitude.toFixed(6)}`;
            });
        }

        async function zoomToData() {
            if (!batimentsLayer || !batimentsLayer.createQuery || !batimentsLayer.queryExtent) return;
            try {
                const query = batimentsLayer.createQuery();
                query.where = "1=1";
                const result = await batimentsLayer.queryExtent(query);
                if (result.extent) {
                    await view.goTo(result.extent.expand(1.2), { duration: 1000 });
                }
            } catch (error) {
                console.warn("Zoom initial impossible", error);
            }
        }

        function applyBasemap(basemapId, lang) {
            const langSelect = document.getElementById("langSelect");
            const langNote = document.getElementById("langNote");

            if (noLangBasemaps.includes(basemapId)) {
                langSelect.disabled = true;
                langNote.style.display = "block";
                langNote.textContent = "Ce fond ne supporte pas la langue des etiquettes.";
                scene.basemap = basemapId;
                return;
            }

            if (esriConfig.apiKey && arcgisStyleMap[basemapId]) {
                langSelect.disabled = false;
                langNote.style.display = "none";
                scene.basemap = new Basemap({
                    style: {
                        id: arcgisStyleMap[basemapId],
                        language: lang === "global" ? undefined : lang
                    }
                });
                return;
            }

            langSelect.disabled = false;
            langNote.style.display = "block";
            langNote.textContent = "Ajoute une cle API dans src/config.js pour forcer la langue du fond.";
            scene.basemap = basemapId;
        }

        function loadStats() {
            loadBuildingStats();
            loadLightingStats();
        }

        function loadBuildingStats() {
            if (!batimentsLayer || !batimentsLayer.createQuery || !batimentsLayer.queryFeatures) return;

            const fields = config.fields.batiments;
            const currentFilter = batimentsLayer.definitionExpression || "1=1";
            const query = batimentsLayer.createQuery();
            query.where = currentFilter;
            query.outStatistics = [
                { statisticType: "count", onStatisticField: fields.objectId, outStatisticFieldName: "total" },
                { statisticType: "avg", onStatisticField: fields.floors, outStatisticFieldName: "moy_etages" },
                { statisticType: "max", onStatisticField: fields.floors, outStatisticFieldName: "max_etages" },
                { statisticType: "sum", onStatisticField: fields.area, outStatisticFieldName: "surf_totale" }
            ];

            batimentsLayer.queryFeatures(query).then((result) => {
                const attributes = result.features[0].attributes;
                setText("statTotalBat", attributes.total ?? "-");
                setText("statMoyEtages", attributes.moy_etages ? attributes.moy_etages.toFixed(1) : "-");
                setText("statMaxEtages", attributes.max_etages ?? "-");
                setText("statSurfTotale", attributes.surf_totale ? Math.round(attributes.surf_totale).toLocaleString("fr-FR") : "-");
                updateFilterBadge(currentFilter);
            }).catch((error) => console.warn("Statistiques batiments indisponibles", error));
        }

        function loadLightingStats() {
            if (!eclairagesLayer || !eclairagesLayer.createQuery || !eclairagesLayer.queryFeatureCount) return;
            const query = eclairagesLayer.createQuery();
            query.where = "1=1";
            eclairagesLayer.queryFeatureCount(query)
                .then((count) => setText("statTotalEcl", count))
                .catch((error) => console.warn("Statistiques eclairages indisponibles", error));
        }

        function updateFilterBadge(whereClause) {
            const badge = document.getElementById("statsFilterBadge");
            if (whereClause && whereClause !== "1=1") {
                badge.textContent = `Filtre : ${whereClause}`;
                badge.style.display = "block";
            } else {
                badge.style.display = "none";
            }
        }

        function applyFilter(whereClause) {
            if (!batimentsLayer || !batimentsLayer.createQuery || !batimentsLayer.queryFeatureCount) return;

            batimentsLayer.definitionExpression = whereClause;
            const query = batimentsLayer.createQuery();
            query.where = whereClause;

            batimentsLayer.queryFeatureCount(query).then((count) => {
                showQueryMessage("success", `${count} batiment${count > 1 ? "s" : ""} trouve${count > 1 ? "s" : ""}`);
                if (count > 0 && batimentsLayer.queryExtent) {
                    batimentsLayer.queryExtent(query).then((result) => {
                        if (result.extent) view.goTo(result.extent.expand(1.3)).catch(() => {});
                    });
                }
                loadStats();
            }).catch((error) => {
                console.warn("Filtre invalide", error);
                showQueryMessage("error", "Filtre invalide. Verifie le champ, l'operateur et la valeur.");
            });
        }

        function resetFilter() {
            if (batimentsLayer) {
                batimentsLayer.definitionExpression = "1=1";
            }
            const result = document.getElementById("queryResult");
            result.className = "";
            result.style.display = "none";
            result.textContent = "";
            loadStats();
        }

        function exportCSV() {
            if (!batimentsLayer || !batimentsLayer.createQuery || !batimentsLayer.queryFeatures) return;

            const fields = config.fields.batiments;
            const exportFields = [fields.id, fields.floors, fields.type, fields.nature, fields.state, fields.height, fields.area];
            const query = batimentsLayer.createQuery();
            query.where = batimentsLayer.definitionExpression || "1=1";
            query.outFields = exportFields;

            batimentsLayer.queryFeatures(query).then((result) => {
                const rows = result.features.map((feature) => exportFields.map((field) => {
                    const value = feature.attributes[field];
                    return value === null || value === undefined ? "" : `"${String(value).replace(/"/g, '""')}"`;
                }).join(";"));
                const csv = [exportFields.join(";"), ...rows].join("\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "batiments_export.csv";
                link.click();
                URL.revokeObjectURL(url);
            });
        }

        function startMeasure(mode) {
            clearMeasure();
            measureMode = mode;
            measurePoints = [];

            document.getElementById("btnMeasureDist").classList.toggle("active", mode === "distance");
            document.getElementById("btnMeasureArea").classList.toggle("active", mode === "area");
            document.getElementById("measureResult").style.display = "block";
            document.getElementById("measureResult").textContent =
                mode === "distance"
                    ? "Clique pour placer des points. Double-clic pour terminer."
                    : "Clique pour dessiner un polygone. Double-clic pour terminer.";

            view.surface.style.cursor = "crosshair";
            clickHandler = view.on("click", (event) => {
                measurePoints.push(event.mapPoint);
                drawMeasureGraphics();
            });
            dblClickHandler = view.on("double-click", (event) => {
                event.stopPropagation();
                measurePoints.push(event.mapPoint);
                computeMeasure();
                removeMeasureHandlers();
            });
        }

        function drawMeasureGraphics() {
            measureLayer.removeAll();
            measurePoints.forEach((point) => {
                measureLayer.add(new Graphic({
                    geometry: point,
                    symbol: {
                        type: "simple-marker",
                        color: "#0079c1",
                        size: "8px",
                        outline: { color: "#fff", width: 1 }
                    }
                }));
            });

            if (measurePoints.length >= 2) {
                measureLayer.add(new Graphic({
                    geometry: createPolyline(),
                    symbol: { type: "simple-line", color: "#0079c1", width: 2, style: "dash" }
                }));
            }
        }

        function computeMeasure() {
            if (measurePoints.length < 2) return;
            const result = document.getElementById("measureResult");

            if (measureMode === "distance") {
                const distance = geometryEngine.geodesicLength(createPolyline(), "meters");
                result.textContent = distance >= 1000
                    ? `${(distance / 1000).toFixed(3)} km`
                    : `${distance.toFixed(1)} m`;
                return;
            }

            if (measureMode === "area" && measurePoints.length >= 3) {
                const first = measurePoints[0];
                const ring = measurePoints.map((point) => [point.longitude, point.latitude]);
                ring.push([first.longitude, first.latitude]);
                const polygon = new Polygon({ rings: [ring], spatialReference: { wkid: 4326 } });
                const area = Math.abs(geometryEngine.geodesicArea(polygon, "square-meters"));
                result.textContent = area >= 10000
                    ? `${(area / 10000).toFixed(4)} ha`
                    : `${area.toFixed(1)} m2`;
                measureLayer.add(new Graphic({
                    geometry: polygon,
                    symbol: {
                        type: "simple-fill",
                        color: [0, 121, 193, 0.15],
                        outline: { color: "#0079c1", width: 2 }
                    }
                }));
            }
        }

        function createPolyline() {
            return new Polyline({
                paths: [measurePoints.map((point) => [point.longitude, point.latitude])],
                spatialReference: { wkid: 4326 }
            });
        }

        function clearMeasure() {
            measureMode = null;
            measurePoints = [];
            if (measureLayer) measureLayer.removeAll();
            removeMeasureHandlers();
            document.getElementById("btnMeasureDist").classList.remove("active");
            document.getElementById("btnMeasureArea").classList.remove("active");
            document.getElementById("measureResult").style.display = "none";
        }

        function removeMeasureHandlers() {
            if (clickHandler) {
                clickHandler.remove();
                clickHandler = null;
            }
            if (dblClickHandler) {
                dblClickHandler.remove();
                dblClickHandler = null;
            }
            if (view && view.surface) {
                view.surface.style.cursor = "default";
            }
        }

        function bindPanelEvents() {
            [
                ["hdrBasemap", "sectionBasemap", "btnBasemap"],
                ["hdrCouches", "sectionCouches", "btnCouches"],
                ["hdrStats", "sectionStats", "btnStats"],
                ["hdrQuery", "sectionQuery", "btnQuery"],
                ["hdrExport", "sectionExport", "btnExport"],
                ["hdrMesure", "sectionMesure", "btnMesure"],
                ["hdrLegende", "sectionLegende", "btnLegende"]
            ].forEach(([headerId, bodyId, buttonId]) => {
                document.getElementById(headerId).addEventListener("click", () => toggleSection(bodyId, buttonId));
            });

            document.getElementById("basemapSelect").addEventListener("change", (event) => {
                currentBasemapId = event.target.value;
                applyBasemap(currentBasemapId, currentLang);
            });
            document.getElementById("langSelect").addEventListener("change", (event) => {
                currentLang = event.target.value;
                applyBasemap(currentBasemapId, currentLang);
            });

            document.getElementById("toggleBatiments").addEventListener("change", (event) => {
                setLayerVisibility(batimentsLayer, event.target.checked, ".legend-batiment", "legendTitleBatiments");
            });
            document.getElementById("toggleEclairages").addEventListener("change", (event) => {
                setLayerVisibility(eclairagesLayer, event.target.checked, ".legend-eclairage", "legendTitleEclairages");
            });

            document.querySelectorAll(".query-tab").forEach((tab) => {
                tab.addEventListener("click", () => selectQueryTab(tab));
            });
            document.querySelectorAll(".preset-btn").forEach((button) => {
                button.addEventListener("click", () => applyFilter(button.dataset.where));
            });
            document.getElementById("btnResetPreset").addEventListener("click", resetFilter);
            document.getElementById("btnApplyFree").addEventListener("click", applyFreeFilter);
            document.getElementById("btnResetFree").addEventListener("click", () => {
                document.getElementById("queryValue").value = "";
                resetFilter();
            });

            document.getElementById("btnRefreshStats").addEventListener("click", loadStats);
            document.getElementById("btnExportCSV").addEventListener("click", exportCSV);
            document.getElementById("btnMeasureDist").addEventListener("click", () => startMeasure("distance"));
            document.getElementById("btnMeasureArea").addEventListener("click", () => startMeasure("area"));
            document.getElementById("btnClearMeasure").addEventListener("click", clearMeasure);
        }

        function toggleSection(bodyId, buttonId) {
            const body = document.getElementById(bodyId);
            const button = document.getElementById(buttonId);
            const isOpen = body.style.display !== "none";
            body.style.display = isOpen ? "none" : "block";
            button.textContent = isOpen ? "Afficher" : "Reduire";
        }

        function setLayerVisibility(layer, visible, legendSelector, titleId) {
            if (layer) layer.visible = visible;
            document.querySelectorAll(legendSelector).forEach((element) => {
                element.style.opacity = visible ? "1" : "0.3";
            });
            document.getElementById(titleId).style.opacity = visible ? "1" : "0.3";
        }

        function selectQueryTab(tab) {
            document.querySelectorAll(".query-tab").forEach((item) => item.classList.remove("active"));
            document.querySelectorAll(".query-panel").forEach((panel) => panel.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.panel).classList.add("active");
        }

        function applyFreeFilter() {
            const field = document.getElementById("queryField").value;
            const operator = document.getElementById("queryOperator").value;
            const rawValue = document.getElementById("queryValue").value.trim();

            if (!rawValue) {
                showQueryMessage("error", "Saisis une valeur.");
                return;
            }

            const textFields = [config.fields.batiments.type, config.fields.batiments.nature, config.fields.batiments.state];
            const value = textFields.includes(field)
                ? operator === "LIKE" ? `'%${escapeSqlLike(rawValue)}%'` : `'${escapeSqlText(rawValue)}'`
                : rawValue;

            applyFilter(`${field} ${operator} ${value}`);
        }

        function escapeSqlText(value) {
            return value.replace(/'/g, "''");
        }

        function escapeSqlLike(value) {
            return escapeSqlText(value).replace(/%/g, "\\%").replace(/_/g, "\\_");
        }

        function setupMobilePanel() {
            if (window.innerWidth > 768) return;

            const panel = document.getElementById("mainPanel");
            const handle = document.getElementById("panelHandle");
            [
                "sectionBasemap",
                "sectionCouches",
                "sectionStats",
                "sectionQuery",
                "sectionExport",
                "sectionMesure",
                "sectionLegende"
            ].forEach((id) => document.getElementById(id).style.display = "none");
            [
                "btnBasemap",
                "btnCouches",
                "btnStats",
                "btnQuery",
                "btnExport",
                "btnMesure",
                "btnLegende"
            ].forEach((id) => document.getElementById(id).textContent = "Afficher");

            handle.addEventListener("click", () => {
                panel.classList.toggle("open");
                document.getElementById("panelHandleLabel").textContent = panel.classList.contains("open") ? "Fermer" : "Panneau";
            });
        }

        function showQueryMessage(type, message) {
            const result = document.getElementById("queryResult");
            result.className = type;
            result.textContent = message;
        }

        function setText(id, value) {
            document.getElementById(id).textContent = value;
        }
    });
})();
