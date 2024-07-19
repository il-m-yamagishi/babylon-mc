import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Material } from "@babylonjs/core/Materials/material";
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

class VoxelWorld {
  public readonly baseSeed: bigint;
  public readonly chunkMap: Map<string, VoxelWorldChunk>;

  public constructor(baseSeed: bigint, chunkMap: Map<string, VoxelWorldChunk>) {
    this.baseSeed = baseSeed;
    this.chunkMap = chunkMap;
  }

  public getVoxel(worldX: number, worldY: number, worldZ: number): Voxel | undefined {
    const CHUNK_SIZE = 32;
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const chunk = this.chunkMap.get(`${chunkX},${chunkZ}`);
    if (!chunk) {
      return undefined;
    }
    return chunk.voxelMap.get(`${worldX},${worldY},${worldZ}`);
  }

  public getAllPresentVoxelListByChunk(chunkX: number, chunkZ: number): Voxel[] {
    const chunk = this.chunkMap.get(`${chunkX},${chunkZ}`);
    if (!chunk) {
      return [];
    }
    const voxelList: Voxel[] = [];
    for (const voxel of chunk.voxelMap.values()) {
      voxelList.push(voxel);
    }
    return voxelList;
  }
}

class VoxelWorldChunk {
  public readonly chunkX: number;
  public readonly chunkZ: number;
  public readonly voxelMap: Map<string, Voxel>;

  public constructor(chunkX: number, chunkZ: number, voxelMap: Map<string, Voxel>) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.voxelMap = voxelMap;
  }

  public getId(): string {
    return `${this.chunkX},${this.chunkZ}`;
  }
}

class Voxel {
  public readonly worldX: number;
  public readonly worldY: number;
  public readonly worldZ: number;
  private voxelType: number;

  public constructor(worldX: number, worldY: number, worldZ: number, voxelType: number) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.worldZ = worldZ;
    this.voxelType = voxelType;
  }

  public getVoxelType(): number {
    return this.voxelType;
  }

  public getId(): string {
    return `${this.worldX},${this.worldY},${this.worldZ}`;
  }

  /**
   * [Top, Bottom, Left, Right, Front, Back]
   */
  public getNeighbors(voxelWorld: VoxelWorld): Array<Voxel | undefined> {
    return [
      voxelWorld.getVoxel(this.worldX, this.worldY + 1, this.worldZ),
      voxelWorld.getVoxel(this.worldX, this.worldY - 1, this.worldZ),
      voxelWorld.getVoxel(this.worldX - 1, this.worldY, this.worldZ),
      voxelWorld.getVoxel(this.worldX + 1, this.worldY, this.worldZ),
      voxelWorld.getVoxel(this.worldX, this.worldY, this.worldZ - 1),
      voxelWorld.getVoxel(this.worldX, this.worldY, this.worldZ + 1),
    ];
  }
}

async function main() {
  const canvas = document.getElementById("render-canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas not found");
  }

  const engine = new Engine(canvas, true, {}, true);
  const scene = new Scene(engine);
  // scene.fogMode = Scene.FOGMODE_EXP2;
  // scene.fogDensity = 0.015;
  // scene.gravity = new Vector3(0, -0.871, 0);

  const light = new DirectionalLight("SunLight", new Vector3(0, -0.67, 0.34), scene);
  light.intensity = 1;

  const camera = createCamera(scene);
  createRenderingPipelines(scene);
  createSky(scene);
  const voxelWorld = new VoxelWorld(0n, new Map());
  const voxelMaterial = createVoxelMaterial(scene);
  // biome-ignore lint/suspicious/useAwait: <explanation>
  const update = async () => {
    updateVoxelWorldChunks(scene, voxelMaterial, voxelWorld, camera.globalPosition.x, camera.globalPosition.z);
  };
  scene.onBeforeRenderObservable.add(update);

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

