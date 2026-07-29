import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const  app = express() 

console.log(process.env.CORS_ORIGIN)
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({limit:"16kb"}))

app.use(express.urlencoded({extended:true, limit:"16kb"}))

app.use(express.static("public"))

app.use(cookieParser()) 

// routes 

import userRouter from "./routes/user.routes.js"


// routes declaration 
app.get("/test", (req, res) => {
    res.json({ message: "Server is working" });
});

app.use("/user" , userRouter)


export {app}