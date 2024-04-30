import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";
import * as child_process from "child_process";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
import { config, sleep, spawn, unZip } from "../utils";
const { serverHost, frpsPort, token, frpcPort, client } = config;
const nameWinSW = "startFrpc";
const runWinSW = (od: "uninstall" | "install" | "start") => {
  console.log(nameWinSW, od);
  return spawn(__dirname + "/" + nameWinSW + ".exe", [od, __dirname + "/" + nameWinSW + ".xml"], { cwd: __dirname });
};

console.log("请使用管理员权限打开");

/** 是否需要卸载以前的 */
const isNeedUninstall = unZip(nameWinSW, "frpc");

const writeIniFile = (host: string, port: number) => {
  console.log("写入", "frpc.ini");
  const iniFile = `[common]
    server_addr = ${host}
    server_port = ${port}
    authentication_method = token
    token = ${token}
    
    [${client.name}]
    type = tcp
    local_ip = 127.0.0.1
    local_port = ${client.localPort}
    remote_port = ${client.remotePort}
    `;
  fs.writeFileSync(__dirname + "/frpc.ini", iniFile);
};

const writeXMLFile = (executable: string, argument: string) => {
  console.log("写入", nameWinSW + ".xml");

  const xml = `<service>
<id>frpc</id>
<name>Frp Client</name>
<description>My Frp Client</description>
<executable>${executable}</executable>
<arguments>${argument}</arguments>
</service>`;
  fs.writeFileSync(__dirname + "/" + nameWinSW + ".xml", xml);
};

rl.question("是否需要流量加密？回复1回车即为加密，直接回车则不加密\n", async answer => {
  const isCrypto = Boolean(answer.trim());
  if (isCrypto) {
    writeIniFile("127.0.0.1", frpcPort);
    writeXMLFile(process.execPath, path.resolve(__dirname, "frpcCrypto"));
  } else {
    writeIniFile(serverHost, frpsPort);
    writeXMLFile(path.resolve(__dirname, "/frpc.exe"), `-c "${path.resolve(__dirname, "frpc.ini")}"`);
  }
  if (isNeedUninstall) {
    await new Promise(r => child_process.exec(`net stop "Frp Client"`, r));
    await sleep(1000);
    await runWinSW("uninstall");
    await sleep(1000);
  }
  await runWinSW("install");
  await runWinSW("start");
  rl.close();
});
