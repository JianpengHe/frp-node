/** 这个文件没用的，用来测试加密 */
import { connectAndVerify, connectToken, createVerifyServer, EcsToken } from "./utils";
createVerifyServer(123, connectToken, con => {
  console.log("连接成功");
  con.on("data", d => console.log(d));
});
setTimeout(() => {
  connectAndVerify(123, "127.0.0.1", connectToken, 1, () => {})
    .then(c => c.write(Buffer.from("abc")))
    .catch(a => console.error(a));
}, 2000);

setTimeout(() => {}, 1e6);
