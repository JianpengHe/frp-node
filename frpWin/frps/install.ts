import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";
import * as child_process from "child_process";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
import { config, sleep, spawn, unZip } from "../utils";
const { frpsPort, token } = config;
const nameWinSW = "startFrps";
const runWinSW = (od: "uninstall" | "install" | "start") => {
  console.log(nameWinSW, od);
  return spawn(__dirname + "/" + nameWinSW + ".exe", [od, __dirname + "/" + nameWinSW + ".xml"], { cwd: __dirname });
};

console.log("请使用管理员权限打开");

/** 是否需要卸载以前的 */
const isNeedUninstall = unZip(nameWinSW, "frps");

const writeIniFile = (port: number) => {
  console.log("写入", "frps.ini");
  const iniFile = `[common]
bind_port = ${port}
bind_udp_port = ${port}
allow_ports = ${Math.min(65535, port + 2)},${Math.min(65535, port + 5)}
authentication_method = token
token = ${token}
`;
  fs.writeFileSync(__dirname + "/frps.ini", iniFile);
};

const writeXMLFile = (executable: string, argument: string) => {
  console.log("写入", nameWinSW + ".xml");

  const xml = `<service>
<id>frps</id>
<name>Frp Server</name>
<description>My Frp Server</description>
<executable>${executable}</executable>
<arguments>${argument}</arguments>
</service>`;
  fs.writeFileSync(__dirname + "/" + nameWinSW + ".xml", xml);
};

rl.question("是否需要支持流量加密？回复1回车即为支持加密和不加密，直接回车则不支持加密\n", async answer => {
  const isCrypto = Boolean(answer.trim());
  if (isCrypto) {
    writeIniFile(frpsPort);
    writeXMLFile(process.execPath, path.resolve(__dirname, "frpsCrypto"));
  } else {
    writeIniFile(frpsPort);
    writeXMLFile(path.resolve(__dirname, "/frps.exe"), `-c "${path.resolve(__dirname, "frps.ini")}"`);
  }
  if (isNeedUninstall) {
    await new Promise(r => child_process.exec(`net stop "Frp Server"`, r));
    await sleep(1000);
    await runWinSW("uninstall");
    await sleep(1000);
  }
  await runWinSW("install");
  await runWinSW("start");
  rl.close();
});
