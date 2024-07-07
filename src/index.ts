import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { SkyMaterial } from "@babylonjs/materials/sky";

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
  const camera = new ArcRotateCamera("Camera", 0, 0, 5, Vector3.Zero(), scene);
  camera.attachControl(true);
  const light = new DirectionalLight("SunLight", new Vector3(0, -1, 0), scene);
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
  const skyBox = MeshBuilder.CreateBox("SkyBox", { size: 1000 }, scene);
  skyBox.infiniteDistance = true;
  skyBox.material = skyMaterial;

  const baseBox = MeshBuilder.CreateBox("BaseBox", {}, scene);
  baseBox.position.y = -0.5;

  for (let x = -64; x < 64; x++) {
    for (let z = -64; z < 64; z++) {
      const b = baseBox.createInstance(`BaseBox_${x}_${z}`);
      b.position.x = x;
      b.position.z = z;
    }
  }

  baseBox.setEnabled(false);

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
