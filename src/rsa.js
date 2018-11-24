const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const fs = require("fs")
const keyPair = ec.genKeyPair();

function getPub(prv) {
    //根据私钥生成公钥
    return ec.keyFromPrivate(prv).getPublic('hex').toString()
}

//1.获取密钥对(本地化)
function generateKeys() {
    //1.先判断本地是否密钥文件
    const fileName = "wallet.json"

    try {
        let res = JSON.parse(fs.readFileSync(fileName))
        if (res.prv && res.pub && getPub(res.prv) === res.pub) {
            console.log("first keypair:",keyPair)
            console.log(ec.keyFromPrivate)
            keyPair = ec.keyFromPrivate(res.prv)
            console.log("after keypair:",keyPair)
            return res
        }
    } catch (error) {
        console.log("error:",error)
        //文件不存在 或者文件内容不合法 需要重新生成密钥对
        const res = {
            prv: keyPair.getPrivate('hex').toString(),
            pub: keyPair.getPublic('hex').toString(),
        }

        fs.writeFileSync(fileName, JSON.stringify(res))
        return res
    }
}

//2.转账签名
function sign({from,to,amount,timestamp}) {
    const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
    let signature = Buffer.from(keyPair.sign(bufferMsg).toDER()).toString('hex')
    return signature
}

//3.验证签名
function verify({from,to,amount,timestamp,signature,},pub) {
    //校验是没有私钥的
    console.log("pub:",pub)
    console.log("from:",from)
    console.log("to:",to)
    console.log("amount:",amount)
    console.log("signature:",signature)
    const keypairTemp = ec.keyFromPublic(pub,'hex')
    const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
    return keypairTemp.verify(bufferMsg,signature)
}

const keys = generateKeys() 

const trans1 = {from:"wang",to:"kobe",amount:100}
//const trans2 = {from:"yujie",to:"curry",amount:100}
const signature = sign(trans1)
trans1.signature = signature

let isVerify = verify(trans1,keys.pub)
console.log("isVerify",isVerify)

module.exports = {sign,verify,keys}



