// server.js
import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

const players = new Map(); // id -> { ws, name, hp }

wss.on('connection', ws => {
  let playerId = null;

  ws.on('message', msgStr => {
    try {
      const msg = JSON.parse(msgStr);

      switch(msg.type){
        case "join":
          playerId = msg.id;
          players.set(playerId, { ws, name: msg.name, hp: 100 });
          broadcast({ type: "join", id: playerId, name: msg.name });
          break;

        case "move":
          broadcast({ type: "move", id: msg.id, x: msg.x, y: msg.y, z: msg.z });
          break;

        case "chat":
          broadcast({ type: "chat", id: msg.id, name: msg.name, text: msg.text });
          break;

        case "shoot":
          handleShoot(msg);
          break;
      }
    } catch(e){ console.error(e); }
  });

  ws.on('close', ()=>{
    if(playerId){
      players.delete(playerId);
      broadcast({ type: "leave", id: playerId });
    }
  });

  function broadcast(msg){
    const data = JSON.stringify(msg);
    players.forEach(p=>{
      if(p.ws.readyState === WebSocket.OPEN){
        p.ws.send(data);
      }
    });
  }

  function handleShoot(msg){
    const damageMap = { "AR":25, "Pistol":50, "Sniper":100 };
    const target = players.get(msg.toId);
    if(!target) return;

    target.hp -= damageMap[msg.weapon] || 0;
    if(target.hp <=0){
      target.hp = 0;
      broadcast({ type:"kill", killerId: msg.fromId, victimId: msg.toId, weapon: msg.weapon });
      setTimeout(()=>{
        target.hp = 100;
        broadcast({ type:"respawn", id: msg.toId });
      },5000);
    }

    broadcast({ type:"hp", id: msg.toId, hp: target.hp });
  }
});
