import type { Voxel } from "./voxel";

export class VoxelWorldChunk {
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
