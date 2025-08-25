import * as THREE from 'three';

// シンプルAABB衝突用データを返しつつ、描画はInstancedMeshでまとめる
export function createWorld() {
  const sizeX = 128, sizeZ = 128;
  const heightBase = 8;

  const boxes = []; // {x,y,z}（実ブロック座標）
  for (let x = 0; x < sizeX; x++) {
    for (let z = 0; z < sizeZ; z++) {
      const hill = Math.floor(
        2 * Math.sin(x * 0.3) + 2 * Math.cos(z * 0.25)
      );
      const h = Math.max(1, heightBase + hill);
      for (let y = 0; y < h; y++) boxes.push({ x, y, z });
    }
  }

  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshLambertMaterial({ color: 0x55aa55 });
  const mesh = new THREE.InstancedMesh(geo, mat, boxes.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const m = new THREE.Matrix4();
  boxes.forEach((b, i) => {
    m.makeTranslation(b.x, b.y, b.z);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false; mesh.receiveShadow = true;

const otherPlayerMeshes = {};

function updateOtherPlayers(scene) {
  for (const id in players) {
    let p = players[id];
    if (!otherPlayerMeshes[id]) {
      const geom = new THREE.BoxGeometry(1, 2, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      otherPlayerMeshes[id] = new THREE.Mesh(geom, mat);
      scene.add(otherPlayerMeshes[id]);
    }
    otherPlayerMeshes[id].position.set(p.x, p.y, p.z);
    otherPlayerMeshes[id].rotation.y = p.rotY;
  }
}

  // 簡易コライダ（占有セルをSetで保持）
  const solid = new Set(boxes.map(b => `${b.x},${b.y},${b.z}`));

  return { mesh, collider: { solid } };
}
