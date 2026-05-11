(function () {
    window.DaloaApp = window.DaloaApp || {};

    function createExtrude(color, height) {
        return {
            type: "polygon-3d",
            symbolLayers: [{
                type: "extrude",
                material: { color },
                size: height
            }]
        };
    }

    window.DaloaApp.renderers = {
        batiments3D: {
            type: "unique-value",
            field: "Etages",
            legendOptions: { title: "Nombre d'etages" },
            defaultSymbol: createExtrude([180, 180, 180, 0.7], 3),
            defaultLabel: "Non defini",
            uniqueValueInfos: [
                { value: 1, symbol: createExtrude("#1A9850", 3), label: "1 etage" },
                { value: 2, symbol: createExtrude("#91CF60", 6), label: "2 etages" },
                { value: 3, symbol: createExtrude("#FEE08B", 9), label: "3 etages" },
                { value: 4, symbol: createExtrude("#FC8D59", 12), label: "4 etages" },
                { value: 5, symbol: createExtrude("#8B0000", 15), label: "5 etages" }
            ]
        },
        eclairages3D: {
            type: "simple",
            symbol: {
                type: "point-3d",
                symbolLayers: [
                    {
                        type: "object",
                        resource: { primitive: "cylinder" },
                        material: { color: "#777777" },
                        width: 0.3,
                        height: 6,
                        anchor: "bottom"
                    },
                    {
                        type: "object",
                        resource: { primitive: "sphere" },
                        material: { color: [0, 180, 255, 0.95] },
                        width: 1.5,
                        height: 1.5,
                        anchor: "bottom",
                        anchorPosition: { x: 0, y: 0, z: 6 }
                    }
                ]
            }
        }
    };
})();
