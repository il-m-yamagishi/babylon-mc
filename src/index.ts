import { DefaultRenderingPipeline } from "@babylonjs/core";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { SkyMaterial } from "@babylonjs/materials/sky";
import {
  type RandomGenerator,
  unsafeUniformIntDistribution,
  xoroshiro128plus,
} from "pure-rand";
import McNormalTexture from "./assets/babylon-mc-normal.png";
import McTexture from "./assets/babylon-mc-texture.png";

async function main() {
  const canvas = document.getElementById(
    "render-canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas not found");
  }

  const engine = new Engine(
    canvas,
    true,
    {
      adaptToDeviceRatio: true,
      alpha: false,
      antialias: true,
      audioEngine: true,
      xrCompatible: false,
    },
    true,
  );
  const scene = new Scene(engine, {
    useClonedMeshMap: true,
    useGeometryUniqueIdsMap: true,
    useMaterialMeshMap: true,
  });
  const camera = new ArcRotateCamera("Camera", 0, 1, 5, Vector3.Up(), scene);
  camera.attachControl(true);
  const light = new DirectionalLight(
    "SunLight",
    new Vector3(0, -0.67, 0.34),
    scene,
  );
  light.intensity = 1;
  const skyMaterial = new SkyMaterial("SkyMaterial", scene);
  skyMaterial.backFaceCulling = false;
  skyMaterial.azimuth = 0.5;
  skyMaterial.inclination = 0.0;
  skyMaterial.luminance = 0.999999;
  skyMaterial.mieCoefficient = 0.056;
  skyMaterial.mieDirectionalG = 0.95;
  skyMaterial.rayleigh = 6;
  skyMaterial.turbidity = 22;
  skyMaterial.fogEnabled = false;
  const skyBox = MeshBuilder.CreateBox("SkyBox", { size: 1000 }, scene);
  skyBox.infiniteDistance = true;
  skyBox.material = skyMaterial;

  const mesh = new Mesh("Top", scene);
  const rng = xoroshiro128plus(100);
  const vertexData = createFacetVertexData(rng);
  vertexData.applyToMesh(mesh);
  const mat = new StandardMaterial("mat", scene);
  mat.diffuseTexture = new Texture(McTexture, scene, {
    samplingMode: Texture.TRILINEAR_SAMPLINGMODE,
  });
  mat.bumpTexture = new Texture(McNormalTexture, scene, {
    samplingMode: Texture.TRILINEAR_SAMPLINGMODE,
  });
  mat.specularColor = new Color3(0, 0, 0);
  mesh.material = mat;
  mesh.applyFog = true;

  const pipeline = new DefaultRenderingPipeline("pipeline", true, scene, [
    camera,
  ]);
  if (pipeline.isSupported) {
    pipeline.bloomEnabled = true;
    // pipeline.chromaticAberrationEnabled = true;
    // pipeline.depthOfFieldEnabled = true;
    pipeline.fxaaEnabled = true;
    pipeline.glowLayerEnabled = true;
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 5;
    pipeline.sharpenEnabled = true;
  }
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.05;

  function render() {
    scene.render();
  }
  function resize() {
    engine.resize();
  }
  window.addEventListener("resize", resize);
  engine.runRenderLoop(render);
}

main();

function createFacetVertexData(rng: RandomGenerator) {
  const size = 0.5;
  const tile = 128;
  const offset = size * tile * 0.5;
  const textureSize = 16;
  const jitter = 1 / 256;
  const vertexData = new VertexData();
  const positions = [];
  const indices = [];
  const normals = [];
  const uvs = [];

  for (let x = 0; x < tile; x++) {
    for (let z = 0; z < tile; z++) {
      const textureId = unsafeUniformIntDistribution(0, 1, rng);
      positions.push(
        x * size - offset,
        0,
        z * size - offset,
        x * size + size - offset,
        0,
        z * size + size - offset,
        x * size - offset,
        0,
        z * size + size - offset,
        x * size + size - offset,
        0,
        z * size - offset,
      );
      const indexBase = x * tile * 4 + z * 4;
      indices.push(
        indexBase,
        indexBase + 1,
        indexBase + 2,
        indexBase,
        indexBase + 3,
        indexBase + 1,
      );
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      const u0 = 0 + (textureId % textureSize) / textureSize + jitter;
      const u1 = 0 + (1 + (textureId % textureSize)) / textureSize - jitter;
      const v0 = 1 - Math.floor(textureId / textureSize) / textureSize - jitter;
      const v1 =
        1 - Math.floor(1 + textureId / textureSize) / textureSize + jitter;
      const randomUv = unsafeUniformIntDistribution(0, 3, rng);
      switch (randomUv) {
        case 0: {
          uvs.push(u0, v0, u1, v1, u1, v0, u0, v1);
          break;
        }
        case 1: {
          uvs.push(u1, v1, u1, v0, u0, v1, u0, v0);
          break;
        }
        case 2: {
          uvs.push(u1, v0, u0, v1, u0, v0, u1, v1);
          break;
        }
        case 3: {
          uvs.push(u0, v1, u0, v0, u1, v1, u1, v0);
          break;
        }
      }
    }
  }

  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;

  return vertexData;
}
