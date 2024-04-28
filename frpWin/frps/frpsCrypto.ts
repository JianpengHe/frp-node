import * as net from "net";
import { frpsCryptoPort, MyTransform, frpsPort } from "../utils";

net
  .createServer(localSock => {
    const remoteSock = net.connect({ host: "127.0.0.1", port: frpsPort });
    localSock.pipe(new MyTransform()).pipe(remoteSock);
    remoteSock.pipe(new MyTransform()).pipe(localSock);
    localSock.on("error", e => console.log("localSock err", e));
    remoteSock.on("error", e => console.log("remoteSock err", e));
  })
  .listen(frpsCryptoPort, () => {
    console.log("net.createServer 成功");
  });
