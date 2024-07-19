import type { Voxel } from "./voxel";
import type { VoxelWorldChunk } from "./voxelWorldChunk";

export class VoxelWorld {
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

  public getVoxelByAbsolutePosition(x: number, y: number, z: number): Voxel | undefined {
    const TILE_SIZE = 0.5;
    return this.getVoxel(Math.ceil(x * TILE_SIZE), Math.ceil(y * TILE_SIZE), Math.ceil(z * TILE_SIZE));
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
