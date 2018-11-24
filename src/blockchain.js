const crypto = require("crypto")
const rsa = require("./rsa.js")
const dgram = require("dgram")

const initBlock = {
    index: 0,
    data: 'hello hedgebank !',
    prevHash: '0',
    timestamp: 1542607725621,
    nonce: 385,
    hash: '00ce7b9a029622012298da8276bf93d7c77ab415afe520aa5a23d2167e1a0ec0'
}


class BlockChain {
    constructor() {
        this.blockchain = [
            initBlock
        ]
        this.data = []
        this.difficulty = 6

        //所有的网络节点信息，address port
        this.peers = []
        //种子节点
        this.seed = { port: 8001, address: "localhost" }

        this.udp = dgram.createSocket("udp4")
        this.init()
    }

    init() {
        this.bindP2P()
        this.bindExit()
    }

    bindP2P() {
        //网络发来的信息
        this.udp.on("message", (data, remote) => {
            const { address, port } = remote
            const action = JSON.parse(data)

            //action 规范
            // {
            //     type : "要干什么"
            //     data : "具体传递的信息"
            // }

            if (action.type) {
                this.dispatch(action, { address, port })
            }
        })

        this.udp.on("listening", () => {
            const address = this.udp.address()
            console.log("[信息]:udp监听完毕 端口是" + address.port)
        })

        //区分种子节点和普通节点
        //普通节点的端口0即可 随便一个空闲端口即可
        //种子节点必须约定好端口
        console.log(process.argv)
        const port = Number(process.argv[2]) || 0
        this.startNode(port)
    }

    bindExit() {
        process.on("exit", () => {
            console.log("[信息] : 网络一线牵，珍惜这段缘")
        })
    }

    dispatch(action, remote) {
        //接受到网络的消息都在这里处理
        switch (action.type) {
            case "newpeer":
                //种子节点要做的事情
                //告诉新节点
                //1.你的公网ip和port是什么
                this.send({
                    type: "remoteAddress",
                    data: remote
                }, remote.port, remote.address)

                //2.现在全部节点的列表 将新的节点添加到节点列表中去
                this.send({
                    type: "peerlist",
                    data: this.peers
                }, remote.port, remote.address)

                //3.告诉所有的已知节点，来了个新朋友 快打招呼
                this.boardcast({
                    type: "sayhi",
                    data: remote
                })

                //4.告诉新节点现在区块链的数据
                this.send({
                    type: "blockchain",
                    data: JSON.stringify({
                        blockchain: this.blockchain,
                        trans:this.data
                    })
                }, remote.port, remote.address)
                this.peers.push(remote)
                console.log("你好啊，新朋友，请你喝茶", remote)
                break

            case "trans": {
                //网络上收到了交易请求
                //判断是否是重复交易
                if (!this.data.find(v => this.isEqualObj(v, action.data))) {
                    console.log("有新的交易，请注意查收")
                    this.addTrans(action.data)
                    this.boardcast({
                        type: "trans",
                        data: action.data
                    })
                }
                break
            }
            case "blockchain": {
                //同步本地链
                let alldata = JSON.parse(action.data)
                let newChain = alldata.blockchain
                let newTrans = alldata.trans
                this.replaceChain(newChain)
                this.replaceTrans(newTrans)
                break
            }

            case "remoteAddress": {
                //存储远程消息，退出的时候用
                this.remote = action.data
                break
            }

            case "peerlist": {
                //远程告诉我，有哪些节点
                const newPeers = action.data
                this.addPeers(newPeers)
                break
            }
            case "sayhi": {
                let remotePeer = action.data
                this.peers.push(remotePeer)
                console.log("[信息] 新朋友你好，相识就是缘")
                this.send({ type: "hi", data: "hi" }, remotePeer.port, remotePeer.address)
                break
            }
            case "hi": {
                console.log(`${remote.address}:${remote.port}:${action.data}`)
                break
            }

            case "mine": {
                //网络上有人挖矿成功
                const lastBlock = this.getLastBlock()
                if (lastBlock.hash === action.data.hash) {
                    //重复的消息
                    return
                }
                if (this.isValidBlock(action.data, lastBlock)) {
                    console.log("[信息]：有朋友挖矿成功，牛逼，牛逼")
                    this.blockchain.push(action.data)
                    //清空本地交易
                    this.data = []
                    //帮忙再广播一次
                    this.boardcast({
                        type: "mine",
                        data: action.data
                    })
                } else {
                    console.log("挖矿的区块不合法")
                }

                break
            }
            default:
                console.log("这个action不认识")

        }
    }


    replaceChain(newChain) {
        //先不检验交易
        if (newChain.length === 1) {
            return
        }

        if (this.isvalidChain(newChain) && newChain.length > this.blockchain.length) {
            //替换本地区块链
            this.blockchain = JSON.parse(JSON.stringify(newChain))
        } else {
            console.log("[错误]：不合法的链")
        }
    }

    replaceTrans(trans){
        if(trans.every(v => this.isValidTransfer(v))){
            this.data = trans
        }
    }

    boardcast(action) {
        this.peers.forEach(v => {
            this.send(action, v.port, v.address)
        })
    }

    isEqualObj(obj1, obj2) {
        const keys1 = Object.keys(obj1)
        const keys2 = Object.keys(obj2)

        if (keys1.length !== keys2.length) {
            return false
        }

        return keys1.every(key => obj1[key] == obj2[key])
    }

    // isEqualPeer(peer1, peer2) {
    //     return peer1.address == peer2.address && peer1.port == peer2.port
    // }