function createCamera(scene: Scene) {
  const camera = new UniversalCamera("Camera", new Vector3(0, 2, 0), scene);
  camera.attachControl(true);
  camera.maxZ = 1024;
  camera.keysLeft = ["A".charCodeAt(0)];
  camera.keysRight = ["D".charCodeAt(0)];
  camera.keysUp = ["W".charCodeAt(0)];
  camera.keysDown = ["S".charCodeAt(0)];
  camera.speed = 0.5;
  scene.onBeforeRenderObservable.add(() => {
    if (camera.position.y < -10) {
      // Reset camera position
      camera.position = new Vector3(0, 2, 0);
    }
  });
  return camera;
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

async function updateVoxelWorldChunks(
  scene: Scene,
  material: Material,
  voxelWorld: VoxelWorld,
  cameraX: number,
  cameraZ: number,
) {
  // Around 4x4 chunks will be loaded
  const CHUNK_RADIUS = 4;
  const TILE_SIZE = 0.5;
  const CHUNK_SIZE = 32 * TILE_SIZE;

  const minChunkX = Math.floor((cameraX - CHUNK_SIZE * CHUNK_RADIUS) / CHUNK_SIZE);
  const maxChunkX = Math.floor((cameraX + CHUNK_SIZE * CHUNK_RADIUS) / CHUNK_SIZE);
  const minChunkZ = Math.floor((cameraZ - CHUNK_SIZE * CHUNK_RADIUS) / CHUNK_SIZE);
  const maxChunkZ = Math.floor((cameraZ + CHUNK_SIZE * CHUNK_RADIUS) / CHUNK_SIZE);

  const promises = [];

  // dispose out of range meshes
  for (const chunk of voxelWorld.chunkMap.values()) {
    promises.push(
      new Promise<void>((resolve) => {
        if (
          chunk.chunkX < minChunkX ||
          chunk.chunkX > maxChunkX ||
          chunk.chunkZ < minChunkZ ||
          chunk.chunkZ > maxChunkZ
        ) {
          const mesh = scene.getMeshByName(`CHUNK_${chunk.chunkX},${chunk.chunkZ}`);
          if (mesh) {
            mesh.dispose();
          }
        }
        resolve();
      }),
    );
  }

  // create within meshes
  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      promises.push(
        new Promise<void>((resolve) => {
          if (!voxelWorld.chunkMap.has(`${chunkX},${chunkZ}`)) {
            // Create chunk data
            const chunk = createChunk(chunkX, chunkZ, voxelWorld.baseSeed);
            voxelWorld.chunkMap.set(chunk.getId(), chunk);
          }
          if (!scene.getMeshByName(`CHUNK_${chunkX},${chunkZ}`)) {
            // Create mesh
            const mesh = createMeshByChunk(scene, voxelWorld, chunkX, chunkZ);
            mesh.material = material;
          }
          resolve();
        }),
      );
    }
  }

  return Promise.all(promises);
}

function createChunk(chunkX: number, chunkZ: number, seed: bigint) {
  const CHUNK_SIZE = 32;
  const voxelMap = new Map<string, Voxel>();

  for (let localX = 0; localX < CHUNK_SIZE; localX++) {
    for (let localZ = 0; localZ < CHUNK_SIZE; localZ++) {
      const worldX = localX + chunkX * CHUNK_SIZE;
      const worldZ = localZ + chunkZ * CHUNK_SIZE;

      // create surface
      const surface = createSurface(worldX, worldZ, seed);
      voxelMap.set(surface.getId(), surface);

      // create ground
      for (let worldY = surface.worldY - 1; worldY >= -1; worldY--) {
        const VOXEL_TYPE_BARK = 1;
        const voxel = new Voxel(worldX, worldY, worldZ, VOXEL_TYPE_BARK);
        voxelMap.set(voxel.getId(), voxel);
      }
    }
  }

  return new VoxelWorldChunk(chunkX, chunkZ, voxelMap);
}

function createSurface(worldX: number, worldZ: number, seed: bigint) {
  const MAX_HEIGHT = 10;
  const WAVE = 128;
  const worldY = Math.floor(noise2ImproveX(seed, worldX / WAVE, worldZ / WAVE) * MAX_HEIGHT);
  const VOXEL_TYPE_GRASS = 0;
  return new Voxel(worldX, worldY, worldZ, VOXEL_TYPE_GRASS);
}

function createVoxelMaterial(scene: Scene) {
  const material = new StandardMaterial("VoxelMaterial", scene);
  material.useLogarithmicDepth = true;
  material.diffuseTexture = new Texture(McTexture, scene, {
    noMipmap: false,
    samplingMode: Texture.TRILINEAR_SAMPLINGMODE,
  });
  material.bumpTexture = new Texture(McNormalTexture, scene, {
    noMipmap: false,
    samplingMode: Texture.TRILINEAR_SAMPLINGMODE,
  });
  material.specularColor = new Color3(0, 0, 0);
  material.freeze();
  return material;
}

function createMeshByChunk(scene: Scene, voxelWorld: VoxelWorld, chunkX: number, chunkZ: number) {
  const voxelList = voxelWorld.getAllPresentVoxelListByChunk(chunkX, chunkZ);
  const mesh = new Mesh(`CHUNK_${chunkX},${chunkZ}`, scene);
  const rawVertexData = createVertexDataFromVoxelList(voxelList, voxelWorld);
  const vertexData = new VertexData();
  vertexData.positions = rawVertexData.positions;
  vertexData.indices = rawVertexData.indices;
  vertexData.normals = rawVertexData.normals;
  vertexData.uvs = rawVertexData.uvs;
  const updatable = false; // TODO
  vertexData.applyToMesh(mesh, updatable);
  mesh.freezeNormals();
  mesh.freezeWorldMatrix();
  return mesh;
}

