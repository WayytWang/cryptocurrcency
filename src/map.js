let user = [{name:"wang",age:22,city:"beijing"},{name:"yu",age:23,city:"guangzhou"}]

// let newUser = user.map(function(v){
//     return v.name
// })
let head = Object.keys(user[0])
console.log("head",head)

//v 表示user中的每一个元素
let newUser = user.map(v=>{
    return head.map(h=>{
        console.log("h",h)
        return v[h]
    })

})

console.log(newUser)