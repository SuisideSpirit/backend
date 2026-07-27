import mongoose, { connect } from "mongoose";
import {DB_NAME} from "./constants.js"
import express from "express"
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path :"./env"
})


connectDB() 




// const app = express()
// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error" , (error)=>{
//             console.log("Error : ", error)
//             throw error 
//         })
//         app.listen(process.env.PORT , () =>{
//             console.log('app is listening at port' + PORT)
//         })
//     }
//     catch(error){
//         console.log("Error : ",error)
//     }
// })()
