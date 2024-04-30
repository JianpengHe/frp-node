import * as child_process from "child_process";
import * as stream from "stream";
import * as fs from "fs";
import * as zlib from "zlib";

export const config = JSON.parse(String(fs.readFileSync(__dirname + "/config.json")));

export const spawn = (...args: Parameters<typeof child_process.spawn>) =>
  new Promise<void>(r => {
    const run = child_process.spawn(...args);
    run.stderr?.pipe(process.stdout, { end: false });
    run.stdout?.pipe(process.stdout, { end: false });
    run.once("close", r);
    run.on("error", (e: any) => console.log("命令报错：", e.path));
  });

export const unZip = (nameWinSW: string, type: "frps" | "frpc") => {
  let isNeedUninstall = true;
  const nowPath = __dirname + "/" + type;
  const fileList = new Set(fs.readdirSync(nowPath));
  if (!fileList.has(nameWinSW + ".exe")) {
    isNeedUninstall = false;
    console.log("正在解压", "WinSW.exe.brotli");
    fs.writeFileSync(nowPath + "/" + nameWinSW + ".exe", zlib.brotliDecompressSync(fs.readFileSync(__dirname + "/WinSW.exe.brotli")));
  }
  if (!fileList.has(type + ".exe")) {
    console.log("正在解压", "frpc.exe.brotli");
    fs.writeFileSync(nowPath + "/" + type + ".exe", zlib.brotliDecompressSync(fs.readFileSync(nowPath + "/" + type + ".exe.brotli")));
  }
  return isNeedUninstall;
};

export const sleep = (time: number) => new Promise(r => setTimeout(r, time));

export class MyTransform extends stream.Transform {
  constructor(options?: any) {
    super(options);
    const date = new Date();
    this.byteNum = (date.getFullYear() * date.getMonth() * date.getDate() * date.getDay()) % 256 || 1;
    this.step = date.getDay() + 1;
  }
  private byteNum = 0;
  private step = 0;
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: stream.TransformCallback) {
    chunk.forEach((_, i) => (chunk[i] ^= (this.byteNum += this.step) % 256));
    callback(null, chunk);
  }
}
