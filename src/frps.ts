import { createServer, Socket } from "net";
import { checkSocketAlive, connectAndVerify, connectPort, connectToken, createCipher, createDecipher, createVerifyServer, EcsIp, EcsPort, EcsToken, localListenPort, log } from "./utils";

/** 你想连的frpc的Id */
const wantToConnect = Number(process.argv[2] ?? 1);

/** 本地连接池 */
const localSocketPool = new Map<number, Socket>();

/** 如果配置了Ecs，则自动发送请求，要Ecs转告frpc */
if (EcsToken && EcsIp && EcsPort) {
  connectAndVerify(EcsPort, EcsIp, EcsToken, wantToConnect + 60)
    .then(socket => {
      socket.end();
    })
    .catch(e => {
      log("通知Ecs失败");
      console.error(e);
    });
}

/** 与本机应用通讯用 */
createServer(newLocalSocket => {
  newLocalSocket.on("error", () => {});
  /** frps和frpc通讯的专用id是120 */
  const connectSocket = localSocketPool.get(120);
  if (!connectSocket || !checkSocketAlive(connectSocket)) {
    log("未与frpc建立连接");
    newLocalSocket.end();
    return;
  }
  if (localSocketPool.size > 90) {
    log("等待连接数过多");
    newLocalSocket.end();
    return;
  }
  /** 找出一个可用的id */
  let id = 0;
  while (localSocketPool.has((id = Math.ceil(Math.random() * 100))));
  /** 标记当前连接，放进连接池 */
  localSocketPool.set(id, newLocalSocket);
  /** 告诉frpc，让他连接这个id */
  connectSocket.write(Buffer.allocUnsafe(1).fill(id));
}).listen(localListenPort);

/** 与frpc通讯用 */
createVerifyServer(connectPort, connectToken, (newConnectSocket, id) => {
  if (id === 120) {
    log("frpc已连接");
    localSocketPool.set(id, newConnectSocket);
    return;
  }
  /** 从连接池尝试取出frpc要求的连接id */
  const localSocket = localSocketPool.get(id);
  localSocketPool.delete(id);
  if (!localSocket || !checkSocketAlive(localSocket)) {
    log(localSocket ? `${id}已失活` : `连接池中未找到${id}`);
    newConnectSocket.end();
    return;
  }
  localSocket.pipe(createCipher(connectToken)).pipe(newConnectSocket);
  newConnectSocket.pipe(createDecipher(connectToken)).pipe(localSocket);
});
