/**
 * A voxel is a single unit of a 3D world.
 */
export interface Voxel {
  readonly textureId: number;
}

interface VertexData {
  readonly positions: number[];
  readonly indices: number[];
  readonly normals: number[];
  readonly uvs: number[];
}

/**
 * A world is a collection of voxels.
 */
export interface World {
  putVoxel(x: number, y: number, z: number, voxel: Voxel): void;
  getVoxel(x: number, y: number, z: number): Voxel | undefined;
  build(): Promise<VertexData>;
}

export class SuperFlatWorld implements World {
  private readonly voxelMap: Map<string, Voxel> = new Map();
  public putVoxel(x: number, y: number, z: number, voxel: Voxel): void {
    this.voxelMap.set(`${x},${y},${z}`, voxel);
  }
  public getVoxel(x: number, y: number, z: number): Voxel | undefined {
    if (this.voxelMap.has(`${x},${y},${z}`)) {
      return this.voxelMap.get(`${x},${y},${z}`);
    }
    if (y === -1) {
      // get default
      return {
        textureId: 0,
      };
    }
    return undefined;
  }
  public async build(): Promise<VertexData> {
    return new Promise((resolve) => {
      const vertexData: VertexData = {
        positions: [],
        indices: [],
        normals: [],
        uvs: [],
      };
      const TILE_SIZE = 0.5;
      const offset = -32;
      const y = -1;
      let indexBase = 0;

      for (let x = 0; x < -offset * 2; x++) {
        for (let z = 0; z < -offset * 2; z++) {
          const voxel = this.getVoxel(x + offset, y, z + offset);
          if (!voxel) {
            continue;
          }
          const v0 = [x * TILE_SIZE + offset, 0, z * TILE_SIZE + offset];
          const v1 = [x * TILE_SIZE + TILE_SIZE + offset, 0, z * TILE_SIZE + TILE_SIZE + offset];
          const v2 = [x * TILE_SIZE + offset, 0, z * TILE_SIZE + TILE_SIZE + offset];
          const v3 = [x * TILE_SIZE + TILE_SIZE + offset, 0, z * TILE_SIZE + offset];
          vertexData.positions.push(...v0, ...v1, ...v2, ...v3);
          vertexData.indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 3, indexBase + 1);
          indexBase += 4;
          vertexData.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
          vertexData.uvs.push(...generateUVs(voxel.textureId, Math.floor(Math.random() * 4)));
        }
      }
      resolve(vertexData);
    });
  }
}

/**
 * Builds a super flat world.
 */
export function buildSuperFlatWorld(): World {
  return new SuperFlatWorld();
}

function generateUVs(textureId: number, rotation: number): number[] {
  const textureSize = 16;
  const jitter = 1 / 256;
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
