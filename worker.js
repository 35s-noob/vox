const connections = new Map(); // id -> { ws, name, hp }

export default {
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("WebSocket endpoint only", { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    let playerId = null;

    server.addEventListener("message", e => {
      const msg = JSON.parse(e.data);

      switch(msg.type){
        case "join":
          playerId = msg.id;
          connections.set(playerId, { ws: server, name: msg.name, hp: 100 });
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
    });

    server.addEventListener("close", () => {
      if(playerId){
        connections.delete(playerId);
        broadcast({ type: "leave", id: playerId });
      }
    });

    function broadcast(msg){
      const data = JSON.stringify(msg);
      connections.forEach(c => {
        if(c.ws.readyState === 1) c.ws.send(data);
      });
    }

    function handleShoot(msg){
      // msg: { type:'shoot', fromId, toId, weapon }
      const damageMap = { "AR":25, "Pistol":50, "Sniper":100 };
      const target = connections.get(msg.toId);
      if(!target) return;

      target.hp -= damageMap[msg.weapon] || 0;
      if(target.hp <=0){
        target.hp = 0;
        broadcast({ type:"kill", killerId: msg.fromId, victimId: msg.toId, weapon: msg.weapon });
        // リスポーン5秒後に体力回復
        setTimeout(()=>{
          target.hp = 100;
          broadcast({ type:"respawn", id: msg.toId });
        },5000);
      }

      broadcast({ type:"hp", id: msg.toId, hp: target.hp });
    }

    return new Response(null, { status: 101, webSocket: client });
  }
};
