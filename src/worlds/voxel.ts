export interface VoxelSurface {
  /** 0-255 */
  textureId: number;
  /** 0-3 */
  uvRotation: number;
}

export interface VoxelSurfaces {
  /** Y+(TOP) */
  yplus: VoxelSurface;
  /** Y-(BOTTOM) */
  yminus: VoxelSurface;
  /** X+(RIGHT) */
  xplus: VoxelSurface;
  /** X-(LEFT) */
  xminus: VoxelSurface;
  /** Z+(BACK) */
  zplus: VoxelSurface;
  /** Z-(FRONT) */
  zminus: VoxelSurface;
}

export interface Voxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly surfaces: VoxelSurfaces;
}
