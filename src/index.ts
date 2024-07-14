import { UniversalCamera } from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import "@babylonjs/core/Loading/loadingScreen";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import "@babylonjs/core/Rendering/geometryBufferRendererSceneComponent";
import "@babylonjs/core/Rendering/prePassRendererSceneComponent";
import { Scene } from "@babylonjs/core/scene";
import { SkyMaterial } from "@babylonjs/materials/sky";
import { type RandomGenerator, unsafeUniformIntDistribution, xoroshiro128plus } from "pure-rand";
import McNormalTexture from "./assets/babylon-mc-normal.png";
import McTexture from "./assets/babylon-mc-texture.png";
import { noise2ImproveX } from "./util/simplexNoise2S";

async function main() {
  const canvas = document.getElementById("render-canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas not found");
  }

  const engine = new Engine(canvas, true, {}, true);
  engine.displayLoadingUI();
  const scene = new Scene(engine);
  // scene.fogMode = Scene.FOGMODE_EXP2;
  // scene.fogDensity = 0.015;
  // scene.gravity = new Vector3(0, -0.871, 0);

  const light = new DirectionalLight("SunLight", new Vector3(0, -0.67, 0.34), scene);
  light.intensity = 1;

  createCamera(scene);
  createRenderingPipelines(scene);
  createSky(scene);
  await createVoxelWorld(scene);

  function render() {
    scene.render();
  }
  function resize() {
    engine.resize();
  }
  window.addEventListener("resize", resize);
  engine.runRenderLoop(render);
  engine.hideLoadingUI();
}

main();

function createCamera(scene: Scene): void {
  const camera = new UniversalCamera("Camera", new Vector3(0, 2, 0), scene);
  camera.attachControl(true);
  camera.maxZ = 1024;
  camera.keysLeft = ["A".charCodeAt(0)];
  camera.keysRight = ["D".charCodeAt(0)];
  camera.keysUp = ["W".charCodeAt(0)];
  camera.keysDown = ["S".charCodeAt(0)];
  camera.speed = 0.2;
  scene.onBeforeRenderObservable.add(() => {
    if (camera.position.y < -10) {
      // Reset camera position
      camera.position = new Vector3(0, 2, 0);
    }
  });
}

function createRenderingPipelines(scene: Scene): void {
  const pipeline = new DefaultRenderingPipeline("pipeline", true, scene, scene.cameras);
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
  const ssaoRatio = 0.85;
  const ssaoPipeline = new SSAO2RenderingPipeline("ssao2Pipeline", scene, ssaoRatio, scene.cameras);
  ssaoPipeline.maxZ = 1024;
}

function createSky(scene: Scene) {
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
}

function createVoxelWorld(scene: Scene) {
  const mesh = new Mesh("Voxel", scene);
  createFacetVertexData(0).applyToMesh(mesh);
  const mat = new StandardMaterial("mat", scene);
  mat.useLogarithmicDepth = true;
  mat.diffuseTexture = new Texture(McTexture, scene, {
    noMipmap: false,
    samplingMode: Texture.TRILINEAR_SAMPLINGMODE,
  });
  mat.bumpTexture = new Texture(McNormalTexture, scene, {
    noMipmap: false,
    samplingMode: Texture.TRILINEAR_SAMPLINGMODE,
  });
  mat.specularColor = new Color3(0, 0, 0);
  mesh.material = mat;
}

