const vorpal = require('vorpal')();
const BlockChain = require("./blockchain.js")
const rsa = require("./rsa.js")
const blockchain = new BlockChain()
const Table =  require('cli-table') ;



function formatLog(data){
   if(!data || data.length == 0){
       return
   }
   
    //如果不是数组，将data定义成只有一个数据的数组
    if(!Array.isArray(data)){
        data = [data]
    }

    const first = data[0]
    //只获取key
    const head = Object.keys(first)
    const table = new Table({
        head:head,
        colWidths: new Array(head.length).fill(20)
    })

    //[{name:"wang",age=22},{name:"li",age=23}]
    //map:映射 很像forEach
    // v就是数组中的每一个对象
    const res = data.map(v=>{
        return head.map(h=>{
            return JSON.stringify(v[h],null,1) 
        })
    })

    table.push(...res)
    console.log(table.toString());
}


vorpal
  .command('mine', '挖矿')
  .action(function(args, callback) {
    const newBlock = blockchain.mine(rsa.keys.pub)
    if (newBlock){
        formatLog(newBlock)
    }
    callback();
  });


  vorpal
  .command('blockchain', '查看区块链')
  .action(function(args, callback) {
    formatLog(blockchain.blockchain)
    callback();
  });

  vorpal
  .command('trans <to><amount>', '转账')
  .action(function(args, callback) {
    //将本地公钥 当成本地的地址
    let trans = blockchain.transfer(rsa.keys.pub,args.to,args.amount)
    if (trans) {
        formatLog(trans)
    }

    callback();
  });

  
  vorpal
  .command('detail <index>', '区块详情')
  .action(function(args, callback) {
    const block = blockchain.blockchain[args.index]
    this.log(JSON.stringify(block,null,1))
    callback();
  });

  vorpal
  .command('balance <address>', '查看余额')
  .action(function(args, callback) {
        let balance = blockchain.balance(args.address)
        if (balance) {
            formatLog({balance,address:args.address})
        }
    callback();
  });

  vorpal
  .command('pub', '查看本地公钥')
  .action(function(args, callback) {
      console.log(rsa.keys.pub)
    callback();
  });

  vorpal
  .command('peerlist', '查看节点信息')
  .action(function(args, callback) {
    formatLog(blockchain.peers)
    callback();
  });

  vorpal
  .command('chat <msg>', '给别的节点打招呼')
  .action(function(args, callback) {
    blockchain.boardcast({type:"hi",data:args.msg})
    callback();
  });

  vorpal
  .command('pending', '查看还未打包的交易')
  .action(function(args, callback) {
    formatLog(blockchain.data)
    callback();
  });


console.log("welcome to heb-chain")
vorpal.exec('help')

vorpal
  .delimiter('hedgebank')
  .show();