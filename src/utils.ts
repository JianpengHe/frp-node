/*
 * ecs: 运行于有公网ip的云服务器上，要求24小时开机
 * frps: 运行于有公网ip的电脑/服务器上，通常是你带公网IP的家里电脑，不要求24小时开机
 * frpc: 运行于在局域网的电脑/服务器上，要求24小时开机
 *
 * utils: 3个终端都必须放在同目录下
 */
import { Socket, connect, createServer } from "net";
import { createHash, createCipheriv, createDecipheriv } from "crypto";
export const SHA1 = (buf: Buffer) => createHash("sha1").update(buf).digest();

/** 云服务器监听的端口 */
export const EcsPort = 61587;
/** 云服务器IP */
export const EcsIp = "sz.hejianpeng.cn";
/** 云服务器验证密钥 */
export const EcsToken = SHA1(Buffer.from("97f30128fc46aa6490dfccd5c3c8f99d0f4fad87"));

/** 直连通信用的端口（必须与frpc的connectPort相同，路由器等防火墙要放行该端口） */
export const connectPort = 60006;
/** 直连通信验证密钥 */
export const connectToken = SHA1(Buffer.from("71c915b0669083a4abc25f761bb5bc20989050f1"));

/** frps本地监听的端口 */
export const localListenPort = 3389;

/** frpc本地连接的端口 */
export const localConnectPort = 60008;

/** 验证超时（毫秒） */
export const verifyTimeout = 9999;

/** 检测连接是否存活 */
export const checkSocketAlive = (socket: Socket) => socket && !socket.destroyed;
const numberToBuffer = (num: number) => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(num);
  return buf;
};
/** 打印日志 */
export const log = (...item: any[]) => console.log.apply(console, [new Date().toLocaleString(), ...item]);
/** 通信密钥加密方式 */
export const getKey = (time: number, rand: Buffer, token: Buffer) => SHA1(Buffer.concat([rand, numberToBuffer(time), token]));

/** 加密 */
export const createCipher = (token: Buffer) => {
  const cipher = createCipheriv("aes-128-gcm", token.slice(0, 16), token.slice(4, 20));
  cipher.on("error", () => {});
  return cipher;
};
/** 解密 */
export const createDecipher = (token: Buffer) => {
  const cipher = createDecipheriv("aes-128-gcm", token.slice(0, 16), token.slice(4, 20));
  cipher.on("error", () => {});
  return cipher;
};
/** 建立一个tcp连接，并发送验证信息 */
export const connectAndVerify = (port: number, host: string, token: Buffer, no: number, errFn: (reason: any) => void): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const time = Math.ceil(new Date().getTime() / 1000) + verifyTimeout;
    const rand = SHA1(Buffer.from(String(Math.random())));
    if (no) {
      if (no > 120) {
        throw new Error("序号太大" + no);
      }
      rand[19] = no;
    }
    // log(numberToBuffer(time), rand.length, getKey(time, rand, token));
    const cipher = createCipher(token);
    const con: Socket = connect(port, host, () => {
      const buf: Buffer[] = [];
      buf.push(cipher.update(Buffer.concat([rand, numberToBuffer(time), getKey(time, rand, token)])));
      buf.push(cipher.final());
      buf.unshift(Buffer.allocUnsafe(1).fill(buf[0].length + buf[1].length));
      con.write(Buffer.concat(buf));
      cipher.on("error", () => {});
    });

    // let isDone = false;
    // const timer = setTimeout(() => {
    //   if (isDone) {
    //     return;
    //   }
    //  // reject(new Error("连接超时"));
    //   errFn(new Error("连接超时"));
    //   if (checkSocketAlive(con)) {
    //     con.end();
    //   }
    // }, verifyTimeout);
    con.once("readable", () => {
      if (
        con.readableLength >= 1
        // && isDone === false
      ) {
        // isDone = true;
        // clearTimeout(timer);
        if (con.read(1)[0]) {
          resolve(con);
        } else {
          reject(new Error("密钥错误"));
          errFn(new Error("密钥错误"));
          if (checkSocketAlive(con)) {
            con.end();
          }
        }
      }
      if (con.isPaused()) {
        con.resume();
      }
    });
    con.on("error", err => {
      errFn(err);
      // isDone = true;
      // clearTimeout(timer);
    });
  });
/** 创建一个需要验证的服务器 */
export const createVerifyServer = (port: number, token: Buffer, connectionListener: (socket: Socket, no: number) => void) =>
  createServer(con => {
    con.on("error", () => log("连接关闭"));
    let isDone = false;
    const timer = setTimeout(() => {
      if (isDone) {
        return;
      }
      log("连接超时");
      if (checkSocketAlive(con)) {
        con.end();
      }
    }, verifyTimeout);
    let len = 0;
    con.once("readable", () => {
      if (!len && con.readableLength >= 1) {
        len = con.read(1)[0];
      }
      if (con.readableLength >= len && isDone === false) {
        isDone = true;
        clearTimeout(timer);
        if (checkSocketAlive(con)) {
          const cipher = createDecipher(token);
          const buf: Buffer = Buffer.concat([cipher.update(con.read(len))]);
          const time = buf.readUInt32LE(20);
          if (time > Math.ceil(new Date().getTime() / 1000) && buf.slice(24, 44).equals(getKey(time, buf.slice(0, 20), token))) {
            con.write(Buffer.from([1]));
            connectionListener(con, buf[19]);
          } else {
            log("鉴权失败", time > Math.ceil(new Date().getTime() / 1000), buf.slice(24, 44).equals(getKey(time, buf.slice(4, 24), token)));
            con.write(Buffer.from([0]));
            con.end();
          }
          cipher.on("error", () => {});
          cipher.end();
        }
      }
      if (con.isPaused()) {
        con.resume();
      }
    });
  }).listen(port);