function createVertexDataFromVoxelList(voxelList: Voxel[], voxelWorld: VoxelWorld) {
  const VOXEL_SIZE = 0.5;
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  let indexBase = 0;

  for (const voxel of voxelList) {
    const rng = xoroshiro128plus(Number(voxelWorld.baseSeed) + voxel.worldX + voxel.worldY + voxel.worldZ);
    // biome-ignore format: <explanation>
    const vertices = [
      [voxel.worldX * VOXEL_SIZE,              voxel.worldY * VOXEL_SIZE,              voxel.worldZ * VOXEL_SIZE],
      [voxel.worldX * VOXEL_SIZE + VOXEL_SIZE, voxel.worldY * VOXEL_SIZE,              voxel.worldZ * VOXEL_SIZE + VOXEL_SIZE],
      [voxel.worldX * VOXEL_SIZE,              voxel.worldY * VOXEL_SIZE,              voxel.worldZ * VOXEL_SIZE + VOXEL_SIZE],
      [voxel.worldX * VOXEL_SIZE + VOXEL_SIZE, voxel.worldY * VOXEL_SIZE,              voxel.worldZ * VOXEL_SIZE],
      [voxel.worldX * VOXEL_SIZE + VOXEL_SIZE, voxel.worldY * VOXEL_SIZE - VOXEL_SIZE, voxel.worldZ * VOXEL_SIZE],
      [voxel.worldX * VOXEL_SIZE,              voxel.worldY * VOXEL_SIZE - VOXEL_SIZE, voxel.worldZ * VOXEL_SIZE + VOXEL_SIZE],
      [voxel.worldX * VOXEL_SIZE + VOXEL_SIZE, voxel.worldY * VOXEL_SIZE - VOXEL_SIZE, voxel.worldZ * VOXEL_SIZE + VOXEL_SIZE],
      [voxel.worldX * VOXEL_SIZE,              voxel.worldY * VOXEL_SIZE - VOXEL_SIZE, voxel.worldZ * VOXEL_SIZE],
    ];
    // biome-ignore format: <explanation>
    const vertexNormals = [
      [ 0,  1,  0],
      [ 0, -1,  0],
      [-1,  0,  0],
      [ 1,  0,  0],
      [ 0,  0, -1],
      [ 0,  0,  1],
    ];
    const neighbors = voxel.getNeighbors(voxelWorld);
    if (!neighbors[0]) {
      // Render top
      positions.push(...vertices[0], ...vertices[1], ...vertices[2], ...vertices[3]);
      indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
      indexBase += 4;
      normals.push(...vertexNormals[0], ...vertexNormals[0], ...vertexNormals[0], ...vertexNormals[0]);
      uvs.push(...generateUV(voxel.getVoxelType(), rng));
    }
    if (!neighbors[1]) {
      // Render bottom
      positions.push(...vertices[4], ...vertices[5], ...vertices[6], ...vertices[7]);
      indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
      indexBase += 4;
      normals.push(...vertexNormals[1], ...vertexNormals[1], ...vertexNormals[1], ...vertexNormals[1]);
      uvs.push(...generateUV(voxel.getVoxelType(), rng));
    }
    if (!neighbors[2]) {
      // Render left
      positions.push(...vertices[2], ...vertices[7], ...vertices[0], ...vertices[5]);
      indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
      indexBase += 4;
      normals.push(...vertexNormals[2], ...vertexNormals[2], ...vertexNormals[2], ...vertexNormals[2]);
      uvs.push(...generateUV(voxel.getVoxelType(), rng));
    }
    if (!neighbors[3]) {
      // Render right
      positions.push(...vertices[3], ...vertices[6], ...vertices[1], ...vertices[4]);
      indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
      indexBase += 4;
      normals.push(...vertexNormals[3], ...vertexNormals[3], ...vertexNormals[3], ...vertexNormals[3]);
      uvs.push(...generateUV(voxel.getVoxelType(), rng));
    }
    if (!neighbors[4]) {
      // Render front
      positions.push(...vertices[0], ...vertices[4], ...vertices[3], ...vertices[7]);
      indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
      indexBase += 4;
      normals.push(...vertexNormals[4], ...vertexNormals[4], ...vertexNormals[4], ...vertexNormals[4]);
      uvs.push(...generateUV(voxel.getVoxelType(), rng));
    }
    if (!neighbors[5]) {
      // Render back
      positions.push(...vertices[1], ...vertices[5], ...vertices[2], ...vertices[6]);
      indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
      indexBase += 4;
      normals.push(...vertexNormals[5], ...vertexNormals[5], ...vertexNormals[5], ...vertexNormals[5]);
      uvs.push(...generateUV(voxel.getVoxelType(), rng));
    }
  }

  return {
    positions,
    indices,
    normals,
    uvs,
  };
}

function generateUV(textureId: number, rng: RandomGenerator): number[] {
  return generateUV2(textureId, unsafeUniformIntDistribution(0, 3, rng));
}

function generateUV2(textureId: number, rotation: number): number[] {
  const textureSize = 16;
  const jitter = 1 / 1024;
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
