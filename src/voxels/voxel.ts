import type { VoxelWorld } from "./voxelWorld";

export class Voxel {
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
