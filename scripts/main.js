import * as THREE from 'three';
import { createWorld } from './world.js';
import { setupPointerLock } from './controls.js';
import { connectServer, sendMove, sendChat, otherPlayers, myId, myName, addKillLog } from './client.js';

// -------------------------
// シーン・カメラ・レンダラー
// -------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(8,16,8);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// -------------------------
// ライト
// -------------------------
const ambientLight = new THREE.AmbientLight(0xffffff,0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff,0.8);
dirLight.position.set(50,100,50);
dirLight.castShadow = true;
scene.add(dirLight);

// -------------------------
// Voxelワールド生成
// -------------------------
const world = createWorld();
scene.add(world.mesh);

// -------------------------
// プレイヤー移動＋衝突
// -------------------------
const controls = setupPointerLock(renderer.domElement, camera, world.collider);

// -------------------------
// 他プレイヤー用メッシュ（赤立方体）
// -------------------------
const otherGeo = new THREE.BoxGeometry(1,2,1);
const otherMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
const otherMeshes = new Map();

// -------------------------
// WebSocket接続
// -------------------------
connectServer("ws://localhost:8080");

// -------------------------
// チャットUI
// -------------------------
const chatInput = document.getElementById("chatInput");
chatInput.addEventListener("keydown", e=>{
    if(e.key==="Enter"){
        sendChat(e.target.value);
        e.target.value="";
    }
});

// -------------------------
// アニメーションループ
// -------------------------
function animate(){
    requestAnimationFrame(animate);

    // プレイヤー位置送信
    const pos = camera.position;
    sendMove(pos.x,pos.y,pos.z);

    // 他プレイヤー描画
    otherPlayers.forEach((p,id)=>{
        let mesh = otherMeshes.get(id);
        if(!mesh){
            mesh = new THREE.Mesh(otherGeo, otherMat);
            scene.add(mesh);
            otherMeshes.set(id, mesh);
        }
        if(p.x!==undefined) mesh.position.set(p.x,p.y,p.z);
    });

    renderer.render(scene, camera);
}

animate();

// -------------------------
// ウィンドウリサイズ対応
// -------------------------
window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
