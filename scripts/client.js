export let socket;
export const otherPlayers = new Map();
export let myId = Math.random().toString(36).substr(2,9);
export const myName = "土星";
export let myHp = 100;

export function connectServer(url){
  socket = new WebSocket(url);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type:"join", id:myId, name:myName }));
  };

  socket.onmessage = (event)=>{
    const msg = JSON.parse(event.data);

    switch(msg.type){
      case "join": otherPlayers.set(msg.id,{name:msg.name,hp:100}); break;
      case "move": 
        if(msg.id!==myId) otherPlayers.set(msg.id,{...otherPlayers.get(msg.id), x:msg.x, y:msg.y, z:msg.z});
        break;
      case "chat":
        const chatDiv = document.getElementById("chat");
        chatDiv.innerHTML += `<div><span style="color:green">${msg.name}</span>: ${msg.text}</div>`;
        break;
      case "leave": otherPlayers.delete(msg.id); break;
      case "hp": 
        if(msg.id===myId) myHp = msg.hp;
        else otherPlayers.set(msg.id,{...otherPlayers.get(msg.id), hp:msg.hp});
        break;
      case "kill":
        addKillLog(`${otherPlayers.get(msg.victimId)?.name || msg.victimId} killed by ${msg.weapon} from ${otherPlayers.get(msg.killerId)?.name || msg.killerId}`);
        break;
      case "respawn":
        if(msg.id===myId) myHp=100;
        break;
    }
  };
}

export function sendMove(x,y,z){
  if(socket && socket.readyState===1) socket.send(JSON.stringify({type:"move",id:myId,x,y,z}));
}

export function sendChat(text){
  if(socket && socket.readyState===1) socket.send(JSON.stringify({type:"chat",id:myId,name:myName,text}));
}

export function shoot(targetId, weapon){
  if(socket && socket.readyState===1){
    socket.send(JSON.stringify({type:"shoot",fromId:myId,toId:targetId,weapon}));
  }
}

export function addKillLog(text){
  const logDiv = document.getElementById("killLog");
  logDiv.innerHTML += `<div>${text}</div>`;
  logDiv.scrollTop = logDiv.scrollHeight;
}
