import * as fs from "fs";
import * as zlib from "zlib";
import * as readline from "readline";
import * as path from "path";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
import { serverHost, frpsPort, token, frpcPort, client, spawn } from "../utils";

const name = "startFrpc";
console.log("正在解压", "WinSW.exe.brotli");
fs.writeFileSync(__dirname + "/" + name + ".exe", zlib.brotliDecompressSync(fs.readFileSync(__dirname + "/../WinSW.exe.brotli")));
console.log("正在解压", "frpc.exe.brotli");
fs.writeFileSync(__dirname + "/frpc.exe", zlib.brotliDecompressSync(fs.readFileSync(__dirname + "/frpc.exe.brotli")));
const writeIniFile = (host: string, port: number) => {
  console.log("写入", "frpc.ini");
  const iniFile = `[common]
      server_addr = ${host}
      server_port = ${port}
      authentication_method = token
      token = ${token}
      
      [60000]
      type = tcp
      local_ip = 127.0.0.1
      local_port = ${client.localPort}
      remote_port = ${client.remotePort}
      `;
  fs.writeFileSync(__dirname + "/frpc.ini", iniFile);
};

const writeXMLFile = (executable: string, argument: string) => {
  console.log("写入", name + ".xml");

  const xml = `<service>
<id>frpc</id>
<name>Frp Client</name>
<description>My Frp Client</description>
<executable>${executable}</executable>
<arguments>${argument}</arguments>
</service>`;
  fs.writeFileSync(__dirname + "/" + name + ".xml", xml);
};

rl.question("是否需要流量加密？回复1回车即为加密，直接回车则不加密\n", async answer => {
  const isCrypto = Boolean(answer.trim());
  if (isCrypto) {
    writeIniFile("127.0.0.1", frpcPort);
    writeXMLFile(process.execPath, path.resolve(__dirname, "/frpcCrypto"));
  } else {
    writeIniFile(serverHost, frpsPort);
    writeXMLFile(path.resolve(__dirname, "/frpc.exe"), `-c "${path.resolve(__dirname, "frpc.ini")}"`);
  }
  console.log("install");
  await spawn(__dirname + "/" + name + ".exe", ["install", __dirname + "/" + name + ".xml"], { cwd: __dirname });
  console.log("start");
  await spawn(__dirname + "/" + name + ".exe", ["start", __dirname + "/" + name + ".xml"], { cwd: __dirname });
  rl.close();
});
