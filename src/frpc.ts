import { Socket, connect } from "net";
import { checkSocketAlive, connectAndVerify, connectPort, connectToken, createCipher, createDecipher, EcsIp, EcsPort, EcsToken, localConnectPort, log } from "./utils";

/** 请设置当前电脑的Id（范围1-60） */
const frpcId = Number(process.argv[2] ?? 1);

/** 如果配置了Ecs，则自动注册当前frpc，建立连接 */
const connectEcs = () => {
  if (EcsToken && EcsIp && EcsPort) {
    connectAndVerify(EcsPort, EcsIp, EcsToken, frpcId)
      .then(socket => {
        log("连接Ecs成功");
        socket.on("readable", () => {
          while (socket.readableLength >= 4) {
            const ip: Buffer = socket.read(4);
            connectSignalSocket([...ip].join("."));
          }
        });
        socket.on("close", () => setTimeout(() => connectEcs, 1000));
      })
      .catch(e => {
        log("连接Ecs失败");
        console.error(e);
      });
  }
};
connectEcs();

/** 与frps连接id为120的信号通道 */
let signalSocket: Socket;
let frpsIp: string;
/** 连接信号通道 */
const connectSignalSocket = (host: string) => {
  if (signalSocket && checkSocketAlive(signalSocket)) {
    log("已建立信号通道，无需再建立");
    return;
  }
  frpsIp = host;
  connectAndVerify(connectPort, frpsIp, connectToken, 120).then(socket => {
    signalSocket = socket;
    log("信号通道建立成功");
    signalSocket.on("readable", () => signalSocketReadable());
    signalSocket.on("error", () => log("信号通道已断开"));
  });
};

/** 接收信号通道的连接id数据 */
const signalSocketReadable = () => {
  if (signalSocket && signalSocket.readableLength >= 1) {
    const id = signalSocket.read(1)[0];
    if (frpsIp) {
      connectAndVerify(connectPort, frpsIp, connectToken, id)
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
        .catch(e => log("frps普通连接建立失败"));
    }
  }
};
