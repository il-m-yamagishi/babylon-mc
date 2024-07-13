import { noise2ImproveX } from "../../util/simplexNoise2S";
import type { Voxel } from "../voxel";

export function buildGround(
  seed: number,
  chunkX: number,
  chunkZ: number,
  voxelsPerChunk: number,
) {
  const voxels: Voxel[] = new Array(voxelsPerChunk * voxelsPerChunk);
  const seedBigInt = BigInt(seed);
  const height = 10;
  for (let x = 0; x < voxelsPerChunk; x++) {
    for (let z = 0; z < voxelsPerChunk; z++) {
      const worldX = x + chunkX * voxelsPerChunk;
      const worldZ = z + chunkZ * voxelsPerChunk;
      const uniformY = noise2ImproveX(seedBigInt, worldX, worldZ);
      const worldY = Math.floor(uniformY * height);
      voxels.push({
        x,
        y: worldY,
        z,
        surfaces: {
          yplus: {
            textureId: 0,
            uvRotation: Math.floor(Math.random() * 4),
          },
          yminus: {
            textureId: 1,
            uvRotation: Math.floor(Math.random() * 4),
          },
          xplus: {
            textureId: 1,
            uvRotation: Math.floor(Math.random() * 4),
          },
          xminus: {
            textureId: 1,
            uvRotation: Math.floor(Math.random() * 4),
          },
          zplus: {
            textureId: 1,
            uvRotation: Math.floor(Math.random() * 4),
          },
          zminus: {
            textureId: 1,
            uvRotation: Math.floor(Math.random() * 4),
          },
        },
      });
    }
  }

  return voxels;
}
