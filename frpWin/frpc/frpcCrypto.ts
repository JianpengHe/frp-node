import * as net from "net";
import * as path from "path";
import { serverHost, frpsCryptoPort, frpcPort, spawn, MyTransform } from "../utils";

console.log("本机到服务器的流量将会加密");

net
  .createServer(localSock => {
    const remoteSock = net.connect({ host: serverHost, port: frpsCryptoPort });
    localSock.pipe(new MyTransform()).pipe(remoteSock);
    remoteSock.pipe(new MyTransform()).pipe(localSock);
    localSock.on("error", e => console.log("localSock err", e));
    remoteSock.on("error", e => console.log("remoteSock err", e));
  })
  .listen(frpcPort, "127.0.0.1", () => {
    console.log("net.createServer 成功");
    spawn(__dirname + "/frpc.exe", [`-c`, path.resolve(__dirname, "frpc.ini")], { cwd: __dirname });
  });
