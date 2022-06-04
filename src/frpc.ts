import { Socket, connect } from "net";
import { checkSocketAlive, connectAndVerify, connectPort, connectToken, createCipher, createDecipher, EcsIp, EcsPort, EcsToken, localConnectPort, log } from "./utils";

/** 请设置当前电脑的Id（范围1-60） */
const frpcId = Number(process.argv[2] ?? 1);

/** 如果配置了Ecs，则自动注册当前frpc，建立连接 */
const connectEcs = () => {
  log("正在连接Ecs");
  connectSignalSocket();
  if (EcsToken && EcsIp && EcsPort) {
    connectAndVerify(EcsPort, EcsIp, EcsToken, frpcId, e => {
      log("连接Ecs失败");
      console.error(e);
      setTimeout(connectEcs, 1000);
    })
      .then(socket => {
        if (socket.isPaused()) {
          socket.resume();
        }
        log("连接Ecs成功");
        // clearInterval(timer);
        socket.on("readable", () => {
          while (socket.readableLength >= 4) {
            const ip: Buffer = socket.read(4);
            connectSignalSocket([...ip].join("."));
            if (socket.isPaused()) {
              socket.resume();
            }
          }
        });
        socket.on("close", () => setTimeout(() => connectEcs, 1000));
        socket.on("error", () => setTimeout(() => connectEcs, 1000));
      })
      .catch();
  }
};

/** 与frps连接id为120的信号通道 */
let signalSocket: Socket;
let frpsIp: string;
/** 连接信号通道 */
const connectSignalSocket = (host?: string) => {
  if (signalSocket && checkSocketAlive(signalSocket)) {
    // log("已建立信号通道，无需再建立");
    return;
  }
  frpsIp = host || frpsIp || "shenzhen.hejianpeng.cn";
  connectAndVerify(connectPort, frpsIp, connectToken, 120, e => {})
    .then(socket => {
      signalSocket = socket;
      log("信号通道建立成功");
      signalSocket.on("readable", () => signalSocketReadable());
      signalSocket.on("close", () => {
        log("信号通道已断开");
        setTimeout(connectSignalSocket, 1000);
      });
    })
    .catch();
};
const timer = setInterval(() => connectSignalSocket(), 60 * 1000);
/** 接收信号通道的连接id数据 */
const signalSocketReadable = () => {
  if (signalSocket && signalSocket.readableLength >= 1) {
    const id = signalSocket.read(1)[0];
    if (frpsIp) {
      connectAndVerify(connectPort, frpsIp, connectToken, id, e => log("frps普通连接建立失败"))
        .then(socket => {
          const localSocket = connect(localConnectPort, "127.0.0.1", () => {
            localSocket.pipe(createCipher(connectToken)).pipe(socket);
            socket.pipe(createDecipher(connectToken)).pipe(localSocket);
            socket.on("error", () => {
              if (checkSocketAlive(localSocket)) {
                localSocket.end();
              }
            });
            localSocket.on("error", () => {
              if (checkSocketAlive(socket)) {
                socket.end();
              }
            });
          });
        })
        .catch();
    }
  }
};

connectEcs();