    addPeers(peers) {
        //遍历新节点
        //如果新节点不存在 就添加到一个peers
        peers.forEach(peer => {
            //this.peers 是这条区块现有的节点
            if (!this.peers.find(v => this.isEqualObj(peer, v))) {
                this.peers.push(peer)
            }
        })
    }

    addTrans(trans) {
        if (this.isValidTransfer(trans)) {
            this.data.push(trans)
        }
    }

    startNode(port) {
        this.udp.bind(port)

        //如果不是种子节点，需要发送一个消息告诉种子 我来了
        if (port !== 8001) {
            this.send({
                type: "newpeer"
            }, this.seed.port, this.seed.address)

            this.peers.push(this.seed)
        }
    }

    send(message, port, address) {
        this.udp.send(JSON.stringify(message), port, address)
    }

    getLastBlock() {
        return this.blockchain[this.blockchain.length - 1]
    }

    //转账方法
    transfer(from, to, amount) {
        // 后面加上签名校验
        const timestamp = new Date().getTime()
        //签名
        const signature = rsa.sign({from, to, amount, timestamp})
        const sigTrans = { from, to, amount, timestamp, signature }
        //form 不能为零
        if (from !== "0") {
            const balance = this.balance(from)
            if (balance < amount) {
                console.log("您的余额只有", balance)
                return
            }
            this.boardcast({
                type: "trans",
                data: sigTrans
            })
        }

        this.data.push(sigTrans)
        return sigTrans
    }

    balance(address) {
        //简单粗暴
        let balance = 0;
        this.blockchain.forEach(block => {
            if (!Array.isArray(block.data)) {
                //创世区块
                return
            }
            block.data.forEach(trans => {
                if (address == trans.from) {
                    balance -= trans.amount
                }

                if (address == trans.to) {
                    balance += trans.amount
                }
            })
        })

        return balance
    }


    //矿工在打包的时候，会进行每个交易的合法校验
    //1.签名校验是否合法
    //2.账户余额是否够
    isValidTransfer(trans) {
        //verify中的公钥就是 trans中的from
        //地址就是公钥
       // let result = rsa.verify(trans, trans.from)
        return rsa.verify(trans, trans.from)
    }

    //挖矿
    //其实就是打包交易

    mine(address) {
        // 校验合法性
        // if(!this.data.every(v=>this.isValidTransfer(v))){
        //     console.log("trans not valid")
        // }
        //过滤不合法的
        this.data = this.data.filter(v => {
            let result = this.isValidTransfer(v)
            return result
        })

        //1.生成新的区块 一页新的记账加入了区块链
        //2.不停的计算hash，直到符合难度条件便新增一个区块
        //挖矿成功后 要有对矿工的奖励
        this.transfer("0", address, 100)
        const newBlock = this.generateNewBlock()
        //区块合法 并且区块链合法 就将新区块添加到区块链中
        if (this.isValidBlock(newBlock) && this.isvalidChain()) {
            this.blockchain.push(newBlock)
            this.data = []
            console.log("[信息]：挖矿成功")
            //挖矿成功之后需要广播
            this.boardcast({
                type: "mine",
                data: newBlock
            })
            return newBlock
        } else {
            console.log("error,invail Block", newBlock)
        }
    }

    //生成新的区块
    generateNewBlock() {
        let nonce = 0
        const index = this.blockchain.length
        const data = this.data
        const prevHash = this.getLastBlock().hash
        let timestamp = new Date().getTime()
        let hash = this.computeHash(index, prevHash, timestamp, data, nonce)

        while (hash.slice(0, this.difficulty) !== "000000") {
            nonce = nonce + 1;
            hash = this.computeHash(index, prevHash, timestamp, data, nonce);
        }

        return {
            index,
            data,
            prevHash,
            timestamp,
            nonce,
            hash,
        }
    }

    computeBlockHash({ index, prevHash, timestamp, data, nonce }) {
        return this.computeHash(index, prevHash, timestamp, data, nonce)
    }

    //计算哈希
    computeHash(index, prevHash, timestamp, data, nonce) {
        return crypto
            .createHash("sha256")
            .update(index + prevHash + timestamp + data + nonce)
            .digest("hex")
    }

    //校验区块
    isValidBlock(newBlock, lastBlock = this.getLastBlock()) {
        //1.newBlcok的index等于最新区块的index+1
        //2.newBlcok的timestamp大于最新区块
        //3.newBlock的preHash 等于最新区块的hash
        //4.区块的哈希值 符合难度要求
        if (newBlock.index !== lastBlock.index + 1) {
            console.log("index error")
            return false
        } else if (newBlock.timestamp <= lastBlock.timestamp) {
            console.log("timestamp error")
            return false
        } else if (newBlock.prevHash !== lastBlock.hash) {
            console.log("prevHash error")
            return false
        } else if (newBlock.hash.slice(0, this.difficulty) !== "0".repeat(this.difficulty)) {
            console.log("hash error")
            return false
        } else if (newBlock.hash !== this.computeBlockHash(newBlock)) {

        }
        return true
    }


    //校验区块链
    isvalidChain(chain = this.blockchain) {
        //校验除创世区块外的所有区块
        for (let i = chain.length - 1; i >= 1; i = i - 1) {
            if (!this.isValidBlock(chain[i], chain[i - 1])) {
                return false
            }
        }

        //校验创世区块
        if (JSON.stringify(chain[0]) !== JSON.stringify(initBlock)) {
            return false
        }

        return true
    }
}

module.exports = BlockChain