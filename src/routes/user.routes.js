import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router()

router.post("/register", (req, res, next) => {
    console.log("Route reached");
    next();
}, registerUser);

export default router 