function createFacetVertexData(seed: number) {
  const rng = xoroshiro128plus(seed);
  const seedBigInt = BigInt(seed);
  const size = 0.5;
  const tileSize = 512;
  const height = 10;
  const offset = size * tileSize * 0.5;
  const vertexData = new VertexData();
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  let indexBase = 0;

  for (let x = 0; x < tileSize; x++) {
    for (let z = 0; z < tileSize; z++) {
      const textureId = unsafeUniformIntDistribution(0, 1, rng);
      const y = Math.floor(noise2ImproveX(seedBigInt, x / tileSize, z / tileSize) * height);
      positions.push(
        x * size - offset,
        y * size,
        z * size - offset,
        x * size + size - offset,
        y * size,
        z * size + size - offset,
        x * size - offset,
        y * size,
        z * size + size - offset,
        x * size + size - offset,
        y * size,
        z * size - offset,
      );
      indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
      indexBase += 4;
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      uvs.push(...generateUV(textureId, rng));
      const XPlusY = Math.floor(noise2ImproveX(seedBigInt, (x + 1) / tileSize, z / tileSize) * height);
      if (XPlusY < y) {
        // render X+
        positions.push(
          x * size + size - offset,
          y * size - size,
          z * size - offset,
          x * size + size - offset,
          y * size,
          z * size + size - offset,
          x * size + size - offset,
          y * size,
          z * size - offset,
          x * size + size - offset,
          y * size - size,
          z * size + size - offset,
        );
        indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
        indexBase += 4;
        normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
        uvs.push(...generateUV(textureId, rng));
      }
      const XMinusY = Math.floor(noise2ImproveX(seedBigInt, (x - 1) / tileSize, z / tileSize) * height);
      if (XMinusY < y) {
        // render X-
        positions.push(
          x * size - offset,
          y * size,
          z * size - offset,
          x * size - offset,
          y * size - size,
          z * size + size - offset,
          x * size - offset,
          y * size - size,
          z * size - offset,
          x * size - offset,
          y * size,
          z * size + size - offset,
        );
        indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
        indexBase += 4;
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
        uvs.push(...generateUV(textureId, rng));
      }
      const ZPlusY = Math.floor(noise2ImproveX(seedBigInt, x / tileSize, (z + 1) / tileSize) * height);
      if (ZPlusY < y) {
        // render Z+
        positions.push(
          x * size - offset,
          y * size - size,
          z * size + size - offset,
          x * size + size - offset,
          y * size,
          z * size + size - offset,
          x * size + size - offset,
          y * size - size,
          z * size + size - offset,
          x * size - offset,
          y * size,
          z * size + size - offset,
        );
        indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
        indexBase += 4;
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
        uvs.push(...generateUV(textureId, rng));
      }
      const ZMinusY = Math.floor(noise2ImproveX(seedBigInt, x / tileSize, (z - 1) / tileSize) * height);
      if (ZMinusY < y) {
        // render Z-
        positions.push(
          x * size - offset,
          y * size,
          z * size - offset,
          x * size + size - offset,
          y * size - size,
          z * size - offset,
          x * size + size - offset,
          y * size,
          z * size - offset,
          x * size - offset,
          y * size - size,
          z * size - offset,
        );
        indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
        indexBase += 4;
        normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
        uvs.push(...generateUV(textureId, rng));
      }
    }
  }

  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;

  return vertexData;
}

function generateUV(textureId: number, rng: RandomGenerator): number[] {
  return generateUV2(textureId, unsafeUniformIntDistribution(0, 3, rng));
}

function generateUV2(textureId: number, rotation: number): number[] {
  const textureSize = 16;
  const jitter = 0 / 16;
  const u0 = 0 + (textureId % textureSize) / textureSize + jitter;
  const u1 = 0 + (1 + (textureId % textureSize)) / textureSize - jitter;
  const v0 = 1 - Math.floor(textureId / textureSize) / textureSize - jitter;
  const v1 = 1 - Math.floor(1 + textureId / textureSize) / textureSize + jitter;
  switch (rotation) {
    case 0: {
      return [u0, v0, u1, v1, u1, v0, u0, v1];
    }
    case 1: {
      return [u1, v1, u1, v0, u0, v1, u0, v0];
    }
    case 2: {
      return [u1, v0, u0, v1, u0, v0, u1, v1];
    }
    case 3: {
      return [u0, v1, u0, v0, u1, v1, u1, v0];
    }
    default: {
      throw new Error("Invalid randomUv value");
    }
  }
}
