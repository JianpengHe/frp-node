import * as child_process from "child_process";
import * as stream from "stream";

export const serverHost = "xxx";
export const frpsCryptoPort = 1;

export const frpsPort = 2;
export const token = "xxx";
export const frpcPort = 4;
export const client = {
  localPort: 3389,
  remotePort: 6,
  name: "ltd",
};

export const spawn = (...args: Parameters<typeof child_process.spawn>) =>
  new Promise<void>(r => {
    const run = child_process.spawn(...args);
    run.stderr?.pipe(process.stdout, { end: false });
    run.stdout?.pipe(process.stdout, { end: false });
    run.once("close", r);
  });

export class MyTransform extends stream.Transform {
  constructor(options?: any) {
    super(options);
  }
  private byteNum = 0;
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: stream.TransformCallback) {
    chunk.forEach((byte, i) => (chunk[i] ^= this.byteNum++ % 256));
    callback(null, chunk);
  }
}
