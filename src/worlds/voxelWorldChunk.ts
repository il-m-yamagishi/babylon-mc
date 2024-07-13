export const VOXELS_PER_CHUNK = 256;

export class VoxelWorldChunk {
  public readonly x: number;
  public readonly z: number;

  public constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
  }
}
