// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import app from "./app.js"
dotenv.config({
    path : './.env'
})
connectDB()
.then(()=>{
  app.listen(process.env.PORT||9000, ()=>{
    console.log(`server is running at port ${process.env.PORT}`);
  })
})
.catch((err)=>{
  console.log("mongo db connection failed" , err)
})

















//IIFE -> Immediately Invoked Function Expressions (IIFE) 
// ()()-> define function in first bracket and also call it immediately ,i.e. done by second bracket

/*
import express from "express";
const app = express()


;(async ()=>{
    try {
      await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`) 
      app.on("error" ,(error)=>{
        console.log("err",error)
        throw error
      })

      app.listen(process.env.PORT,()=>{
        console.log(`app is listening on port ${process.env.PORT}`)
      })

    } catch (error) {
        colsole.log("error : ",error);
        throw err
        
    }

})()

*/