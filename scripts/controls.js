import * as THREE from 'three';

export function setupPlayer(playerName, camera) {
  const player = { name: playerName, health: 100, alive: true, weapon: 'AR', respawnTimer: 0 };
  const healthBar = document.getElementById('healthBar');
  const weaponSelect = document.getElementById('weaponSelect');
  const killLogContainer = document.getElementById('killLog');

  weaponSelect.addEventListener('change', e => player.weapon = e.target.value);

  function updateHealthUI() {
    healthBar.style.width = player.health + '%';
    healthBar.style.background = player.health > 50 ? '#0f0' : (player.health > 20 ? '#ff0' : '#f00');
  }

  function addKillLog(text) {
    const log = document.createElement('div');
    log.innerHTML = text.replace(player.name, `<span style="color:green">${player.name}</span>`);
    killLogContainer.appendChild(log);
    setTimeout(()=>killLogContainer.removeChild(log), 5000);
  }

  function takeDamage(amount, killerName, weaponName) {
    if (!player.alive) return;
    player.health -= amount;
    if (player.health <= 0) {
      player.health = 0;
      player.alive = false;
      addKillLog(`${killerName} killed ${player.name} with ${weaponName}`);
      player.respawnTimer = 5;
    }
    updateHealthUI();
  }

  function respawn(allPlayers, camera) {
    player.health = 100;
    player.alive = true;
    updateHealthUI();

    let safePos;
    const maxTry = 100;
    let tries = 0;
    while (tries < maxTry) {
      const x = Math.random() * 16;
      const z = Math.random() * 16;
      const y = 16;
      const candidate = new THREE.Vector3(x, y, z);
      const tooClose = allPlayers.some(p => p !== playerObj && p.player.alive && candidate.distanceTo(p.camera.position) < 15);
      if (!tooClose) { safePos = candidate; break; }
      tries++;
    }
    if (!safePos) safePos = new THREE.Vector3(8,16,8);
    camera.position.copy(safePos);
  }

  return {
    player,
    takeDamage,
    addKillLog,
    respawn,
    update(dt, allPlayers, camera) {
      if (!player.alive) {
        player.respawnTimer -= dt;
        if (player.respawnTimer <= 0) respawn(allPlayers, camera);
      }
      if (camera.position.y < -10 && player.alive) {
        player.alive = false;
        addKillLog(`${player.name} has go to void`);
        player.respawnTimer = 5;
      }
    }
  };
}

export function setupPointerLock(canvas, camera, collider) {
  const velocity = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const euler = new THREE.Euler(0,0,0,'YXZ');
  let yaw=0, pitch=0, locked=false, onGround=false;
  const key={};

  window.addEventListener('keydown', e=>key[e.code]=true);
  window.addEventListener('keyup', e=>key[e.code]=false);

  canvas.addEventListener('click', ()=>canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', ()=>{ locked = document.pointerLockElement === canvas; });
  document.addEventListener('mousemove', e=>{
    if(!locked) return;
    const sens=0.0025;
    yaw -= e.movementX*sens;
    pitch -= e.movementY*sens;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
  });

  camera.position.set(8,16,8);

  function collide(pos){
    const px=Math.floor(pos.x+0.5), py=Math.floor(pos.y), pz=Math.floor(pos.z+0.5);
    for(let y=py;y<=py+1;y++){
      const key=`${px},${y},${pz}`;
      if(collider.solid.has(key)) return true;
    }
    return false;
  }

  return {
    update(dt){
      const quat=new THREE.Quaternion().setFromEuler(euler.set(pitch,yaw,0,'YXZ'));
      camera.quaternion.copy(quat);

      dir.set(0,0,0);
      if(key['KeyW']) dir.z-=1;
      if(key['KeyS']) dir.z+=1;
      if(key['KeyA']) dir.x-=1;
      if(key['KeyD']) dir.x+=1;
      dir.normalize();

      const forward = new THREE.Vector3(0,0,-1).applyQuaternion(quat);
      const right   = new THREE.Vector3(1,0,0).applyQuaternion(quat);
      forward.y=0; right.y=0; forward.normalize(); right.normalize();

      const speed = (key['ShiftLeft'] ? 12 : 6);
      const accel = new THREE.Vector3().addScaledVector(forward, dir.z*speed).addScaledVector(right, dir.x*speed);

      velocity.x = THREE.MathUtils.damp(velocity.x, accel.x, 15, dt);
      velocity.z = THREE.MathUtils.damp(velocity.z, accel.z, 15, dt);

      const g=-24;
      velocity.y+=g*dt;

      if(key['Space'] && onGround){ velocity.y=10; onGround=false; }

      const next=camera.position.clone();
      next.x+=velocity.x*dt; if(collide(next)){ next.x=Math.round(next.x)+(velocity.x>0?-0.51:0.51); velocity.x=0; }
      next.z+=velocity.z*dt; if(collide(next)){ next.z=Math.round(next.z)+(velocity.z>0?-0.51:0.51); velocity.z=0; }

      next.y+=velocity.y*dt;
      if(collide(next)){
        if(velocity.y<0){ onGround=true; velocity.y=0; next.y=Math.floor(next.y)+1; }
        else if(velocity.y>0){ velocity.y=0; next.y=Math.ceil(next.y)-0.01; }
      }else onGround=false;

      camera.position.copy(next);
    },

    shoot(targets, playerObj){
      if(!playerObj.player.alive) return;
      const raycaster = new THREE.Raycaster();
      const dirVec = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
      raycaster.set(camera.position.clone(), dirVec);
      const hit = targets.find(t=> t.player.alive && t!==playerObj && raycaster.ray.distanceToPoint(t.camera.position)<1.5);
      if(hit){
        let dmg=0;
        switch(playerObj.player.weapon){
          case 'AR': dmg=25; break;
          case 'Pistol': dmg=50; break;
          case 'Sniper': dmg=100; break;
        }
        hit.takeDamage(dmg, playerObj.player.name, playerObj.player.weapon);
      }
    }
  };
}
