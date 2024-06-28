import * as net from "net";
import * as path from "path";
import { spawn, config, MyTransform } from "../utils";
const { frpsCryptoPort, frpsPort } = config;
net
  .createServer(localSock => {
    const remoteSock = net.connect({ host: "127.0.0.1", port: frpsPort });
    localSock.pipe(new MyTransform()).pipe(remoteSock);
    remoteSock.pipe(new MyTransform()).pipe(localSock);
    localSock.on("error", e => console.log("localSock err", e));
    remoteSock.on("error", e => console.log("remoteSock err", e));
    localSock.on("close", e => remoteSock.writable && remoteSock.end());
    remoteSock.on("error", e => localSock.writable && localSock.end());
  })
  .listen(frpsCryptoPort, async () => {
    console.log(new Date().toLocaleString(), "net.createServer 成功");
    while (1) {
      console.log(new Date().toLocaleString(), "启动frps.exe");
      await spawn(__dirname + "/frps.exe", [`-c`, path.resolve(__dirname, "frps.ini")], { cwd: __dirname });
    }
  });
