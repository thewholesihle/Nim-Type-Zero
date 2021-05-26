//! This script is just for testing some codes and algos
let list = [9,4,5,1,6];
new Promise ((resolve, reject) =>{
setTimeout(()=>{
    resolve(list.sort())
},2000)}).then(sortedList => {
    console.log(`the list has been sorted to : ${sortedList}`);
});