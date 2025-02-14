import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

//configurations settings 

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))
//app.use() is generally used jabh middleware ki configuration karni ho


app.use(express.json({limit:"16kb"})) // to handle json responses
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))//public naam ke repo mein bss pdf files ya kuch apne he server mein public repo mein store hoga
app.use(cookieParser())//to perform crud operation on cookie of browser

//routes import
import userRouter from "./routes/user.routes.js"

//routes declaration 
app.use("/api/v1/users",userRouter)


export default app
