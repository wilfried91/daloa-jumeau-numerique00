const fs = require("fs");
const path = require("path");

const positions = [];
const normals = [];
const indices = [];
const materialIndices = [];

const materials = {
  dark: 0,
  light: 1
};

function addBox(cx, cy, cz, sx, sy, sz, material) {
  const start = positions.length / 3;
  const x0 = cx - sx / 2;
  const x1 = cx + sx / 2;
  const y0 = cy - sy / 2;
  const y1 = cy + sy / 2;
  const z0 = cz - sz / 2;
  const z1 = cz + sz / 2;

  const faces = [
    { n: [1, 0, 0], v: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] },
    { n: [-1, 0, 0], v: [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]] },
    { n: [0, 1, 0], v: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, -1, 0], v: [[x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1]] },
    { n: [0, 0, 1], v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, 0, -1], v: [[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]] }
  ];

  faces.forEach((face, faceIndex) => {
    const faceStart = start + faceIndex * 4;
    face.v.forEach((vertex) => {
      positions.push(vertex[0], vertex[1], vertex[2]);
      normals.push(face.n[0], face.n[1], face.n[2]);
    });
    indices.push(faceStart, faceStart + 1, faceStart + 2, faceStart, faceStart + 2, faceStart + 3);
    materialIndices.push(material);
  });
}

// glTF is Y-up. All dimensions are in meters. The model origin is at ground level.
addBox(0, 0.1, 0, 0.55, 0.2, 0.55, materials.dark);
addBox(0, 6.1, 0, 0.14, 12, 0.14, materials.dark);
addBox(0, 12.15, 0, 1.25, 0.26, 0.45, materials.light);
addBox(0, 12.36, 0, 1.35, 0.12, 0.55, materials.dark);

const buffers = [];
function pushFloat32(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  const offset = buffers.reduce((sum, item) => sum + item.length, 0);
  buffers.push(buffer);
  return { offset, length: buffer.length };
}

function pushUint16(values) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => buffer.writeUInt16LE(value, index * 2));
  const offset = buffers.reduce((sum, item) => sum + item.length, 0);
  buffers.push(buffer);
  return { offset, length: buffer.length };
}

const positionView = pushFloat32(positions);
const normalView = pushFloat32(normals);
const primitiveIndices = [];

let indexOffset = 0;
materialIndices.forEach((material) => {
  const faceIndices = indices.slice(indexOffset, indexOffset + 6);
  primitiveIndices.push({ material, view: pushUint16(faceIndices) });
  indexOffset += 6;
});

const bin = Buffer.concat(buffers);
const dataUri = `data:application/octet-stream;base64,${bin.toString("base64")}`;

const primitives = primitiveIndices.map((entry, index) => ({
  attributes: {
    POSITION: 0,
    NORMAL: 1
  },
  indices: index + 2,
  material: entry.material
}));

const gltf = {
  asset: { version: "2.0", generator: "Codex lampadaire generator" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives }],
  materials: [
    {
      name: "dark metal",
      pbrMetallicRoughness: {
        baseColorFactor: [0.05, 0.08, 0.11, 1],
        metallicFactor: 0.2,
        roughnessFactor: 0.45
      }
    },
    {
      name: "warm light panel",
      pbrMetallicRoughness: {
        baseColorFactor: [1, 0.78, 0.16, 1],
        metallicFactor: 0,
        roughnessFactor: 0.2
      },
      emissiveFactor: [1, 0.72, 0.12]
    }
  ],
  buffers: [{ uri: dataUri, byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: positionView.offset, byteLength: positionView.length, target: 34962 },
    { buffer: 0, byteOffset: normalView.offset, byteLength: normalView.length, target: 34962 },
    ...primitiveIndices.map((entry) => ({
      buffer: 0,
      byteOffset: entry.view.offset,
      byteLength: entry.view.length,
      target: 34963
    }))
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: [-0.675, 0, -0.275],
      max: [0.675, 12.42, 0.275]
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: normals.length / 3,
      type: "VEC3"
    },
    ...primitiveIndices.map((entry, index) => ({
      bufferView: index + 2,
      componentType: 5123,
      count: 6,
      type: "SCALAR"
    }))
  ]
};

const output = path.join(__dirname, "..", "models", "lampadaire.gltf");
fs.writeFileSync(output, JSON.stringify(gltf));
console.log(output);
