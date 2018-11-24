const rsa = require("./rsa")


let citys = ["beijing","shanghai","guangzhou"]

function isBeijing(v) {
    return v === "beijing"
}


citys  = citys.filter(v => {
    return isBeijing(v)
})



console.log(citys)