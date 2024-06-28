import * as net from "net";
import * as path from "path";
import { config, spawn, MyTransform } from "../utils";
const { serverHost, frpsCryptoPort, frpcPort } = config;
console.log("本机到服务器的流量将会加密");

net
  .createServer(localSock => {
    const remoteSock = net.connect({ host: serverHost, port: frpsCryptoPort });
    localSock.pipe(new MyTransform()).pipe(remoteSock);
    remoteSock.pipe(new MyTransform()).pipe(localSock);
    localSock.on("error", e => console.log("localSock err", e));
    remoteSock.on("error", e => console.log("remoteSock err", e));
    localSock.on("close", e => remoteSock.writable && remoteSock.end());
    remoteSock.on("error", e => localSock.writable && localSock.end());
  })
  .listen(frpcPort, "127.0.0.1", async () => {
    console.log(new Date().toLocaleString(), "net.createServer 成功");
    while (1) {
      console.log(new Date().toLocaleString(), "启动frpc.exe");
      await spawn(__dirname + "/frpc.exe", [`-c`, path.resolve(__dirname, "frpc.ini")], { cwd: __dirname });
    }
  });
