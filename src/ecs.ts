import { Socket } from "net";
import { checkSocketAlive, createVerifyServer, EcsPort, EcsToken, log } from "./utils";
/** 你想连的frpc的Id池 */
const frpcId = new Map<number, Socket>();

createVerifyServer(EcsPort, EcsToken, (newConnectSocket, id) => {
  /** 如果frpcId大于60，则为frps */
  if (id > 60) {
    log("frps请求连接frpcId" + (id - 60));
    const frpcSocket = frpcId.get(id - 60);
    if (!frpcSocket || !checkSocketAlive(frpcSocket)) {
      log(frpcSocket ? `${id - 60}已失活` : `frpc池中未找到${id - 60}`);
      newConnectSocket.end();
      return;
    }
    setTimeout(() => newConnectSocket.end(), 1000);
    const ip = [...(String(newConnectSocket.remoteAddress || "").match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/) || [])].slice(1).map(n => Number(n));
    if (ip.length !== 4) {
      log("无法获取IP地址", ip, newConnectSocket.remoteAddress);
      return;
    }
    /** 把frps当前的ip传给frpc */
    frpcSocket.write(Buffer.from(ip));
    log("通知frpc，frps的ip为", ip.join("."));
    return;
  }
  /** frpc注册流程 */

  /** 已经存在该id的frpc */
  const oldFrpcSocket = frpcId.get(id);
  if (oldFrpcSocket && checkSocketAlive(oldFrpcSocket)) {
    log("存在冲突的frpcId");
    return;
  }
  log("注册frpcId", id, "成功");
  frpcId.set(id, newConnectSocket);
});
